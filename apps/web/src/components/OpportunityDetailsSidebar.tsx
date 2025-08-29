'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Calendar, Truck, DollarSign, User, MessageSquare, Activity, FileText, Clock } from 'lucide-react'
import ActivityTimeline from './ActivityTimeline'

interface Opportunity {
  id: string
  origin: { city: string; state: string }
  destination: { city: string; state: string }
  equipment: string[]
  pickupDate: string
  deliveryDate: string
  distance: number
  currentBestBid: number
  minimumRate: number
  status: string
  bidsCount: number
  cargo: string
  weight: number
}

interface Bid {
  id: string
  amount: number
  carrierId: string
  bidder: {
    name: string
    company: string
    role: 'carrier' | 'account_manager'
  }
  placedBy: {
    name: string
    role: 'carrier' | 'account_manager'
  }
  timestamp: string
  notes?: string
  status: 'active' | 'winner' | 'withdrawn'
}

interface OpportunityDetailsSidebarProps {
  opportunity: Opportunity
  isOpen: boolean
  onClose: () => void
  onPlaceBid: (amount: number, notes?: string) => void
  currentUserId?: string
}

export default function OpportunityDetailsSidebar({ 
  opportunity, 
  isOpen, 
  onClose, 
  onPlaceBid,
  currentUserId
}: OpportunityDetailsSidebarProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'bidding' | 'messages' | 'activity'>('details')
  const [bidAmount, setBidAmount] = useState('')
  const [bidNotes, setBidNotes] = useState('')
  const [bids, setBids] = useState<Bid[]>([])
  const [loadingBids, setLoadingBids] = useState(false)

  useEffect(() => {
    if (!isOpen || !opportunity) return

    loadBids()
    
    // Set up real-time subscription for bids
    const setupSubscription = async () => {
      const { supabase } = await import('@/lib/supabase')
      
      return supabase
        .channel(`bids-${opportunity.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bids',
            filter: `opportunity_id=eq.${opportunity.id}`,
          },
          (payload) => {
            console.log('Real-time bid update:', payload)
            // Reload bids when there's a change
            loadBids()
          }
        )
        .subscribe()
    }
    
    let subscription: any = null
    setupSubscription().then(sub => {
      subscription = sub
    })

    // Cleanup subscription on unmount or when opportunity changes
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [isOpen, opportunity?.id])

  const loadBids = async () => {
    setLoadingBids(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { data: bidsData, error } = await supabase
        .from('bids')
        .select(`
          id,
          amount,
          status,
          notes,
          created_at,
          carrier_id,
          bid_placed_by_user_id,
          bid_placed_by_role,
          bid_on_behalf_of_tenant_id
        `)
        .eq('opportunity_id', opportunity.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading bids:', error)
        return
      }

      // Transform database bids to component format
      const transformedBids: Bid[] = bidsData?.map(bid => ({
        id: bid.id,
        amount: bid.amount,
        carrierId: bid.carrier_id,
        bidder: { 
          name: 'Loading...', // Will be populated with actual user data
          company: 'Loading...',
          role: bid.bid_placed_by_role === 'account_manager' ? 'account_manager' : 'carrier'
        },
        placedBy: { 
          name: 'Loading...', // Will be populated with actual user data
          role: bid.bid_placed_by_role === 'account_manager' ? 'account_manager' : 'carrier'
        },
        timestamp: bid.created_at,
        notes: bid.notes,
        status: bid.status === 'active' ? 'active' : bid.status === 'winner' ? 'winner' : 'withdrawn'
      })) || []

      setBids(transformedBids)
    } catch (error) {
      console.error('Failed to load bids:', error)
    } finally {
      setLoadingBids(false)
    }
  }

  const handleSubmitBid = async () => {
    if (!bidAmount) return
    await onPlaceBid(parseInt(bidAmount), bidNotes)
    setBidAmount('')
    setBidNotes('')
    // Reload bids to show the new bid
    loadBids()
  }

  const handleWithdrawBid = async (bidId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { error } = await supabase
        .from('bids')
        .update({ status: 'withdrawn' })
        .eq('id', bidId)
        .eq('carrier_id', currentUserId)
      
      if (error) {
        console.error('Error withdrawing bid:', error)
        alert('Failed to withdraw bid')
        return
      }
      
      alert('Bid withdrawn successfully')
      loadBids() // Reload to show updated status
    } catch (error) {
      console.error('Failed to withdraw bid:', error)
      alert('Failed to withdraw bid')
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {opportunity.origin.city}, {opportunity.origin.state} → {opportunity.destination.city}, {opportunity.destination.state}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Opportunity #{opportunity.id.slice(0, 8)}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {(['details', 'bidding', 'messages', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Route & Equipment */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Route Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Pickup</p>
                        <p className="text-sm text-gray-600">{opportunity.origin.city}, {opportunity.origin.state}</p>
                        <p className="text-sm text-gray-500">{formatDate(opportunity.pickupDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Delivery</p>
                        <p className="text-sm text-gray-600">{opportunity.destination.city}, {opportunity.destination.state}</p>
                        <p className="text-sm text-gray-500">{formatDate(opportunity.deliveryDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Equipment & Cargo</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Truck className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium capitalize">{opportunity.equipment?.[0]?.replace('_', ' ') || 'Standard'}</span>
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm">{opportunity.cargo}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm">Weight: {opportunity.weight.toLocaleString()} lbs</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm">Distance: {opportunity.distance} miles</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Pricing</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Current Best Bid</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(opportunity.currentBestBid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Minimum Rate</p>
                      <p className="text-xl font-semibold text-gray-900">{formatCurrency(opportunity.minimumRate)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bidding' && (
            <div className="space-y-6">
              {/* Place New Bid */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Place Your Bid</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Bid Amount</label>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Enter bid amount"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Notes (Optional)</label>
                    <textarea
                      value={bidNotes}
                      onChange={(e) => setBidNotes(e.target.value)}
                      placeholder="Add any notes about your bid..."
                      className="form-input"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={handleSubmitBid}
                    disabled={!bidAmount}
                    className="btn-success w-full"
                  >
                    Submit Bid
                  </button>
                </div>
              </div>

              {/* Bid History */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bid History</h3>
                {loadingBids ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading bids...</p>
                  </div>
                ) : bids.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No bids yet for this opportunity.</p>
                    <p className="text-sm mt-1">Be the first to place a bid!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bids.map((bid) => (
                    <div key={bid.id} className={`border rounded-lg p-4 ${bid.status === 'winner' ? 'border-green-200 bg-green-50' : bid.status === 'withdrawn' ? 'border-gray-200 bg-gray-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                          <span className={`text-lg font-semibold ${bid.status === 'withdrawn' ? 'line-through text-gray-400' : ''}`}>
                            {formatCurrency(bid.amount)}
                          </span>
                          {bid.status === 'winner' && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Winning Bid
                            </span>
                          )}
                          {bid.status === 'withdrawn' && (
                            <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                              Withdrawn
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDateTime(bid.timestamp)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <p>
                            <strong>{bid.bidder.company}</strong>
                            {bid.placedBy.role === 'account_manager' && (
                              <span> (bid placed by {bid.placedBy.name}, Account Manager)</span>
                            )}
                          </p>
                          {bid.notes && <p className="mt-1 italic">"{bid.notes}"</p>}
                        </div>
                        {bid.status === 'active' && currentUserId && bid.carrierId === currentUserId && (
                          <button
                            onClick={() => handleWithdrawBid(bid.id)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Opportunity Communication</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Connect with other parties to discuss details about this freight opportunity.
                </p>
                <button 
                  onClick={() => {
                    // Import Chat component and open it
                    const event = new CustomEvent('openChat', { detail: opportunity.id })
                    window.dispatchEvent(event)
                    onClose()
                  }}
                  className="btn-primary w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Messages
                </button>
              </div>
              <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium mb-2">💡 Tips for effective communication:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Be clear about pickup/delivery requirements</li>
                  <li>Confirm equipment specifications</li>
                  <li>Discuss any special handling needs</li>
                  <li>Agree on payment terms</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <ActivityTimeline opportunityId={opportunity.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}