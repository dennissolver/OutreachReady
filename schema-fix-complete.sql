-- OutreachReady Complete Schema Fix
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. FIX USERS TABLE
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS products_url TEXT,
ADD COLUMN IF NOT EXISTS product_description TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- ============================================
-- 2. FIX CONTACTS TABLE
-- ============================================
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ;

-- ============================================
-- 3. FIX COMMUNICATIONS TABLE
-- ============================================
ALTER TABLE communications
ALTER COLUMN channel TYPE TEXT USING channel::TEXT;

ALTER TABLE communications
ALTER COLUMN direction TYPE TEXT USING direction::TEXT;

ALTER TABLE communications
ADD COLUMN IF NOT EXISTS content TEXT;

-- ============================================
-- 4. FIX GENERATED_MESSAGES TABLE
-- ============================================
ALTER TABLE generated_messages
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS variant TEXT,
ADD COLUMN IF NOT EXISTS channel TEXT,
ADD COLUMN IF NOT EXISTS tone TEXT,
ADD COLUMN IF NOT EXISTS product_pitched TEXT;

-- ============================================
-- 5. RLS POLICIES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_messages ENABLE ROW LEVEL SECURITY;

-- Users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Contacts
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Users can manage own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);

-- Communications
DROP POLICY IF EXISTS "Users can manage own communications" ON communications;
CREATE POLICY "Users can manage own communications" ON communications FOR ALL USING (auth.uid() = user_id);

-- Generated messages
DROP POLICY IF EXISTS "Users can manage own messages" ON generated_messages;
CREATE POLICY "Users can manage own messages" ON generated_messages FOR ALL USING (auth.uid() = user_id);

-- Verify
SELECT 'Schema fix complete!' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('company_name', 'product_description');
