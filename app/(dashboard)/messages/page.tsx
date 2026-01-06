'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Contact {
  id: string;
  name: string;
  company: string | null;
  funnel_stage: string;
}

interface GeneratedMessage {
  id: string;
  contact_id: string;
  channel: string;
  content: string;
  tone: string;
  created_at: string;
  contacts?: Contact;
}

const CHANNELS = ['linkedin', 'email', 'whatsapp', 'twitter'];
const TONES = ['professional', 'friendly', 'casual', 'formal', 'persuasive'];

export default function MessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [channel, setChannel] = useState('linkedin');
  const [tone, setTone] = useState('professional');
  const [context, setContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    
    // Load contacts
    const { data: contactsData } = await supabase
      .from('contacts')
      .select('id, name, company, funnel_stage')
      .order('name');
    
    // Load recent messages
    const { data: messagesData } = await supabase
      .from('generated_messages')
      .select('*, contacts(id, name, company)')
      .order('created_at', { ascending: false })
      .limit(20);

    setContacts(contactsData || []);
    setMessages(messagesData || []);
    setLoading(false);
  };

  const generateMessage = async () => {
    if (!selectedContact) {
      alert('Please select a contact');
      return;
    }

    setGenerating(true);
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact,
          channel,
          tone,
          context,
        }),
      });

      const data = await response.json();
      
      if (data.message) {
        setGeneratedContent(data.message);
        loadData(); // Refresh messages list
      } else {
        alert('Failed to generate message');
      }
    } catch (error) {
      console.error('Error generating message:', error);
      alert('Failed to generate message');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Message Generator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generator Panel */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Generate New Message</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact *
              </label>
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select a contact...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} {contact.company && `(${contact.company})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context / Purpose
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="What's the goal of this message? Any specific points to mention?"
              />
            </div>

            <button
              onClick={generateMessage}
              disabled={generating || !selectedContact}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Message'}
            </button>
          </div>

          {generatedContent && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Generated Message</h3>
                <button
                  onClick={() => copyToClipboard(generatedContent)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Copy
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{generatedContent}</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Messages</h2>
          
          {messages.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Link 
                        href={`/contacts/${msg.contact_id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {(msg.contacts as any)?.name || 'Unknown'}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {msg.channel} • {msg.tone} • {new Date(msg.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(msg.content)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">{msg.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No messages generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
