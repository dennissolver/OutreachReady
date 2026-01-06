-- OutreachReady Database Schema
-- Migration 001: Create Tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM TYPES
CREATE TYPE contact_type AS ENUM ('warm', 'cold');
CREATE TYPE relationship_goal AS ENUM ('client', 'partner', 'investor', 'collaborator', 'referrer', 'advisor', 'network');
CREATE TYPE funnel_stage AS ENUM ('cold', 'aware', 'engaged', 'interested', 'evaluating', 'converted', 'nurture');
CREATE TYPE message_objective AS ENUM ('first_touch', 'follow_up', 'value_add', 'pitch', 'advance', 'close', 'maintain', 'reactivate', 'thank');
CREATE TYPE communication_channel AS ENUM ('linkedin_dm', 'linkedin_inmail', 'email', 'whatsapp', 'phone', 'in_person', 'other');
CREATE TYPE communication_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status AS ENUM ('draft', 'approved', 'sent', 'response_received');
CREATE TYPE message_cadence AS ENUM ('daily', 'every_3_days', 'weekly', 'biweekly', 'monthly');
CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'professional', 'enterprise');

-- USERS TABLE
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier subscription_tier DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  messages_used_this_month INTEGER DEFAULT 0,
  messages_limit INTEGER DEFAULT 10,
  contacts_limit INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTACTS TABLE
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  contact_type contact_type NOT NULL DEFAULT 'cold',
  relationship_goal relationship_goal NOT NULL DEFAULT 'client',
  funnel_stage funnel_stage NOT NULL DEFAULT 'cold',
  linkedin_url TEXT,
  linkedin_data JSONB DEFAULT '{}',
  discovery_source TEXT,
  discovery_details TEXT,
  discovery_date TIMESTAMPTZ DEFAULT NOW(),
  ai_persona JSONB DEFAULT '{}',
  matched_services JSONB DEFAULT '[]',
  last_contact_date TIMESTAMPTZ,
  next_action_date TIMESTAMPTZ,
  next_action_description TEXT,
  total_touchpoints INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_funnel_stage ON public.contacts(funnel_stage);
CREATE INDEX idx_contacts_relationship_goal ON public.contacts(relationship_goal);

-- JOURNEY PLANS TABLE
CREATE TABLE public.journey_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_goal relationship_goal NOT NULL,
  target_completion_date TIMESTAMPTZ,
  message_cadence message_cadence DEFAULT 'weekly',
  milestones JSONB DEFAULT '[]',
  planned_sequence JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  current_sequence_position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMUNICATIONS TABLE
CREATE TABLE public.communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel communication_channel NOT NULL,
  direction communication_direction NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  funnel_stage_at_time funnel_stage,
  objective_at_time message_objective,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  generated_message_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GENERATED MESSAGES TABLE
CREATE TABLE public.generated_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  objective message_objective NOT NULL,
  desired_next_step TEXT,
  target_funnel_stage funnel_stage,
  target_channel communication_channel NOT NULL,
  services_pitched JSONB DEFAULT '[]',
  draft_content TEXT NOT NULL,
  final_content TEXT,
  generation_prompt TEXT,
  generation_context JSONB DEFAULT '{}',
  status message_status DEFAULT 'draft',
  voice_session_id TEXT,
  voice_transcript TEXT,
  user_rating INTEGER,
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- VOICE SESSIONS TABLE
CREATE TABLE public.voice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  elevenlabs_session_id TEXT,
  elevenlabs_conversation_id TEXT,
  session_type TEXT,
  transcript JSONB DEFAULT '[]',
  collected_data JSONB DEFAULT '{}',
  resulting_contact_id UUID,
  resulting_message_id UUID,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- MARKETPLACE SERVICES CACHE
CREATE TABLE public.marketplace_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  provider TEXT,
  keywords TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  use_cases TEXT[] DEFAULT '{}',
  price_range TEXT,
  pricing_model TEXT,
  marketplace_url TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journey_plans_updated_at BEFORE UPDATE ON public.journey_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generated_messages_updated_at BEFORE UPDATE ON public.generated_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AUTO-CREATE USER PROFILE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
