'use client'

import { useState, useEffect } from 'react'
import { Clock, DollarSign, MessageSquare, UserCheck, AlertCircle, TrendingUp, X } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'bid_placed' | 'bid_withdrawn' | 'bid_updated' | 'message_sent' | 'opportunity_created' | 'opportunity_viewed'
  description: string
  timestamp: string
  userId: string
  userName?: string
  metadata?: any
  icon?: any
  color?: string
}

interface ActivityTimelineProps {
  opportunityId: string
}

export default function ActivityTimeline({ opportunityId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!opportunityId) return
    
    loadActivities()
  }, [opportunityId])

  const loadActivities = async () => {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Skip opportunity_activity table as it doesn't exist yet
      const activityData = null

      // Load bid history as activities
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false })

      if (bidsError) {
        console.error('Error loading bid activities:', bidsError)
      }

      // Load recent messages as activities
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (messagesError) {
        console.warn('Messages not available:', messagesError)
      }

      // Combine and transform all activities
      const allActivities: ActivityItem[] = []

      // Add bid activities
      if (bidsData) {
        bidsData.forEach(bid => {
          if (bid.status === 'active') {
            allActivities.push({
              id: `bid-${bid.id}`,
              type: 'bid_placed',
              description: `Bid placed: $${bid.amount.toLocaleString()}`,
              timestamp: bid.created_at,
              userId: bid.carrier_id,
              metadata: { amount: bid.amount, notes: bid.notes },
              icon: DollarSign,
              color: 'text-green-600'
            })
          } else if (bid.status === 'withdrawn') {
            allActivities.push({
              id: `bid-withdrawn-${bid.id}`,
              type: 'bid_withdrawn',
              description: `Bid withdrawn: $${bid.amount.toLocaleString()}`,
              timestamp: bid.updated_at || bid.created_at,
              userId: bid.carrier_id,
              metadata: { amount: bid.amount },
              icon: X,
              color: 'text-red-600'
            })
          }
        })
      }

      // Add message activities
      if (messagesData) {
        messagesData.forEach(msg => {
          allActivities.push({
            id: `msg-${msg.id}`,
            type: 'message_sent',
            description: `Message sent: "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}"`,
            timestamp: msg.created_at,
            userId: msg.sender_id,
            icon: MessageSquare,
            color: 'text-blue-600'
          })
        })
      }

      // Note: opportunity_activity table integration will be added in future update

      // Sort by timestamp (most recent first)
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // Remove duplicates based on similar timestamps and actions
      const uniqueActivities = allActivities.filter((activity, index, self) => {
        if (index === 0) return true
        const prevActivity = self[index - 1]
        const timeDiff = Math.abs(
          new Date(activity.timestamp).getTime() - 
          new Date(prevActivity.timestamp).getTime()
        )
        // If activities are within 1 second and same type, consider them duplicates
        return !(timeDiff < 1000 && activity.type === prevActivity.type)
      })

      setActivities(uniqueActivities)
    } catch (error) {
      console.error('Failed to load activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatActivityDescription = (action: string, details: any): string => {
    if (!action) return 'Activity recorded'
    
    switch (action) {
      case 'bid_placed':
        return `Bid placed: $${details?.amount?.toLocaleString() || 'N/A'}`
      case 'bid_withdrawn':
        return `Bid withdrawn`
      case 'message_sent':
        return `New message in chat`
      case 'opportunity_viewed':
        return `Opportunity viewed`
      case 'opportunity_created':
        return `Opportunity created`
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getActivityColor = (action: string): string => {
    if (!action) return 'text-gray-600'
    
    switch (action) {
      case 'bid_placed':
        return 'text-green-600'
      case 'bid_withdrawn':
        return 'text-red-600'
      case 'message_sent':
        return 'text-blue-600'
      case 'opportunity_viewed':
        return 'text-gray-600'
      case 'opportunity_created':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading activity...</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No activity yet for this opportunity.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon || AlertCircle
          return (
            <div key={activity.id} className="relative flex items-start">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-200 z-10 ${activity.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="ml-4 flex-1">
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(activity.timestamp)}
                  </p>
                  {activity.metadata?.notes && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      Note: {activity.metadata.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}