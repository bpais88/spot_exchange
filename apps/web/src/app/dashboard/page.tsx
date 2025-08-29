'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, MapPin, Calendar, DollarSign, MessageSquare, TrendingUp, Filter, LogOut } from 'lucide-react'
import Chat from '@/components/Chat'
import OpportunityDetailsSidebar from '@/components/OpportunityDetailsSidebar'

// Mock data for development
const mockOpportunities = [
  {
    id: '1',
    origin: { city: 'Los Angeles', state: 'CA' },
    destination: { city: 'New York', state: 'NY' },
    equipment: ['dry_van'],
    pickupDate: '2024-01-15',
    deliveryDate: '2024-01-18',
    distance: 2445,
    currentBestBid: 4200,
    minimumRate: 3800,
    status: 'active',
    bidsCount: 12,
    cargo: 'Electronics',
    weight: 15000
  },
  {
    id: '2',
    origin: { city: 'Chicago', state: 'IL' },
    destination: { city: 'Miami', state: 'FL' },
    equipment: ['reefer'],
    pickupDate: '2024-01-16',
    deliveryDate: '2024-01-19',
    distance: 1380,
    currentBestBid: 2800,
    minimumRate: 2500,
    status: 'active',
    bidsCount: 8,
    cargo: 'Pharmaceuticals',
    weight: 12000
  },
  {
    id: '3',
    origin: { city: 'Phoenix', state: 'AZ' },
    destination: { city: 'Seattle', state: 'WA' },
    equipment: ['flatbed'],
    pickupDate: '2024-01-17',
    deliveryDate: '2024-01-20',
    distance: 1420,
    currentBestBid: 3500,
    minimumRate: 3200,
    status: 'active',
    bidsCount: 15,
    cargo: 'Construction Materials',
    weight: 25000
  }
]

