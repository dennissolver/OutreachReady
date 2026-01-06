import OpenAI from 'openai';
import type { Contact, MessageObjective, CommunicationChannel, Communication, MarketplaceService } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GenerateMessageParams {
  contact: Contact;
  objective: MessageObjective;
  desired_next_step?: string;
  target_channel: CommunicationChannel;
  services_to_mention?: MarketplaceService[];
  recent_communications?: Communication[];
  additional_context?: string;
}

const OBJECTIVE_PROMPTS: Record<MessageObjective, string> = {
  first_touch: 'This is our first contact. Keep it warm, personalized, and non-salesy.',
  follow_up: 'Following up on a previous message that got no response. Be brief, add value.',
  value_add: 'Share something genuinely useful without asking for anything.',
  pitch: 'Present a specific service or idea. Lead with value, include soft CTA.',
  advance: 'Move the relationship forward. Goal is to get to the next stage.',
  close: 'Ask for the commitment. Be direct but not pushy.',
  maintain: 'Keep the relationship warm. Check in genuinely.',
  reactivate: 'Re-engage after silence. Acknowledge the gap, add value.',
  thank: 'Express genuine gratitude. Reinforce the relationship.'
};

export async function generateMessage(params: GenerateMessageParams) {
  const { contact, objective, desired_next_step, target_channel, services_to_mention, recent_communications } = params;
  
  const systemPrompt = `You are an expert outreach copywriter. Write personalized, authentic messages.`;
  
  const userPrompt = `Write an outreach message:
RECIPIENT: ${contact.name}${contact.title ? `, ${contact.title}` : ''}${contact.company ? ` at ${contact.company}` : ''}
STAGE: ${contact.funnel_stage} | GOAL: ${contact.relationship_goal}
OBJECTIVE: ${objective} - ${OBJECTIVE_PROMPTS[objective]}
${desired_next_step ? `DESIRED OUTCOME: ${desired_next_step}` : ''}
CHANNEL: ${target_channel}
${services_to_mention?.length ? `SERVICES: ${services_to_mention.map(s => s.name).join(', ')}` : ''}

Write the message now. Only output the message content.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  return {
    content: response.choices[0]?.message?.content?.trim() || '',
    prompt_used: userPrompt,
    tokens_used: response.usage?.total_tokens || 0
  };
}
