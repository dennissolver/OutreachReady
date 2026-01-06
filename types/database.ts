export type ContactType = 'warm' | 'cold';
export type RelationshipGoal = 'client' | 'partner' | 'investor' | 'collaborator' | 'referrer' | 'advisor' | 'network';
export type FunnelStage = 'cold' | 'aware' | 'engaged' | 'interested' | 'evaluating' | 'converted' | 'nurture';
export type MessageObjective = 'first_touch' | 'follow_up' | 'value_add' | 'pitch' | 'advance' | 'close' | 'maintain' | 'reactivate' | 'thank';
export type CommunicationChannel = 'linkedin_dm' | 'linkedin_inmail' | 'email' | 'whatsapp' | 'phone' | 'in_person' | 'other';
export type CommunicationDirection = 'inbound' | 'outbound';
export type MessageStatus = 'draft' | 'approved' | 'sent' | 'response_received';
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  contact_type: ContactType;
  relationship_goal: RelationshipGoal;
  funnel_stage: FunnelStage;
  linkedin_url: string | null;
  linkedin_data: Record<string, any>;
  discovery_source: string | null;
  discovery_details: string | null;
  ai_persona: Record<string, any>;
  matched_services: any[];
  last_contact_date: string | null;
  next_action_date: string | null;
  next_action_description: string | null;
  total_touchpoints: number;
  notes: string | null;
  tags: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Communication {
  id: string;
  contact_id: string;
  user_id: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  content: string;
  sent_at: string;
  objective_at_time: MessageObjective | null;
}

export interface GeneratedMessage {
  id: string;
  contact_id: string;
  user_id: string;
  objective: MessageObjective;
  desired_next_step: string | null;
  target_channel: CommunicationChannel;
  draft_content: string;
  final_content: string | null;
  status: MessageStatus;
  created_at: string;
}

export interface MarketplaceService {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

export interface CreateContactRequest {
  name: string;
  contact_type: ContactType;
  relationship_goal: RelationshipGoal;
  linkedin_url?: string;
  email?: string;
  company?: string;
  title?: string;
  discovery_source?: string;
  discovery_details?: string;
}

export interface GenerateMessageRequest {
  contact_id: string;
  objective: MessageObjective;
  desired_next_step?: string;
  target_channel: CommunicationChannel;
  services_to_mention?: string[];
}

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  cold: 'Cold', aware: 'Aware', engaged: 'Engaged', interested: 'Interested',
  evaluating: 'Evaluating', converted: 'Converted', nurture: 'Nurture'
};

export const RELATIONSHIP_GOAL_LABELS: Record<RelationshipGoal, string> = {
  client: 'Client', partner: 'Partner', investor: 'Investor', collaborator: 'Collaborator',
  referrer: 'Referrer', advisor: 'Advisor', network: 'Network'
};

export const MESSAGE_OBJECTIVE_LABELS: Record<MessageObjective, string> = {
  first_touch: 'First Touch', follow_up: 'Follow Up', value_add: 'Value Add', pitch: 'Pitch',
  advance: 'Advance', close: 'Close', maintain: 'Maintain', reactivate: 'Reactivate', thank: 'Thank'
};
