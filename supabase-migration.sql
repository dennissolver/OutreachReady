-- OutreachReady Database Update for New Flow
-- Run this in Supabase SQL Editor

-- 1. Update contacts table (remove strategy columns, keep simple)
ALTER TABLE contacts 
DROP COLUMN IF EXISTS funnel_stage,
DROP COLUMN IF EXISTS relationship_goal,
DROP COLUMN IF EXISTS preferred_channel;

-- Ensure we have the columns we need
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ;

-- 2. Update communications table for context storage
ALTER TABLE communications
ALTER COLUMN direction TYPE TEXT;

-- Add unique constraint for context per contact (upsert support)
-- First drop if exists
ALTER TABLE communications 
DROP CONSTRAINT IF EXISTS communications_contact_context_unique;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_communications_contact_direction 
ON communications(contact_id, direction);

-- 3. Update generated_messages table
ALTER TABLE generated_messages
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS variant TEXT,
ADD COLUMN IF NOT EXISTS channel TEXT;

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_generated_messages_session 
ON generated_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_generated_messages_contact 
ON generated_messages(contact_id);

-- 4. Ensure RLS policies exist
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

DROP POLICY IF EXISTS "Users can view own communications" ON communications;
DROP POLICY IF EXISTS "Users can insert own communications" ON communications;
DROP POLICY IF EXISTS "Users can update own communications" ON communications;

DROP POLICY IF EXISTS "Users can view own generated_messages" ON generated_messages;
DROP POLICY IF EXISTS "Users can insert own generated_messages" ON generated_messages;

-- Create fresh policies
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own communications" ON communications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own communications" ON communications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own communications" ON communications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own generated_messages" ON generated_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated_messages" ON generated_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_messages ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'Database updated successfully for new OutreachReady flow!' as status;
