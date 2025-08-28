import { SpotExchangeAPI } from '@spot-exchange/shared'
import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

// Create API client instance
export const apiClient = new SpotExchangeAPI({
  baseURL: API_URL,
  supabase,
  getAccessToken: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  },
})

// Wrapper functions for easier usage in components
export const api = {
  // Auth
  getCurrentUser: () => apiClient.getCurrentUser(),

  // Opportunities
  getOpportunities: (filters?: any) => apiClient.getOpportunities(filters),
  getOpportunity: (id: string) => apiClient.getOpportunity(id),
  createOpportunity: (data: any) => apiClient.createOpportunity(data),
  updateOpportunity: (id: string, data: any) => apiClient.updateOpportunity(id, data),
  deleteOpportunity: (id: string) => apiClient.deleteOpportunity(id),

  // Bidding
  getOpportunityBids: (opportunityId: string) => apiClient.getOpportunityBids(opportunityId),
  placeBid: (opportunityId: string, data: any) => apiClient.placeBid(opportunityId, data),
  updateBid: (bidId: string, amount: number) => apiClient.updateBid(bidId, amount),
  withdrawBid: (bidId: string) => apiClient.withdrawBid(bidId),
  lockBidPrice: (bidId: string, duration: '24h' | '48h') => apiClient.lockBidPrice(bidId, duration),

  // Collaboration
  getOpportunityMessages: (opportunityId: string) => apiClient.getOpportunityMessages(opportunityId),
  sendMessage: (opportunityId: string, data: any) => apiClient.sendMessage(opportunityId, data),
  getOpportunityActivity: (opportunityId: string) => apiClient.getOpportunityActivity(opportunityId),

  // Real-time subscriptions
  subscribeToOpportunity: (opportunityId: string, callbacks: any) =>
    apiClient.subscribeToOpportunity(opportunityId, callbacks),
  subscribeToPresence: (opportunityId: string, userId: string) =>
    apiClient.subscribeToPresence(opportunityId, userId),
}