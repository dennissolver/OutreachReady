'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Contact {
  id: string;
  name: string;
  company: string | null;
  funnel_stage: string;
  relationship_goal: string;
}

interface JourneyPlan {
  id: string;
  contact_id: string;
  title: string;
  description: string | null;
  target_stage: string;
  steps: any[];
  status: string;
  created_at: string;
  contacts?: Contact;
}

const FUNNEL_STAGES = ['stranger', 'aware', 'engaged', 'prospect', 'client', 'advocate'];

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<JourneyPlan[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [newJourney, setNewJourney] = useState({
    contact_id: '',
    title: '',
    target_stage: 'client',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    
    const { data: journeysData } = await supabase
      .from('journey_plans')
      .select('*, contacts(id, name, company, funnel_stage)')
      .order('created_at', { ascending: false });

    const { data: contactsData } = await supabase
      .from('contacts')
      .select('id, name, company, funnel_stage, relationship_goal')
      .order('name');

    setJourneys(journeysData || []);
    setContacts(contactsData || []);
    setLoading(false);
  };

  const createJourney = async () => {
    if (!newJourney.contact_id || !newJourney.title) {
      alert('Please fill in required fields');
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Generate basic steps based on current → target stage
    const contact = contacts.find(c => c.id === newJourney.contact_id);
    const currentIndex = FUNNEL_STAGES.indexOf(contact?.funnel_stage || 'stranger');
    const targetIndex = FUNNEL_STAGES.indexOf(newJourney.target_stage);
    
    const steps = [];
    for (let i = currentIndex; i < targetIndex; i++) {
      steps.push({
        from_stage: FUNNEL_STAGES[i],
        to_stage: FUNNEL_STAGES[i + 1],
        action: `Move from ${FUNNEL_STAGES[i]} to ${FUNNEL_STAGES[i + 1]}`,
        completed: false,
      });
    }

    const { error } = await supabase
      .from('journey_plans')
      .insert({
        ...newJourney,
        user_id: user.id,
        steps,
        status: 'active',
      });

    if (!error) {
      setShowCreateModal(false);
      setNewJourney({ contact_id: '', title: '', target_stage: 'client', description: '' });
      loadData();
    } else {
      alert('Failed to create journey');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
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
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Journey Plans</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Journey
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Create Journey Plan</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact *
                </label>
                <select
                  value={newJourney.contact_id}
                  onChange={(e) => setNewJourney({ ...newJourney, contact_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.funnel_stage})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Journey Title *
                </label>
                <input
                  type="text"
                  value={newJourney.title}
                  onChange={(e) => setNewJourney({ ...newJourney, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Convert to Consulting Client"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Stage
                </label>
                <select
                  value={newJourney.target_stage}
                  onChange={(e) => setNewJourney({ ...newJourney, target_stage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {FUNNEL_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newJourney.description}
                  onChange={(e) => setNewJourney({ ...newJourney, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="What's the strategy for this journey?"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={createJourney}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Journey
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Journeys List */}
      {journeys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {journeys.map((journey) => (
            <div key={journey.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{journey.title}</h3>
                  <Link 
                    href={`/contacts/${journey.contact_id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {(journey.contacts as any)?.name}
                  </Link>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(journey.status)}`}>
                  {journey.status}
                </span>
              </div>

              {journey.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{journey.description}</p>
              )}

              <div className="text-sm text-gray-500 mb-3">
                Target: <span className="font-medium capitalize">{journey.target_stage}</span>
              </div>

              {/* Progress Steps */}
              <div className="space-y-2">
                {(journey.steps || []).slice(0, 3).map((step: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                      {step.completed && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                    <span className={step.completed ? 'line-through text-gray-400' : ''}>
                      {step.action}
                    </span>
                  </div>
                ))}
                {(journey.steps || []).length > 3 && (
                  <p className="text-xs text-gray-400">+{journey.steps.length - 3} more steps</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t text-xs text-gray-500">
                Created {new Date(journey.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 mb-4">No journey plans yet.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            Create your first journey →
          </button>
        </div>
      )}
    </div>
  );
}
