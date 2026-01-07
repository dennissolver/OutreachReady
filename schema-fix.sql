-- OutreachReady Database Fix - Complete Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. FIX USERS TABLE - Add seller/product info
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS products_url TEXT,
ADD COLUMN IF NOT EXISTS product_description TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- ============================================
-- 2. FIX CONTACTS TABLE - Add buyer research fields
-- ============================================
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Remove old strategy columns if they exist
ALTER TABLE contacts 
DROP COLUMN IF EXISTS funnel_stage,
DROP COLUMN IF EXISTS relationship_goal,
DROP COLUMN IF EXISTS preferred_channel;

-- ============================================
-- 3. FIX COMMUNICATIONS TABLE
-- ============================================

-- First ensure direction is TEXT type
ALTER TABLE communications
ALTER COLUMN direction TYPE TEXT USING direction::TEXT;

-- Add missing columns
ALTER TABLE communications
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS channel TEXT;

-- ============================================
-- 4. FIX GENERATED_MESSAGES TABLE
-- ============================================
ALTER TABLE generated_messages
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS variant TEXT,
ADD COLUMN IF NOT EXISTS channel TEXT,
ADD COLUMN IF NOT EXISTS tone TEXT,
ADD COLUMN IF NOT EXISTS product_pitched TEXT,
ADD COLUMN IF NOT EXISTS buyer_context TEXT,
ADD COLUMN IF NOT EXISTS seller_context TEXT;

-- ============================================
-- 5. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_communications_contact_id ON communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_contact_id ON generated_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_session_id ON generated_messages(session_id);

-- ============================================
-- 6. RLS POLICIES (recreate cleanly)
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Contacts policies
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Users can manage own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);

-- Communications policies  
DROP POLICY IF EXISTS "Users can manage own communications" ON communications;
CREATE POLICY "Users can manage own communications" ON communications FOR ALL USING (auth.uid() = user_id);

-- Generated messages policies
DROP POLICY IF EXISTS "Users can manage own messages" ON generated_messages;
CREATE POLICY "Users can manage own messages" ON generated_messages FOR ALL USING (auth.uid() = user_id);

SELECT 'Schema updated successfully!' as status;
