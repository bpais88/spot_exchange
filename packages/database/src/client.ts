import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          subdomain: string;
          settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          role: 'carrier' | 'account_manager' | 'admin' | 'super_admin';
          company_name: string | null;
          rating: number | null;
          profile: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      opportunities: {
        Row: {
          id: string;
          tenant_id: string;
          created_by: string;
          origin: any;
          destination: any;
          cargo_details: any;
          equipment: string[];
          pickup_date: string;
          delivery_date: string;
          status: 'draft' | 'active' | 'pending' | 'awarded' | 'completed' | 'cancelled';
          visibility_rules: any;
          current_best_bid: number | null;
          minimum_rate: number | null;
          buy_now_rate: number | null;
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['opportunities']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['opportunities']['Insert']>;
      };
      bids: {
        Row: {
          id: string;
          opportunity_id: string;
          carrier_id: string;
          amount: number;
          status: 'active' | 'accepted' | 'rejected' | 'withdrawn' | 'expired' | 'locked';
          locked_until: string | null;
          lock_fee: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bids']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bids']['Insert']>;
      };
      opportunity_messages: {
        Row: {
          id: string;
          opportunity_id: string;
          sender_id: string;
          message: string;
          attachments: any;
          read_by: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['opportunity_messages']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['opportunity_messages']['Insert']>;
      };
      opportunity_activity: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          activity_type: 'bid_placed' | 'bid_updated' | 'bid_withdrawn' | 'message_sent' | 'document_uploaded' | 'status_changed' | 'price_locked';
          details: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['opportunity_activity']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['opportunity_activity']['Insert']>;
      };
    };
  };
};

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
}

export { SupabaseClient };