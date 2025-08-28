import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Opportunity,
  OpportunityFilters,
  Bid,
  OpportunityMessage,
  OpportunityActivity,
  ApiResponse,
  User,
} from '../types';
import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  PlaceBidInput,
  SendMessageInput,
} from '../schemas';

export interface ApiClientConfig {
  baseURL: string;
  supabase?: SupabaseClient;
  getAccessToken?: () => Promise<string | null>;
}

export class SpotExchangeAPI {
  private baseURL: string;
  private supabase?: SupabaseClient;
  private getAccessToken?: () => Promise<string | null>;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.supabase = config.supabase;
    this.getAccessToken = config.getAccessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { params?: Record<string, any> } = {}
  ): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    
    let url = `${this.baseURL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.error || { code: 'UNKNOWN', message: 'An error occurred' },
        };
      }

      return {
        success: true,
        data: data.data,
        metadata: data.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  // Authentication
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/api/auth/me');
  }

  // Opportunities
  async getOpportunities(filters?: OpportunityFilters): Promise<ApiResponse<Opportunity[]>> {
    return this.request<Opportunity[]>('/api/opportunities', { params: filters });
  }

  async getOpportunity(id: string): Promise<ApiResponse<Opportunity>> {
    return this.request<Opportunity>(`/api/opportunities/${id}`);
  }

  async createOpportunity(data: CreateOpportunityInput): Promise<ApiResponse<Opportunity>> {
    return this.request<Opportunity>('/api/opportunities', {
      method: 'POST',
      body: data as any,
    });
  }

  async updateOpportunity(id: string, data: UpdateOpportunityInput): Promise<ApiResponse<Opportunity>> {
    return this.request<Opportunity>(`/api/opportunities/${id}`, {
      method: 'PUT',
      body: data as any,
    });
  }

  async deleteOpportunity(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/opportunities/${id}`, {
      method: 'DELETE',
    });
  }

  // Bidding
  async getOpportunityBids(opportunityId: string): Promise<ApiResponse<Bid[]>> {
    return this.request<Bid[]>(`/api/opportunities/${opportunityId}/bids`);
  }

  async placeBid(opportunityId: string, data: PlaceBidInput): Promise<ApiResponse<Bid>> {
    return this.request<Bid>(`/api/opportunities/${opportunityId}/bids`, {
      method: 'POST',
      body: data as any,
    });
  }

  async updateBid(bidId: string, amount: number): Promise<ApiResponse<Bid>> {
    return this.request<Bid>(`/api/bids/${bidId}`, {
      method: 'PUT',
      body: { amount } as any,
    });
  }

  async withdrawBid(bidId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/bids/${bidId}`, {
      method: 'DELETE',
    });
  }

  async lockBidPrice(bidId: string, duration: '24h' | '48h'): Promise<ApiResponse<Bid>> {
    return this.request<Bid>(`/api/bids/${bidId}/lock`, {
      method: 'POST',
      body: { duration } as any,
    });
  }

  // Collaboration
  async getOpportunityMessages(opportunityId: string): Promise<ApiResponse<OpportunityMessage[]>> {
    return this.request<OpportunityMessage[]>(`/api/opportunities/${opportunityId}/messages`);
  }

  async sendMessage(opportunityId: string, data: SendMessageInput): Promise<ApiResponse<OpportunityMessage>> {
    return this.request<OpportunityMessage>(`/api/opportunities/${opportunityId}/messages`, {
      method: 'POST',
      body: data as any,
    });
  }

  async getOpportunityActivity(opportunityId: string): Promise<ApiResponse<OpportunityActivity[]>> {
    return this.request<OpportunityActivity[]>(`/api/opportunities/${opportunityId}/activity`);
  }

  // Real-time subscriptions (using Supabase)
  subscribeToOpportunity(opportunityId: string, callbacks: {
    onBidUpdate?: (bid: Bid) => void;
    onMessageReceived?: (message: OpportunityMessage) => void;
    onActivityUpdate?: (activity: OpportunityActivity) => void;
  }) {
    if (!this.supabase) {
      console.warn('Supabase client not initialized for real-time subscriptions');
      return null;
    }

    const channel = this.supabase
      .channel(`opportunity:${opportunityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `opportunity_id=eq.${opportunityId}`,
        },
        (payload) => {
          if (callbacks.onBidUpdate && payload.new) {
            callbacks.onBidUpdate(payload.new as Bid);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'opportunity_messages',
          filter: `opportunity_id=eq.${opportunityId}`,
        },
        (payload) => {
          if (callbacks.onMessageReceived && payload.new) {
            callbacks.onMessageReceived(payload.new as OpportunityMessage);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'opportunity_activity',
          filter: `opportunity_id=eq.${opportunityId}`,
        },
        (payload) => {
          if (callbacks.onActivityUpdate && payload.new) {
            callbacks.onActivityUpdate(payload.new as OpportunityActivity);
          }
        }
      )
      .subscribe();

    return () => {
      this.supabase?.removeChannel(channel);
    };
  }

  // Presence for typing indicators
  async subscribeToPresence(opportunityId: string, userId: string) {
    if (!this.supabase) return null;

    const channel = this.supabase.channel(`presence:opportunity:${opportunityId}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence state:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      this.supabase?.removeChannel(channel);
    };
  }
}