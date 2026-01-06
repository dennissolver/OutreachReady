'use client';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Building2, Calendar, ArrowRight } from 'lucide-react';
import type { Contact } from '@/types';
import { FUNNEL_STAGE_LABELS, RELATIONSHIP_GOAL_LABELS } from '@/types';

export default function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Link href={`/contacts/${contact.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-primary-300 transition cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{contact.name}</h3>
            {contact.company && <div className="flex items-center gap-1 text-sm text-gray-500"><Building2 className="h-3 w-3" /><span>{contact.title ? `${contact.title} at ` : ''}{contact.company}</span></div>}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium goal-${contact.relationship_goal}`}>{RELATIONSHIP_GOAL_LABELS[contact.relationship_goal]}</span>
        </div>
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium stage-${contact.funnel_stage}`}>{FUNNEL_STAGE_LABELS[contact.funnel_stage]}</span>
            <span className="text-xs text-gray-400">{contact.total_touchpoints} touchpoints</span>
          </div>
          <div className="flex gap-1">
            {['cold', 'aware', 'engaged', 'interested', 'evaluating', 'converted', 'nurture'].map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= ['cold', 'aware', 'engaged', 'interested', 'evaluating', 'converted', 'nurture'].indexOf(contact.funnel_stage) ? 'bg-primary-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
        {contact.last_contact_date && <div className="flex items-center gap-1 text-xs text-gray-500 mb-2"><Calendar className="h-3 w-3" /><span>Last contact {formatDistanceToNow(new Date(contact.last_contact_date), { addSuffix: true })}</span></div>}
        {contact.next_action_date && <div className="bg-amber-50 rounded-lg p-2 text-xs"><span className="text-amber-800 font-medium">Follow up {formatDistanceToNow(new Date(contact.next_action_date), { addSuffix: true })}</span></div>}
        <div className="flex justify-end mt-3"><ArrowRight className="h-4 w-4 text-gray-400" /></div>
      </div>
    </Link>
  );
}
