import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, contact, communications, channel, objective, tone } = body;

    if (!contactId || !objective) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build the prompt
    const channelGuidelines = getChannelGuidelines(channel);
    
    const prompt = `You are an expert outreach strategist helping craft the perfect message.

CONTACT INFORMATION:
- Name: ${contact?.name || 'Unknown'}
- Company: ${contact?.company || 'Unknown'}
- Title: ${contact?.title || 'Unknown'}

PREVIOUS COMMUNICATIONS:
${communications || 'No previous communications provided.'}

MESSAGE REQUIREMENTS:
- Channel: ${channel} (${channelGuidelines})
- Objective: ${objective}
- Tone: ${tone}

Generate 4 different message options that:
1. Are appropriate for the ${channel} channel
2. Work toward the objective: "${objective}"
3. Maintain a ${tone} tone
4. Reference previous communications naturally if provided
5. Feel authentic and human (not generic or templated)

Each message should have a different approach:
- Option 1: Direct and clear
- Option 2: Story-driven or curiosity-based
- Option 3: Value-first (lead with what you can offer)
- Option 4: Relationship-focused (personal connection)

Return as JSON array with this structure:
[
  {
    "variant": "direct",
    "content": "message text here"
  },
  {
    "variant": "curiosity",
    "content": "message text here"
  },
  {
    "variant": "value",
    "content": "message text here"
  },
  {
    "variant": "relationship",
    "content": "message text here"
  }
]

Only return the JSON array, no other text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at crafting personalized outreach messages. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '[]';
    
    // Parse the JSON response
    let messages;
    try {
      // Clean up the response (remove markdown code blocks if present)
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      messages = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      return NextResponse.json(
        { success: false, error: 'Failed to parse generated messages' },
        { status: 500 }
      );
    }

    // Save messages to database
    const sessionId = crypto.randomUUID();
    
    const messagesToInsert = messages.map((msg: any) => ({
      contact_id: contactId,
      user_id: user.id,
      session_id: sessionId,
      channel: channel,
      tone: tone,
      content: msg.content,
      variant: msg.variant,
    }));

    const { error: insertError } = await supabase
      .from('generated_messages')
      .insert(messagesToInsert);

    if (insertError) {
      console.error('Failed to save messages:', insertError);
      // Continue anyway - messages were generated
    }

    return NextResponse.json({
      success: true,
      sessionId,
      messages,
    });

  } catch (error: any) {
    console.error('Message generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate messages' },
      { status: 500 }
    );
  }
}

function getChannelGuidelines(channel: string): string {
  const guidelines: Record<string, string> = {
    linkedin_dm: 'Keep under 300 characters for best engagement. Be professional but personable.',
    linkedin_comment: 'Keep brief, add value to the conversation, reference their post content.',
    linkedin_connection: 'Must be under 300 characters. Give a reason to connect.',
    email: 'Can be longer. Include clear subject line suggestion. Professional format.',
    whatsapp: 'Casual, conversational. Can use line breaks. Keep it mobile-friendly.',
    twitter_dm: 'Brief and direct. Under 280 characters preferred.',
    sms: 'Very short. Under 160 characters. Get to the point.',
  };
  return guidelines[channel] || 'Adapt length and tone to the platform.';
}
