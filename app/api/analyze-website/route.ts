import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Fetch the website content
    let websiteContent = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OutreachReady/1.0)',
        },
      });
      const html = await response.text();
      
      // Extract text content (strip HTML tags)
      websiteContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000); // Limit content
    } catch (fetchError) {
      console.error('Failed to fetch website:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Could not fetch website. Check the URL.' },
        { status: 400 }
      );
    }

    // Use AI to analyze and extract
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You analyze business websites and extract product/service information. Return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: `Analyze this website content and extract:
1. Company name
2. What products or services they offer
3. A brief description of their business (2-3 sentences)
4. List of specific products/services (as array)

Website URL: ${url}

Website Content:
${websiteContent}

Return JSON format:
{
  "company_name": "...",
  "description": "...",
  "products": ["Product 1", "Product 2", ...],
  "target_audience": "..."
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    
    // Parse response
    let analysis;
    try {
      const cleaned = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        company_name: '',
        description: 'Could not analyze website',
        products: [],
        target_audience: '',
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error: any) {
    console.error('Website analysis error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
