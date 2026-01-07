'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Contact {
  id: string;
  name: string;
  company: string | null;
}

interface GeneratedMessage {
  id: string;
  content: string;
  variant: string;
  tone: string;
  channel: string;
  product_pitched: string | null;
}

const VARIANT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  direct: { label: 'Direct', icon: '🎯', color: 'bg-red-100 text-red-700' },
  value: { label: 'Value-First', icon: '💎', color: 'bg-green-100 text-green-700' },
  curiosity: { label: 'Curiosity', icon: '🤔', color: 'bg-yellow-100 text-yellow-700' },
  relationship: { label: 'Relationship', icon: '🤝', color: 'bg-blue-100 text-blue-700' },
};

export default function MessagesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const contactId = params.id as string;
  const sessionId = searchParams.get('session');
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [contactId, sessionId]);

  const loadData = async () => {
    const supabase = createClient();
    
    // Load contact
    const { data: contactData } = await supabase
      .from('contacts')
      .select('id, name, company')
      .eq('id', contactId)
      .maybeSingle();

    if (!contactData) {
      router.push('/contacts');
      return;
    }
    setContact(contactData);

    // Load generated messages
    let query = supabase
      .from('generated_messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      query = query.limit(4);
    }

    const { data: messagesData } = await query;
    setMessages(messagesData || []);
    setLoading(false);
  };

  const copyToClipboard = async (message: GeneratedMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      setSelectedId(message.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const markAsSent = async () => {
    if (!selectedId) return;
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const selectedMessage = messages.find(m => m.id === selectedId);
    if (!selectedMessage) return;

    // Log as sent communication
    await supabase.from('communications').insert({
      contact_id: contactId,
      user_id: user.id,
      channel: selectedMessage.channel,
      direction: 'outbound',
      content: selectedMessage.content,
    });

    // Update contact's last contact date
    await supabase
      .from('contacts')
      .update({ last_contact_date: new Date().toISOString() })
      .eq('id', contactId);

    router.push(`/contacts/${contactId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href={`/contacts/${contactId}/coach`} className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to AI Coach
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Messages for {contact?.name}
          </h1>
          <p className="text-gray-500 mt-1">
            {messages.length > 0 
              ? `Select the best message, copy it, and send to ${contact?.name}`
              : 'No messages generated yet'}
          </p>
        </div>

        {messages.length > 0 ? (
          <>
            {/* Success indicator */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
              <span className="text-2xl mr-3">✨</span>
              <div>
                <p className="font-medium text-green-800">{messages.length} message options ready!</p>
                <p className="text-sm text-green-700">Each takes a different approach - pick what feels right</p>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              {messages.map((message) => {
                const variant = VARIANT_LABELS[message.variant] || VARIANT_LABELS.direct;
                const isSelected = selectedId === message.id;
                
                return (
                  <div 
                    key={message.id}
                    onClick={() => setSelectedId(message.id)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${variant.color}`}>
                          {variant.icon} {variant.label}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {message.channel?.replace('_', ' ')}
                        </span>
                        {message.product_pitched && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-xs">
                            {message.product_pitched}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(message);
                        }}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                          copiedId === message.id
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {copiedId === message.id ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>

                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between">
                        <p className="text-sm text-blue-700">
                          ✓ Selected
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsSent();
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                        >
                          Mark as Sent
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="mt-8 pt-6 border-t flex justify-between items-center">
              <Link
                href={`/contacts/${contactId}/coach`}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                ← Regenerate
              </Link>

              <Link
                href={`/contacts/${contactId}`}
                className="px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                View Contact →
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No messages generated yet.</p>
            <Link
              href={`/contacts/${contactId}/coach`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Go to AI Coach to generate messages →
            </Link>
          </div>
        )}

        {/* Tips */}
        {messages.length > 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">💡 Pro Tips</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Feel free to edit before sending - add personal touches</li>
              <li>• The "Value-First" approach often gets best response rates</li>
              <li>• "Mark as Sent" logs this to your communication history</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
