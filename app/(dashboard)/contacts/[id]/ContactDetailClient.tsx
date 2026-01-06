'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  company: string | null;
  title: string | null;
  funnel_stage: string;
  relationship_goal: string;
  preferred_channel: string;
  notes: string | null;
  created_at: string;
  last_contact_date: string | null;
}

interface Communication {
  id: string;
  channel: string;
  direction: string;
  content: string;
  created_at: string;
}

interface GeneratedMessage {
  id: string;
  channel: string;
  content: string;
  tone: string;
  created_at: string;
}

interface Props {
  contact: Contact;
  communications: Communication[];
  generatedMessages: GeneratedMessage[];
}

const STAGE_COLORS: Record<string, string> = {
  stranger: 'bg-gray-100 text-gray-700',
  aware: 'bg-blue-100 text-blue-700',
  engaged: 'bg-yellow-100 text-yellow-700',
  prospect: 'bg-purple-100 text-purple-700',
  client: 'bg-green-100 text-green-700',
  advocate: 'bg-pink-100 text-pink-700',
};

export default function ContactDetailClient({ contact, communications, generatedMessages }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contact.id);

    if (!error) {
      router.push('/contacts');
    } else {
      setIsDeleting(false);
      alert('Failed to delete contact');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/contacts"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Contacts
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/contacts/${contact.id}/edit`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Contact?</h3>
            <p className="text-gray-600 mb-4">
              This will permanently delete {contact.name} and all associated data.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Header Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
            {contact.title && contact.company && (
              <p className="text-gray-600 mt-1">{contact.title} at {contact.company}</p>
            )}
            {contact.email && (
              <p className="text-gray-500 text-sm mt-1">{contact.email}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STAGE_COLORS[contact.funnel_stage] || STAGE_COLORS.stranger}`}>
            {contact.funnel_stage}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-xs text-gray-500 uppercase">Goal</p>
            <p className="font-medium">{contact.relationship_goal?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Channel</p>
            <p className="font-medium capitalize">{contact.preferred_channel}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Last Contact</p>
            <p className="font-medium">
              {contact.last_contact_date 
                ? new Date(contact.last_contact_date).toLocaleDateString() 
                : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Added</p>
            <p className="font-medium">
              {new Date(contact.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {contact.linkedin_url && (
          <div className="mt-4">
            <a 
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View LinkedIn Profile →
            </a>
          </div>
        )}

        {contact.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 uppercase mb-2">Notes</p>
            <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link
          href={`/messages?contact=${contact.id}`}
          className="bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          Generate Message
        </Link>
        <Link
          href={`/journeys?contact=${contact.id}`}
          className="bg-white border text-center py-3 rounded-lg hover:bg-gray-50 font-medium"
        >
          Plan Journey
        </Link>
        <button
          className="bg-white border text-center py-3 rounded-lg hover:bg-gray-50 font-medium"
        >
          Start Voice Coach
        </button>
      </div>

      {/* Communication History */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Communication History</h2>
        {communications.length > 0 ? (
          <div className="space-y-4">
            {communications.map((comm) => (
              <div key={comm.id} className="border-l-2 border-gray-200 pl-4 py-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="capitalize">{comm.channel}</span>
                  <span>•</span>
                  <span>{comm.direction === 'outbound' ? 'Sent' : 'Received'}</span>
                  <span>•</span>
                  <span>{new Date(comm.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-gray-700">{comm.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No communications logged yet.</p>
        )}
      </div>

      {/* Generated Messages */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Generated Messages</h2>
        {generatedMessages.length > 0 ? (
          <div className="space-y-4">
            {generatedMessages.map((msg) => (
              <div key={msg.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span className="capitalize">{msg.channel}</span>
                  <span>•</span>
                  <span className="capitalize">{msg.tone} tone</span>
                  <span>•</span>
                  <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                <button 
                  onClick={() => navigator.clipboard.writeText(msg.content)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Copy to clipboard
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No messages generated yet.</p>
        )}
      </div>
    </div>
  );
}
