'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Contact {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  company_website: string | null;
  linkedin_url: string | null;
  notes: string | null;
}

interface UserProfile {
  company_name: string | null;
  company_website: string | null;
  products_url: string | null;
  product_description: string | null;
}

export default function CoachPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [communications, setCommunications] = useState('');
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Coach inputs
  const [channel, setChannel] = useState('linkedin_dm');
  const [objective, setObjective] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [tone, setTone] = useState('professional');
  const [customProduct, setCustomProduct] = useState('');

  // Product options (will be dynamic based on user's product description)
  const [productOptions, setProductOptions] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [contactId]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Load contact
    const { data: contactData } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (!contactData) {
      router.push('/contacts');
      return;
    }
    setContact(contactData);

    // Load user profile (seller info)
    const { data: profileData } = await supabase
      .from('users')
      .select('company_name, company_website, products_url, product_description')
      .eq('id', user.id)
      .maybeSingle();

    setUserProfile(profileData);

    // Extract product options from description
    if (profileData?.product_description) {
      const products = extractProducts(profileData.product_description);
      setProductOptions(products);
    }

    // Load communications context
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

  // Simple product extraction from description
  const extractProducts = (description: string): string[] => {
    // Common product-related words to look for
    const keywords = ['including', 'such as', 'offers', 'provides', 'features'];
    let products: string[] = [];
    
    // Try to extract comma-separated items after keywords
    for (const keyword of keywords) {
      const idx = description.toLowerCase().indexOf(keyword);
      if (idx !== -1) {
        const after = description.substring(idx + keyword.length);
        const items = after.split(/[,.]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 50);
        products = [...products, ...items.slice(0, 5)];
      }
    }

    // Dedupe and clean
    products = [...new Set(products)].slice(0, 6);
    
    // If we couldn't extract, provide generic options
    if (products.length === 0) {
      products = ['General consultation', 'Custom solution', 'Partnership discussion'];
    }

    return products;
  };

  const generateMessages = async () => {
    if (!objective.trim()) {
      setError('Please describe your objective');
      return;
    }

    setIsGenerating(true);
    setError(null);

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
            website: contact?.company_website,
            linkedin: contact?.linkedin_url,
            notes: contact?.notes,
          },
          seller: {
            company: userProfile?.company_name,
            website: userProfile?.company_website,
            productsUrl: userProfile?.products_url,
            productDescription: userProfile?.product_description,
          },
          communications,
          channel,
          objective,
          product: selectedProduct || customProduct || 'General offering',
          tone,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        router.push(`/contacts/${contactId}/messages?session=${data.sessionId}`);
      } else {
        setError(data.error || 'Failed to generate messages');
        setIsGenerating(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate messages');
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

  const hasProductInfo = userProfile?.product_description || userProfile?.products_url;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href={`/contacts/${contactId}/communications`} className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to Communications
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI Outreach Coach</h1>
          <p className="text-gray-500 mt-1">Step 3 of 3: Generate Your Message</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">✓</div>
            <span className="ml-2 text-sm text-green-600">Contact</span>
          </div>
          <div className="flex-1 h-0.5 bg-green-500 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">✓</div>
            <span className="ml-2 text-sm text-green-600">Communications</span>
          </div>
          <div className="flex-1 h-0.5 bg-blue-600 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <span className="ml-2 text-sm font-medium text-blue-600">AI Coach</span>
          </div>
        </div>

        {/* Context Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">📊 What AI Knows</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">About {contact?.name}:</p>
              <ul className="text-gray-600 mt-1 space-y-0.5">
                <li>• {contact?.title || 'Unknown role'} at {contact?.company || 'Unknown company'}</li>
                <li>• Website: {contact?.company_website ? '✅ Provided' : '❌ Not set'}</li>
                <li>• Comms history: {communications ? '✅ ' + communications.length + ' chars' : '❌ None'}</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-700">About You ({userProfile?.company_name || 'Your Company'}):</p>
              <ul className="text-gray-600 mt-1 space-y-0.5">
                <li>• Products: {hasProductInfo ? '✅ Configured' : '❌ Not set'}</li>
                <li>• Website: {userProfile?.company_website ? '✅ Set' : '❌ Not set'}</li>
              </ul>
              {!hasProductInfo && (
                <Link href="/settings" className="text-blue-600 text-xs hover:underline">
                  Add your products →
                </Link>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📱 Which channel are you using?
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="linkedin_dm">LinkedIn Direct Message</option>
              <option value="linkedin_comment">LinkedIn Comment / Reply to Post</option>
              <option value="linkedin_connection">LinkedIn Connection Request</option>
              <option value="email">Email</option>
              <option value="email_followup">Email Follow-up</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          {/* Product Selection */}
          {productOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎯 Which product/service relates to this outreach?
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select a product/service...</option>
                {productOptions.map((product, idx) => (
                  <option key={idx} value={product}>{product}</option>
                ))}
                <option value="custom">Other (specify below)</option>
              </select>
              {selectedProduct === 'custom' && (
                <input
                  type="text"
                  value={customProduct}
                  onChange={(e) => setCustomProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                  placeholder="Describe the product/service..."
                />
              )}
            </div>
          )}

          {/* Objective */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 What's your objective? *
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="E.g., 'Get a discovery call scheduled', 'Re-engage after they went quiet', 'Follow up on the demo we did', 'Introduce our new AI tool'"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎭 What tone should the message have?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['professional', 'friendly', 'casual', 'formal', 'persuasive', 'curious'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`px-3 py-2 rounded-md text-sm capitalize ${
                    tone === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-8 pt-6 border-t">
          <button
            onClick={generateMessages}
            disabled={isGenerating || !objective.trim()}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-medium text-lg"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI is crafting your messages...
              </span>
            ) : (
              '✨ Generate Message Options'
            )}
          </button>
          <p className="text-center text-sm text-gray-500 mt-2">
            AI will create 4 different message variants for you to choose from
          </p>
        </div>
      </div>
    </div>
  );
}
