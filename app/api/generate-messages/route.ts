import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      contactId, 
      contact, 
      seller, 
      communications, 
      channel, 
      objective, 
      product, 
      tone 
    } = body;

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

    // Build comprehensive prompt
    const channelGuide = getChannelGuidelines(channel);
    
    const prompt = `You are an expert B2B sales strategist and copywriter. Your job is to craft the perfect outreach message.

## CONTEXT ABOUT THE BUYER (Who you're messaging)
- Name: ${contact?.name || 'Unknown'}
- Title: ${contact?.title || 'Unknown'}
- Company: ${contact?.company || 'Unknown'}
- Company Website: ${contact?.website || 'Not provided'}
- LinkedIn: ${contact?.linkedin || 'Not provided'}
- Notes: ${contact?.notes || 'None'}

## CONTEXT ABOUT THE SELLER (Who is sending the message)
- Company: ${seller?.company || 'Not specified'}
- Website: ${seller?.website || 'Not specified'}
- Products Page: ${seller?.productsUrl || 'Not specified'}
- Offering Description: ${seller?.productDescription || 'Not specified'}

## PREVIOUS COMMUNICATIONS
${communications || 'No previous communications provided. This may be a cold outreach.'}

## MESSAGE REQUIREMENTS
- Channel: ${channel} 
- Channel Guidelines: ${channelGuide}
- Product/Service to Pitch: ${product}
- Objective: ${objective}
- Tone: ${tone}

## YOUR TASK
Generate 4 different message variants. Each should:

1. Be appropriate for ${channel} (follow the length and format guidelines)
2. Reference the relationship context from previous communications (if provided)
3. Subtly connect the seller's offering (${product}) to the buyer's likely needs
4. Work toward the objective: "${objective}"
5. Use a ${tone} tone
6. Feel authentic and human - NOT like a generic sales template
7. Include a clear but soft call-to-action

Each variant should take a different approach:
- **Direct**: Clear, straightforward ask
- **Value-First**: Lead with insight or value for them
- **Curiosity**: Spark interest with a question or observation  
- **Relationship**: Focus on the connection, less salesy

Return ONLY a JSON array with this exact structure (no markdown, no explanation):
[
  {"variant": "direct", "content": "message text here"},
  {"variant": "value", "content": "message text here"},
  {"variant": "curiosity", "content": "message text here"},
  {"variant": "relationship", "content": "message text here"}
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert B2B sales copywriter. Return ONLY valid JSON arrays. No markdown code blocks, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2500,
    });

    const responseText = completion.choices[0]?.message?.content || '[]';
    
    // Parse JSON response
    let messages;
    try {
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

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Save messages to database
    const messagesToInsert = messages.map((msg: any) => ({
      contact_id: contactId,
      user_id: user.id,
      session_id: sessionId,
      channel: channel,
      tone: tone,
      content: msg.content,
      variant: msg.variant,
      product_pitched: product,
      buyer_context: JSON.stringify(contact),
      seller_context: JSON.stringify(seller),
    }));

    const { error: insertError } = await supabase
      .from('generated_messages')
      .insert(messagesToInsert);

    if (insertError) {
      console.error('Failed to save messages:', insertError);
      // Continue anyway - we generated the messages
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
    linkedin_dm: 'Keep under 300 characters for best engagement. Be professional but warm. No formal salutations needed.',
    linkedin_comment: 'Keep brief (1-3 sentences). Add value to their post. Reference something specific they said.',
    linkedin_connection: 'MUST be under 300 characters. Give a compelling reason to connect. Be specific, not generic.',
    email: 'Can be longer (150-250 words). Include a subject line suggestion at the start. Professional format but personable.',
    email_followup: 'Shorter than initial email. Reference the previous touchpoint. Add new value or angle.',
    whatsapp: 'Casual and conversational. Use line breaks for readability. Keep it mobile-friendly. Can use occasional emoji.',
    sms: 'Very short (under 160 chars). Get to the point immediately. Include your name.',
  };
  return guidelines[channel] || 'Adapt length and tone appropriately for the platform.';
}
