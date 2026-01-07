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

    // ============================================
    // STEP 1: AUTO-ANALYZE CONTACT'S WEBSITE
    // ============================================
    let contactBusinessInfo = '';
    if (contact?.website) {
      try {
        const websiteContent = await fetchWebsiteContent(contact.website);
        if (websiteContent) {
          contactBusinessInfo = await analyzeWithAI(
            `Analyze this business website and extract:
1. What does this company do?
2. Who are their customers?
3. What problems do they solve?
4. What challenges might they face?
Be concise (under 150 words).

Website: ${contact.website}
Content: ${websiteContent}`
          );
        }
      } catch (err) {
        console.log('Could not analyze contact website:', err);
      }
    }

    // ============================================
    // STEP 2: AUTO-ANALYZE SELLER'S OFFERINGS
    // ============================================
    let sellerOfferings = seller?.productDescription || '';
    if (!sellerOfferings && seller?.productsUrl) {
      try {
        const websiteContent = await fetchWebsiteContent(seller.productsUrl);
        if (websiteContent) {
          sellerOfferings = await analyzeWithAI(
            `Extract products and services from this website. List each with a brief description. Be concise.

Content: ${websiteContent}`
          );
        }
      } catch (err) {
        console.log('Could not analyze seller website:', err);
      }
    }

    // ============================================
    // STEP 3: BUILD AI-LED COMPREHENSIVE PROMPT
    // ============================================
    const channelGuide = getChannelGuidelines(channel);
    
    const prompt = `You are an expert B2B sales strategist. Analyze everything and create personalized outreach.

## AUTOMATED ANALYSIS RESULTS

### BUYER ANALYSIS (${contact?.name} at ${contact?.company})
Title: ${contact?.title || 'Unknown'}
Website: ${contact?.website || 'Not provided'}
${contactBusinessInfo ? `
**AI-ANALYZED BUYER BUSINESS:**
${contactBusinessInfo}
` : 'No website data available - use company name to infer.'}

### COMMUNICATION HISTORY
${communications || 'No previous communications - this is COLD outreach. Be extra compelling.'}

### SELLER OFFERINGS (${seller?.company || 'Our Company'})
Website: ${seller?.website || 'Not specified'}
${sellerOfferings ? `
**PRODUCTS/SERVICES AVAILABLE:**
${sellerOfferings}
` : 'General business solutions.'}

## YOUR TASK - DO ALL OF THIS:

1. **MATCH**: Based on buyer's business, which seller offering(s) are most relevant?
2. **IDENTIFY PAIN**: What specific problem can we solve for them?
3. **CRAFT MESSAGE**: Create a message that:
   - Shows we understand THEIR business
   - Connects our solution to THEIR specific needs
   - Builds on previous communications (if any)
   - Moves toward: "${objective}"

## MESSAGE REQUIREMENTS
- Channel: ${channel} (${channelGuide})
- Tone: ${tone}
- Product focus: ${product || 'Best match from our offerings'}

Generate 4 variants with different approaches:
- **direct**: Clear value prop + specific ask
- **value**: Lead with insight about THEIR business challenge
- **curiosity**: Thought-provoking question about their situation  
- **relationship**: Connection-focused, softer approach

Return ONLY JSON (no markdown):
[
  {"variant": "direct", "content": "message", "matchReason": "why this offering fits their needs"},
  {"variant": "value", "content": "message", "matchReason": "why this offering fits"},
  {"variant": "curiosity", "content": "message", "matchReason": "why this offering fits"},
  {"variant": "relationship", "content": "message", "matchReason": "why this offering fits"}
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

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OutreachReady/1.0)' },
    });
    const html = await response.text();
    
    // Strip HTML tags and get clean text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
    
    return text;
  } catch (err) {
    console.error('Failed to fetch website:', err);
    return '';
  }
}

async function analyzeWithAI(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: 'Be concise and direct. No fluff.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 400,
  });
  return completion.choices[0]?.message?.content || '';
}
