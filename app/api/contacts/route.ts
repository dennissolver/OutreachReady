import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateContactRequest } from '@/types';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  let query = supabase.from('contacts').select('*').eq('user_id', user.id).eq('is_archived', false).order('updated_at', { ascending: false });
  if (searchParams.get('stage')) query = query.eq('funnel_stage', searchParams.get('stage'));
  if (searchParams.get('goal')) query = query.eq('relationship_goal', searchParams.get('goal'));

  const { data: contacts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: limitCheck } = await supabase.rpc('check_user_limits', { p_user_id: user.id, p_check_type: 'contacts' });
  if (limitCheck && !limitCheck.can_create) return NextResponse.json({ error: 'Contact limit reached' }, { status: 403 });

  const body: CreateContactRequest = await request.json();
  if (!body.name || !body.contact_type || !body.relationship_goal) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const { data: contact, error } = await supabase.from('contacts').insert({
    user_id: user.id, name: body.name, contact_type: body.contact_type, relationship_goal: body.relationship_goal,
    funnel_stage: 'cold', linkedin_url: body.linkedin_url, email: body.email, company: body.company, title: body.title,
    discovery_source: body.discovery_source, discovery_details: body.discovery_details
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact }, { status: 201 });
}
