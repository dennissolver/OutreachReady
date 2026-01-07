'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    company_website: '',
    products_url: '',
    product_description: '',
    linkedin_url: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setFormData({
        full_name: data.full_name || '',
        company_name: data.company_name || '',
        company_website: data.company_website || '',
        products_url: data.products_url || '',
        product_description: data.product_description || '',
        linkedin_url: data.linkedin_url || '',
      });
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update(formData)
      .eq('id', user.id);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your LinkedIn URL
            </label>
            <input
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>
        </div>
      </div>

      {/* Business/Products Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Your Business & Products</h2>
        <p className="text-gray-500 text-sm mb-4">
          This helps the AI understand what you're selling and match your offerings to contacts.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Corporate AI Solutions"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Website
            </label>
            <input
              type="url"
              value={formData.company_website}
              onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://corporate-ai-solutions.vercel.app"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Products/Services Page URL
            </label>
            <input
              type="url"
              value={formData.products_url}
              onChange={(e) => setFormData({ ...formData, products_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://corporate-ai-solutions.vercel.app/marketplace"
            />
            <p className="text-xs text-gray-500 mt-1">
              The AI will analyze this page to understand your product offerings
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product/Service Description
            </label>
            <textarea
              value={formData.product_description}
              onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Describe what you offer. E.g., 'AI-powered business automation tools including CRM, outreach automation, voice AI coaching, and custom integrations for enterprise clients.'"
            />
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Sign Out */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Sign Out</p>
            <p className="text-sm text-gray-500">Sign out of your account</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
