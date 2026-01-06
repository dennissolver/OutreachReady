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
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, company')
      .eq('id', contactId)
      .single();

    if (error || !data) {
      router.push('/contacts');
      return;
    }

    setContact(data);
    
    // Load existing communications if any
    const { data: commData } = await supabase
      .from('communications')
      .select('content')
      .eq('contact_id', contactId)
      .eq('direction', 'context')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (commData) {
      setCommunications(commData.content);
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

    // Save communications as context
    if (communications.trim()) {
      await supabase
        .from('communications')
        .upsert({
          contact_id: contactId,
          user_id: user.id,
          channel: 'context',
          direction: 'context',
          content: communications,
        }, {
          onConflict: 'contact_id,direction',
        });
    }

    // Navigate to Voice Coach
    router.push(`/contacts/${contactId}/coach`);
  };

  const handleSkip = () => {
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
        <Link 
          href="/contacts"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Contacts
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Communications with {contact?.name}
          </h1>
          <p className="text-gray-500 mt-1">Step 2 of 3: Share Recent Communications</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            </div>
            <span className="ml-2 text-sm text-green-600">Contact Info</span>
          </div>
          <div className="flex-1 h-0.5 bg-blue-600 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
            <span className="ml-2 text-sm font-medium text-blue-600">Communications</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <span className="ml-2 text-sm text-gray-500">Voice Coach</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Why share communications?</h3>
            <p className="text-blue-800 text-sm">
              Paste your recent emails, LinkedIn messages, WhatsApp chats, or any other 
              communications with {contact?.name}. This helps the Voice Coach understand 
              your relationship and craft the perfect next message.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recent Communications
            </label>
            <textarea
              value={communications}
              onChange={(e) => setCommunications(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder={`Paste your communications here. For example:

---
LinkedIn DM - Jan 3, 2026
Me: Hi John, loved your recent post about AI in sales...
John: Thanks! Yes, we've been exploring that at Acme...

---
Email - Dec 28, 2025
Subject: Following up on our chat
Hi John, great meeting you at the conference...

---
Just paste everything - no need to format perfectly. The Voice Coach will understand.`}
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Skip for now
            </button>
            <button
              onClick={handleContinue}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Next: Voice Coach →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
