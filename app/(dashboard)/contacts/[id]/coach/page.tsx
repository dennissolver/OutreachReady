'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Contact {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  notes: string | null;
}

interface SessionData {
  channel: string | null;
  objective: string | null;
  tone: string | null;
  additionalContext: string | null;
}

export default function VoiceCoachPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [communications, setCommunications] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData>({
    channel: null,
    objective: null,
    tone: null,
    additionalContext: null,
  });

  // For manual input fallback (when voice isn't used)
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState({
    channel: 'linkedin_dm',
    objective: '',
    tone: 'professional',
  });

  useEffect(() => {
    loadData();
  }, [contactId]);

  const loadData = async () => {
    const supabase = createClient();
    
    // Load contact
    const { data: contactData } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (!contactData) {
      router.push('/contacts');
      return;
    }
    setContact(contactData);

    // Load communications context
    const { data: commData } = await supabase
      .from('communications')
      .select('content')
      .eq('contact_id', contactId)
      .eq('direction', 'context')
      .single();

    if (commData) {
      setCommunications(commData.content);
    }

    setLoading(false);
  };


const startVoiceSession = async () => {
    // Voice integration coming soon - use manual mode for now
    setManualMode(true);
  };
  const endVoiceSession = async () => {
    const conversation = (window as any).elevenLabsConversation;
    if (conversation) {
      await conversation.endSession();
    }
    setIsSessionActive(false);
  };

  const generateMessages = async () => {
    setIsGenerating(true);
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Use manual input or session data
    const inputData = manualMode ? manualInput : sessionData;

    try {
      const response = await fetch('/api/generate-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          contact: {
            name: contact?.name,
            company: contact?.company,
            title: contact?.title,
          },
          communications,
          channel: inputData.channel || manualInput.channel,
          objective: inputData.objective || manualInput.objective,
          tone: inputData.tone || manualInput.tone,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Navigate to messages selection page
        router.push(`/contacts/${contactId}/messages?session=${data.sessionId}`);
      } else {
        alert('Failed to generate messages: ' + (data.error || 'Unknown error'));
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error generating messages:', error);
      alert('Failed to generate messages');
      setIsGenerating(false);
    }
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
          href={`/contacts/${contactId}/communications`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Communications
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Voice Coach for {contact?.name}
          </h1>
          <p className="text-gray-500 mt-1">Step 3 of 3: Define Your Message Strategy</p>
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
          <div className="flex-1 h-0.5 bg-green-500 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            </div>
            <span className="ml-2 text-sm text-green-600">Communications</span>
          </div>
          <div className="flex-1 h-0.5 bg-blue-600 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <span className="ml-2 text-sm font-medium text-blue-600">Voice Coach</span>
          </div>
        </div>

        {/* Contact Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Contact Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Name:</span> {contact?.name}</div>
            <div><span className="text-gray-500">Company:</span> {contact?.company || 'N/A'}</div>
            <div><span className="text-gray-500">Title:</span> {contact?.title || 'N/A'}</div>
            <div><span className="text-gray-500">Comms:</span> {communications ? 'Provided' : 'None'}</div>
          </div>
        </div>

        {/* Voice Session or Manual Input */}
        {!manualMode ? (
          <div className="space-y-6">
            {/* Voice Coach Widget */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 text-center">
              {!isSessionActive ? (
                <>
                  <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Talk Strategy?</h3>
                  <p className="text-gray-600 mb-6">
                    Start a voice conversation with your AI coach. Discuss the channel, 
                    objective, and tone for your message to {contact?.name}.
                  </p>
                  <button
                    onClick={startVoiceSession}
                    className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium text-lg"
                  >
                    Start Voice Session
                  </button>
                  <p className="mt-4 text-sm text-gray-500">
                    Or <button onClick={() => setManualMode(true)} className="text-blue-600 hover:underline">use text input instead</button>
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Listening...</h3>
                  <p className="text-gray-600 mb-6">
                    Tell me about the message you want to send. What channel? What's your objective?
                  </p>
                  <button
                    onClick={endVoiceSession}
                    className="px-8 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 font-medium"
                  >
                    End Session
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Manual Input Mode */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Message Strategy</h3>
              <button 
                onClick={() => setManualMode(false)}
                className="text-sm text-blue-600 hover:underline"
              >
                Switch to Voice
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channel *
              </label>
              <select
                value={manualInput.channel}
                onChange={(e) => setManualInput({ ...manualInput, channel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="linkedin_dm">LinkedIn Direct Message</option>
                <option value="linkedin_comment">LinkedIn Comment/Reply</option>
                <option value="linkedin_connection">LinkedIn Connection Request</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="twitter_dm">Twitter/X DM</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objective *
              </label>
              <textarea
                value={manualInput.objective}
                onChange={(e) => setManualInput({ ...manualInput, objective: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="What do you want to achieve? e.g., 'Schedule a discovery call', 'Re-engage after going quiet', 'Follow up on proposal'"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <select
                value={manualInput.tone}
                onChange={(e) => setManualInput({ ...manualInput, tone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="persuasive">Persuasive</option>
                <option value="empathetic">Empathetic</option>
              </select>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-8 pt-6 border-t">
          <button
            onClick={generateMessages}
            disabled={isGenerating || (!manualMode && isSessionActive) || (manualMode && !manualInput.objective)}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-lg"
          >
            {isGenerating ? 'Generating Messages...' : 'Generate Message Options'}
          </button>
        </div>
      </div>
    </div>
  );
}
