import { getSupabaseClient } from './client';

const supabase = getSupabaseClient();

export const queries = {
  // Tenant queries
  async getTenantBySubdomain(subdomain: string) {
    return await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', subdomain)
      .single();
  },

  // User queries
  async getUserById(userId: string) {
    return await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
  },

  async createUser(userData: any) {
    return await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
  },

  // Opportunity queries
  async getOpportunities(filters: {
    tenantId?: string;
    status?: string[];
    limit?: number;
    offset?: number;
  }) {
    let query = supabase.from('opportunities').select('*', { count: 'exact' });

    if (filters.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    return await query.order('created_at', { ascending: false });
  },

  async getOpportunityById(opportunityId: string) {
    return await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();
  },

  async createOpportunity(data: any) {
    return await supabase
      .from('opportunities')
      .insert(data)
      .select()
      .single();
  },

  async updateOpportunity(
    opportunityId: string,
    data: any
  ) {
    return await supabase
      .from('opportunities')
      .update(data)
      .eq('id', opportunityId)
      .select()
      .single();
  },

  // Bid queries
  async getBidsForOpportunity(opportunityId: string) {
    return await supabase
      .from('bids')
      .select(`
        *,
        carrier:users(*)
      `)
      .eq('opportunity_id', opportunityId)
      .order('amount', { ascending: true });
  },

  async placeBid(data: any) {
    return await supabase
      .from('bids')
      .insert(data)
      .select()
      .single();
  },

  async updateBid(bidId: string, data: any) {
    return await supabase
      .from('bids')
      .update(data)
      .eq('id', bidId)
      .select()
      .single();
  },

  // Message queries
  async getMessagesForOpportunity(opportunityId: string) {
    return await supabase
      .from('opportunity_messages')
      .select(`
        *,
        sender:users(*)
      `)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true });
  },

  async sendMessage(data: any) {
    return await supabase
      .from('opportunity_messages')
      .insert(data)
      .select()
      .single();
  },

  async markMessageAsRead(messageId: string, userId: string) {
    const { data: message } = await supabase
      .from('opportunity_messages')
      .select('read_by')
      .eq('id', messageId)
      .single();

    if (!message) return null;

    const readBy = message.read_by || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
    }

    return await supabase
      .from('opportunity_messages')
      .update({ read_by: readBy })
      .eq('id', messageId)
      .select()
      .single();
  },

  // Activity queries
  async getActivityForOpportunity(opportunityId: string) {
    return await supabase
      .from('opportunity_activity')
      .select(`
        *,
        user:users(*)
      `)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });
  },

  async recordActivity(data: any) {
    return await supabase
      .from('opportunity_activity')
      .insert(data)
      .select()
      .single();
  },
};