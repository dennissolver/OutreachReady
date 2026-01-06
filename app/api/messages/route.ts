import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMessage } from '@/lib/ai/message-generator';
import type { GenerateMessageRequest } from '@/types';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: messages, error } = await supabase.from('generated_messages').select('*, contacts(name, company)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: limitCheck } = await supabase.rpc('check_user_limits', { p_user_id: user.id, p_check_type: 'messages' });
  if (limitCheck && !limitCheck.can_create) return NextResponse.json({ error: 'Monthly message limit reached' }, { status: 403 });

  const body: GenerateMessageRequest = await request.json();
  if (!body.contact_id || !body.objective || !body.target_channel) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const { data: contactData } = await supabase.rpc('get_contact_with_history', { p_contact_id: body.contact_id, p_user_id: user.id });
  if (!contactData?.contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const result = await generateMessage({
    contact: contactData.contact, objective: body.objective, desired_next_step: body.desired_next_step,
    target_channel: body.target_channel, recent_communications: contactData.communications || []
  });

  const { data: message, error } = await supabase.from('generated_messages').insert({
    user_id: user.id, contact_id: body.contact_id, objective: body.objective, desired_next_step: body.desired_next_step,
    target_channel: body.target_channel, draft_content: result.content, generation_prompt: result.prompt_used, status: 'draft'
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.rpc('increment_message_usage', { p_user_id: user.id });
  return NextResponse.json({ message, content: result.content }, { status: 201 });
}
