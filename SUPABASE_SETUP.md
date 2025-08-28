# 🗄️ Supabase Setup Instructions

## Step 1: Create Supabase Project (5 minutes)

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up/Login** with your preferred method
3. **Click "New project"**
4. **Project settings:**
   - Name: `spot-exchange` or `freight-bidding-platform`  
   - Database password: Generate a strong password (save this!)
   - Region: Choose closest to your location
   - Pricing plan: Start with **Free tier**

## Step 2: Get Your Credentials

After project creation (takes ~2 minutes), go to **Settings > API**:

1. **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
2. **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long JWT token)
3. **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (different JWT token)

## Step 3: Configure Environment Variables

Copy the credentials to these files:

### API Environment (`apps/api/.env`)
```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Web Environment (`apps/web/.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Step 4: Run Database Migrations

1. **Go to your Supabase project dashboard**
2. **Click "SQL Editor" in the sidebar**
3. **Create a new query**
4. **Copy and paste the content from:**
   - First: `packages/database/supabase/migrations/001_initial_schema.sql`
   - Then: `packages/database/supabase/migrations/002_row_level_security.sql`
5. **Click "Run" for each migration**

## Step 5: Verify Setup

After running migrations, you should see these tables in **Database > Tables**:
- ✅ `tenants`
- ✅ `users` 
- ✅ `opportunities`
- ✅ `bids`
- ✅ `opportunity_messages`
- ✅ `opportunity_activity`
- ✅ `documents`
- ✅ `price_locks`

## Expected Result

After setup, you'll have:
- 🗄️ **Multi-tenant database** with proper relationships
- 🔐 **Row Level Security** for data isolation  
- 🔄 **Real-time subscriptions** ready
- 📊 **Activity logging** via triggers
- 🚀 **Ready for development!**

---

**Time required:** ~10 minutes total

Once done, return to the terminal and continue with the development server startup!