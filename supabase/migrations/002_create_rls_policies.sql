-- Migration 002: Row Level Security Policies

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_services ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- CONTACTS
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

-- JOURNEY PLANS
CREATE POLICY "Users can view own journey plans" ON public.journey_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own journey plans" ON public.journey_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journey plans" ON public.journey_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journey plans" ON public.journey_plans FOR DELETE USING (auth.uid() = user_id);

-- COMMUNICATIONS
CREATE POLICY "Users can view own communications" ON public.communications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own communications" ON public.communications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own communications" ON public.communications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own communications" ON public.communications FOR DELETE USING (auth.uid() = user_id);

-- GENERATED MESSAGES
CREATE POLICY "Users can view own generated messages" ON public.generated_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own generated messages" ON public.generated_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own generated messages" ON public.generated_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own generated messages" ON public.generated_messages FOR DELETE USING (auth.uid() = user_id);

-- VOICE SESSIONS
CREATE POLICY "Users can view own voice sessions" ON public.voice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own voice sessions" ON public.voice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice sessions" ON public.voice_sessions FOR UPDATE USING (auth.uid() = user_id);

-- MARKETPLACE SERVICES (public read)
CREATE POLICY "Anyone can view marketplace services" ON public.marketplace_services FOR SELECT USING (true);
