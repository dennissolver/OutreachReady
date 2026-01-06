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
}

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
      .single();

    if (!contactData) {
      router.push('/contacts');
      return;
    }
    setContact(contactData);

    // Load generated messages for this session
    const { data: messagesData } = await supabase
      .from('generated_messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(5);

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

    // Log as communication
    await supabase.from('communications').insert({
      contact_id: contactId,
      user_id: user.id,
      channel: selectedMessage.channel,
      direction: 'outbound',
      content: selectedMessage.content,
    });

    // Update last contact date
    await supabase
      .from('contacts')
      .update({ last_contact_date: new Date().toISOString() })
      .eq('id', contactId);

    router.push(`/contacts/${contactId}`);
  };

  const regenerate = () => {
    router.push(`/contacts/${contactId}/coach`);
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
        <Link 
          href={`/contacts/${contactId}/coach`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Voice Coach
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Messages for {contact?.name}
          </h1>
          <p className="text-gray-500 mt-1">
            Select the message that fits best, copy it, and send via your channel
          </p>
        </div>

        {/* Success Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 font-medium">
              {messages.length} message options generated!
            </span>
          </div>
        </div>

        {/* Message Options */}
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={message.id}
              className={`border rounded-lg p-4 transition-all cursor-pointer ${
                selectedId === message.id 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedId(message.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    Option {index + 1}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                    {message.tone}
                  </span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full capitalize">
                    {message.channel?.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(message);
                  }}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    copiedId === message.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {copiedId === message.id ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>

              {selectedId === message.id && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-sm text-blue-700">
                    ✓ Selected - Copy this message and send it to {contact?.name}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No messages generated yet.</p>
            <button
              onClick={regenerate}
              className="mt-2 text-blue-600 hover:underline"
            >
              Go back and generate messages
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 pt-6 border-t flex justify-between items-center">
          <button
            onClick={regenerate}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ← Regenerate
          </button>

          <div className="flex gap-3">
            <Link
              href={`/contacts/${contactId}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              View Contact
            </Link>
            {selectedId && (
              <button
                onClick={markAsSent}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Mark as Sent ✓
              </button>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">💡 Tips</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Feel free to edit the message before sending</li>
            <li>• Personalize with specific details you know about them</li>
            <li>• "Mark as Sent" logs this in your communication history</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