const equipmentIcons = {
  dry_van: '🚛',
  reefer: '❄️',
  flatbed: '📦',
  step_deck: '🔧',
  rgn: '🏗️',
  power_only: '🚚'
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [opportunities, setOpportunities] = useState(mockOpportunities)
  const [filter, setFilter] = useState('all')
  const [showChat, setShowChat] = useState<string | null>(null)
  const [selectedOpportunityDetails, setSelectedOpportunityDetails] = useState<string | null>(null)

  const generateTestOpportunities = async () => {
    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Get the first tenant_id from the database (for testing)
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .single()
      
      const tenantId = tenantData?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' // fallback UUID
      
      const testOpportunities = [
        {
          tenant_id: tenantId,
          created_by: user.id,
          origin: { city: 'Phoenix', state: 'AZ' },
          destination: { city: 'Denver', state: 'CO' },
          pickup_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          delivery_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          equipment: ['dry_van'],
          current_best_bid: 2100,
          minimum_rate: 1800,
          status: 'active',
          metadata: { distance: 863, special_requirements: '' },
          cargo_details: { description: 'Electronics', weight: 25000 }
        },
        {
          tenant_id: tenantId,
          created_by: user.id,
          origin: { city: 'Miami', state: 'FL' },
          destination: { city: 'Atlanta', state: 'GA' },
          pickup_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          equipment: ['reefer'], // Changed from 'refrigerated' to 'reefer' (common freight term)
          current_best_bid: 1850,
          minimum_rate: 1600,
          status: 'active',
          metadata: { distance: 663, special_requirements: 'Temperature controlled' },
          cargo_details: { description: 'Fresh Produce', weight: 40000 }
        },
        {
          tenant_id: tenantId,
          created_by: user.id,
          origin: { city: 'Seattle', state: 'WA' },
          destination: { city: 'Portland', state: 'OR' },
          pickup_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          delivery_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          equipment: ['flatbed'],
          current_best_bid: 950,
          minimum_rate: 800,
          status: 'active',
          metadata: { distance: 173, special_requirements: 'Tarps required' },
          cargo_details: { description: 'Construction Materials', weight: 48000 }
        }
      ]

      const { error } = await supabase
        .from('opportunities')
        .insert(testOpportunities)

      if (error) {
        console.error('Error creating test opportunities:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        alert(`Failed to create test opportunities: ${error.message}`)
        return
      }

      alert('3 new test opportunities created!')
      loadOpportunities() // Refresh the list
    } catch (error) {
      console.error('Failed to generate test opportunities:', error)
      alert('Failed to create test opportunities')
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    // Listen for chat open events from the sidebar
    const handleOpenChat = (event: any) => {
      setShowChat(event.detail)
    }
    
    window.addEventListener('openChat', handleOpenChat)
    return () => {
      window.removeEventListener('openChat', handleOpenChat)
    }
  }, [])

  useEffect(() => {
    if (user) {
      // Set up real-time subscription for all opportunities
      const setupSubscription = async () => {
        const { supabase } = await import('@/lib/supabase')
        
        const subscription = supabase
          .channel('opportunities-updates')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bids',
            },
            (payload) => {
              console.log('Real-time opportunity update:', payload)
              // Reload opportunities when bids change
              loadOpportunities()
            }
          )
          .subscribe()

        // Cleanup subscription on unmount
        return () => {
          subscription.unsubscribe()
        }
      }
      
      const cleanup = setupSubscription()
      return () => {
        cleanup.then(cleanupFn => cleanupFn?.())
      }
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const { getCurrentUser } = await import('@/lib/supabase')
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        router.push('/auth/login')
        return
      }
      
      setUser(currentUser)
      // Load opportunities for this user
      loadOpportunities()
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const loadOpportunities = async () => {
    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Fetch opportunities from the database
      const { data: opportunitiesData, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'active')
        .order('pickup_date', { ascending: true })

      if (error) {
        console.error('Error fetching opportunities:', error)
        return
      }

      // Get bid counts for each opportunity
      const { data: bidCounts, error: bidCountError } = await supabase
        .from('bids')
        .select('opportunity_id')
        .eq('status', 'active')

      const bidCountMap: Record<string, number> = {}
      bidCounts?.forEach(bid => {
        bidCountMap[bid.opportunity_id] = (bidCountMap[bid.opportunity_id] || 0) + 1
      })

      // Transform database data to match the current UI format
      const transformedOpportunities = opportunitiesData?.map(opp => ({
        id: opp.id,
        origin: { city: opp.origin?.city, state: opp.origin?.state },
        destination: { city: opp.destination?.city, state: opp.destination?.state },
        equipment: opp.equipment || [],
        pickupDate: opp.pickup_date,
        deliveryDate: opp.delivery_date,
        distance: opp.metadata?.distance || 0,
        currentBestBid: opp.current_best_bid || 0,
        minimumRate: opp.minimum_rate || 0,
        status: opp.status,
        bidsCount: bidCountMap[opp.id] || 0, // Real bid count from database
        cargo: opp.cargo_details?.description || '',
        weight: opp.cargo_details?.weight || 0,
        specialRequirements: opp.metadata?.special_requirements || ''
      })) || []

      setOpportunities(transformedOpportunities)
    } catch (error) {
      console.error('Failed to load opportunities:', error)
      // Fallback to mock data if database fails
      setOpportunities(mockOpportunities)
    }
  }

  const handleLogout = async () => {
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const handleViewOpportunity = async (opportunityId: string) => {
    setSelectedOpportunityDetails(opportunityId)
    
    // Track opportunity view for analytics (non-blocking)
    try {
      const { supabase } = await import('@/lib/supabase')
      // For now, we'll add this to a simple tracking without the opportunity_activity table
      console.log(`Opportunity ${opportunityId} viewed by user ${user?.id}`)
    } catch (error) {
      // Silently fail - viewing shouldn't be blocked by tracking issues
      console.debug('View tracking failed:', error)
    }
  }

  const handlePlaceBid = async (amount: number, notes?: string) => {
    if (!amount || !selectedOpportunityDetails) return
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Check if user already has an active bid on this opportunity
      const { data: existingBids, error: checkError } = await supabase
        .from('bids')
        .select('id')
        .eq('opportunity_id', selectedOpportunityDetails)
        .eq('carrier_id', user.id)
        .eq('status', 'active')
      
      if (existingBids && existingBids.length > 0) {
        alert('You already have an active bid on this opportunity. Please withdraw your current bid first if you want to place a new one.')
        return
      }
      
      // Insert bid into database
      const { data: bidData, error: bidError } = await supabase
        .from('bids')
        .insert({
          opportunity_id: selectedOpportunityDetails,
          carrier_id: user.id,
          amount: amount,
          status: 'active',
          notes: notes || null,
          bid_placed_by_user_id: user.id,
          bid_placed_by_role: 'carrier',
          bid_on_behalf_of_tenant_id: user.tenant_id
        })
        .select()
        .single()

      if (bidError) {
        if (bidError.code === '23505') {
          alert('You already have an active bid on this opportunity. Please withdraw your current bid first if you want to place a new one.')
          return
        }
        console.error('Error placing bid:', bidError)
        alert('Failed to place bid: ' + bidError.message)
        return
      }

      // Update opportunity's current best bid if this is lower
      const currentOpportunity = opportunities.find(opp => opp.id === selectedOpportunityDetails)
      if (currentOpportunity && amount < currentOpportunity.currentBestBid) {
        const { error: updateError } = await supabase
          .from('opportunities')
          .update({ current_best_bid: amount })
          .eq('id', selectedOpportunityDetails)

        if (updateError) {
          console.error('Error updating opportunity best bid:', updateError)
        }
      }

      // Update local state to reflect the new bid
      setOpportunities(prev => prev.map(opp => 
        opp.id === selectedOpportunityDetails 
          ? { 
              ...opp, 
              currentBestBid: Math.min(opp.currentBestBid, amount),
              bidsCount: opp.bidsCount + 1 
            }
          : opp
      ))
      
      // Show success message
      alert(`Bid of $${amount.toLocaleString()} placed successfully!`)

    } catch (error: any) {
      console.error('Failed to place bid:', error)
      if (error.code === '23505') {
        alert('You already have an active bid on this opportunity. Please withdraw your current bid first if you want to place a new one.')
      } else {
        alert('Failed to place bid. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Spot Exchange</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={generateTestOpportunities}
                className="btn-primary text-sm"
              >
                + Generate Test Opportunities
              </button>
              <button className="btn-secondary">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </button>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium">
                      {user?.profile?.name?.split(' ').map((n: string) => n[0]).join('') || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-gray-700">
                    {user?.profile?.name || user?.email?.split('@')[0] || 'User'}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="btn-secondary text-sm"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Bids</p>
                <p className="text-2xl font-semibold text-gray-900">12</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg. Bid Amount</p>
                <p className="text-2xl font-semibold text-gray-900">$3,200</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Truck className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Won Loads</p>
                <p className="text-2xl font-semibold text-gray-900">8</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Win Rate</p>
                <p className="text-2xl font-semibold text-gray-900">67%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <button 
              className={`px-3 py-2 rounded-md text-sm font-medium ${filter === 'all' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setFilter('all')}
            >
              All Opportunities
            </button>
            <button 
              className={`px-3 py-2 rounded-md text-sm font-medium ${filter === 'active' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setFilter('active')}
            >
              Active Bids
            </button>
            <button 
              className={`px-3 py-2 rounded-md text-sm font-medium ${filter === 'won' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setFilter('won')}
            >
              Won Loads
            </button>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-6">
          {opportunities.map((opportunity) => (
            <div key={opportunity.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Route */}
                  <div className="flex items-center mb-4">
                    <div className="flex items-center text-lg font-semibold text-gray-900">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                      {opportunity.origin.city}, {opportunity.origin.state}
                    </div>
                    <div className="mx-4">
                      <div className="h-px w-12 bg-gray-300"></div>
                    </div>
                    <div className="flex items-center text-lg font-semibold text-gray-900">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                      {opportunity.destination.city}, {opportunity.destination.state}
                    </div>
                    <div className="ml-4 text-sm text-gray-500">
                      {opportunity.distance} miles
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Equipment</p>
                      <div className="flex items-center mt-1">
                        <span className="mr-2">{equipmentIcons[opportunity.equipment?.[0] as keyof typeof equipmentIcons] || '🚛'}</span>
                        <span className="text-sm font-medium capitalize">{opportunity.equipment?.[0]?.replace('_', ' ') || 'Standard'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pickup Date</p>
                      <div className="flex items-center mt-1">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium">{new Date(opportunity.pickupDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cargo</p>
                      <p className="text-sm font-medium mt-1">{opportunity.cargo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Weight</p>
                      <p className="text-sm font-medium mt-1">{opportunity.weight.toLocaleString()} lbs</p>
                    </div>
                  </div>

                  {/* Bidding Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div>
                        <p className="text-sm text-gray-500">Current Best Bid</p>
                        <p className="text-xl font-bold text-green-600">${opportunity.currentBestBid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Minimum Rate</p>
                        <p className="text-lg font-semibold text-gray-900">${opportunity.minimumRate.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Bids</p>
                        <p className="text-lg font-semibold text-gray-900">{opportunity.bidsCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-6 flex flex-col space-y-2">
                  <button
                    onClick={() => handleViewOpportunity(opportunity.id)}
                    className="btn-primary"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => setShowChat(opportunity.id)}
                    className="btn-secondary"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </button>
                  
                  {/* Bid Success Indicator */}
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">Bid Success Probability</p>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <p className="text-xs font-medium text-green-600 mt-1">75% - High</p>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Opportunity Details Sidebar */}
      {selectedOpportunityDetails && (
        <OpportunityDetailsSidebar
          opportunity={opportunities.find(opp => opp.id === selectedOpportunityDetails)!}
          isOpen={!!selectedOpportunityDetails}
          onClose={() => setSelectedOpportunityDetails(null)}
          onPlaceBid={handlePlaceBid}
          currentUserId={user?.id}
        />
      )}

      {/* Chat Modal */}
      {showChat && (
        <Chat 
          opportunityId={showChat}
          currentUserId={user?.id}
          onClose={() => setShowChat(null)} 
        />
      )}
    </div>
  )
}