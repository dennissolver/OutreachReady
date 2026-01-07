'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
    company_website: '',
    linkedin_url: '',
    company_description: '',
    notes: '',
  });

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (error || !data) {
      router.push('/contacts');
      return;
    }

    setFormData({
      name: data.name || '',
      email: data.email || '',
      company: data.company || '',
      title: data.title || '',
      company_website: data.company_website || '',
      linkedin_url: data.linkedin_url || '',
      company_description: data.company_description || '',
      notes: data.notes || '',
    });
    setLoading(false);
  };

  const analyzeWebsite = async () => {
    if (!formData.company_website) {
      setError('Please enter a company website first');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.company_website }),
      });

      const data = await response.json();

      if (data.success && data.analysis) {
        const { company_name, description, products, target_audience } = data.analysis;
        
        let companyDesc = description || '';
        if (products && products.length > 0) {
          companyDesc += `\n\nProducts/Services: ${products.join(', ')}`;
        }
        if (target_audience) {
          companyDesc += `\n\nTarget audience: ${target_audience}`;
        }

        setFormData(prev => ({
          ...prev,
          company: prev.company || company_name || '',
          company_description: companyDesc.trim(),
        }));

        setMessage('✨ Website analyzed! Business info extracted.');
      } else {
        setError(data.error || 'Could not analyze website');
      }
    } catch (err: any) {
      setError('Analysis failed: ' + err.message);
    }

    setAnalyzing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('contacts')
        .update(formData)
        .eq('id', contactId);

      if (updateError) throw updateError;
      
      router.push(`/contacts/${contactId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update contact');
      setSaving(false);
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/contacts/${contactId}`} className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to Contact
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Contact</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Website
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.company_website}
                onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="https://theircompany.com"
              />
              <button
                type="button"
                onClick={analyzeWebsite}
                disabled={analyzing || !formData.company_website}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
              >
                {analyzing ? '...' : '🔍 Analyze'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              AI will extract their business info to help match your offerings
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="https://linkedin.com/in/theirprofile"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Description
              <span className="text-gray-400 font-normal ml-2">(AI-extracted or manual)</span>
            </label>
            <textarea
              value={formData.company_description}
              onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="What does their company do? What problems do they solve?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="How do you know them? Any context..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link
              href={`/contacts/${contactId}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
