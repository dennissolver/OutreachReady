'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Contact {
  id: string;
  name: string;
  company: string | null;
}

export default function CommunicationsPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [communications, setCommunications] = useState('');

  useEffect(() => {
    loadData();
  }, [contactId]);

  const loadData = async () => {
    const supabase = createClient();
    
    // Load contact
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, company')
      .eq('id', contactId)
      .maybeSingle();

    if (contactError || !contactData) {
      console.error('Contact not found:', contactError);
      router.push('/contacts');
      return;
    }
    setContact(contactData);
    
    // Load existing communications context (if any)
    const { data: commData } = await supabase
      .from('communications')
      .select('content')
      .eq('contact_id', contactId)
      .eq('direction', 'context')
      .order('created_at', { ascending: false })
      .limit(1);

    if (commData && commData.length > 0) {
      setCommunications(commData[0].content || '');
    }
    
    setLoading(false);
  };

  const handleContinue = async () => {
    setSaving(true);
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Save communications as context (insert new, don't upsert)
    if (communications.trim()) {
      // First delete any existing context for this contact
      await supabase
        .from('communications')
        .delete()
        .eq('contact_id', contactId)
        .eq('direction', 'context');

      // Then insert new context
      const { error } = await supabase
        .from('communications')
        .insert({
          contact_id: contactId,
          user_id: user.id,
          channel: 'context',
          direction: 'context',
          content: communications,
        });

      if (error) {
        console.error('Failed to save communications:', error);
      }
    }

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
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/contacts" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to Contacts
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Communications with {contact?.name}
          </h1>
          <p className="text-gray-500 mt-1">Step 2 of 3: Share Your Conversation History</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">✓</div>
            <span className="ml-2 text-sm text-green-600">Contact</span>
          </div>
          <div className="flex-1 h-0.5 bg-green-500 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
            <span className="ml-2 text-sm font-medium text-blue-600">Communications</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm">3</div>
            <span className="ml-2 text-sm text-gray-500">AI Coach</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">📋 Why share your communications?</h3>
            <p className="text-blue-800 text-sm">
              The AI will analyze your conversation history with {contact?.name} to:
            </p>
            <ul className="text-blue-800 text-sm mt-2 space-y-1 ml-4 list-disc">
              <li>Understand where you are in the relationship</li>
              <li>Identify their needs and interests</li>
              <li>Match your products/services to their situation</li>
              <li>Craft the perfect next message</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste your recent communications
            </label>
            <textarea
              value={communications}
              onChange={(e) => setCommunications(e.target.value)}
              rows={14}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder={`Paste any communications you've had with ${contact?.name}. For example:

---
LinkedIn DM - Jan 3, 2026
Me: Hi ${contact?.name}, loved your recent post about digital transformation...
${contact?.name}: Thanks! Yes, we've been exploring AI solutions at ${contact?.company}...
Me: That's interesting - we actually help companies with exactly that...

---
Email - Dec 28, 2025
Subject: Following up on our conversation
Hi ${contact?.name}, great connecting at the conference...

---
Just paste everything as-is. The AI will understand the context.`}
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => router.push(`/contacts/${contactId}/coach`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Skip for now
            </button>
            <button
              onClick={handleContinue}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Next: AI Coach →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
