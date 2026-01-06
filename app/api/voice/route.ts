import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateMessage } from '@/lib/ai/message-generator';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tool_name, tool_input, session_id, user_id } = body;
  if (!tool_name || !user_id) return NextResponse.json({ error: 'Missing tool_name or user_id' }, { status: 400 });

  const supabase = createAdminClient();

  switch (tool_name) {
    case 'create_contact': {
      const { data: contact, error } = await supabase.from('contacts').insert({
        user_id, name: tool_input.name, contact_type: tool_input.contact_type || 'cold',
        relationship_goal: tool_input.relationship_goal || 'client', funnel_stage: 'cold',
        linkedin_url: tool_input.linkedin_url, discovery_source: tool_input.discovery_source
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, contact_id: contact.id, message: `Created contact: ${contact.name}` });
    }

    case 'generate_message': {
      const { contact_id, objective, desired_next_step, target_channel } = tool_input;
      const { data: contactData } = await supabase.rpc('get_contact_with_history', { p_contact_id: contact_id, p_user_id: user_id });
      if (!contactData?.contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

      const result = await generateMessage({ contact: contactData.contact, objective, desired_next_step, target_channel, recent_communications: contactData.communications || [] });
      const { data: message } = await supabase.from('generated_messages').insert({
        user_id, contact_id, objective, desired_next_step, target_channel, draft_content: result.content, voice_session_id: session_id, status: 'draft'
      }).select().single();

      await supabase.rpc('increment_message_usage', { p_user_id: user_id });
      return NextResponse.json({ success: true, message_id: message?.id, content: result.content });
    }

    case 'get_services': {
      const { data: services } = await supabase.from('marketplace_services').select('id, name, description, category').eq('is_active', true).limit(10);
      return NextResponse.json({ success: true, services: services || [] });
    }

    case 'search_contacts': {
      const { data: contacts } = await supabase.rpc('search_contacts', { p_user_id: user_id, p_query: tool_input.query || null, p_limit: 10, p_offset: 0 });
      return NextResponse.json({ success: true, contacts: contacts || [] });
    }

    default:
      return NextResponse.json({ error: `Unknown tool: ${tool_name}` }, { status: 400 });
  }
}
