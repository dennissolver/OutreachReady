import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
  params: { id: string };
}

export default async function ContactDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !contact) {
    notFound();
  }

  // Get communications context
  const { data: context } = await supabase
    .from('communications')
    .select('content, created_at')
    .eq('contact_id', params.id)
    .eq('direction', 'context')
    .single();

  // Get sent communications
  const { data: sentComms } = await supabase
    .from('communications')
    .select('*')
    .eq('contact_id', params.id)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get recent generated messages
  const { data: recentMessages } = await supabase
    .from('generated_messages')
    .select('*')
    .eq('contact_id', params.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/contacts"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Contacts
        </Link>
        <Link
          href={`/contacts/${contact.id}/edit`}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Edit Contact
        </Link>
      </div>

      {/* Contact Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
            {contact.title && contact.company && (
              <p className="text-gray-600 mt-1">{contact.title} at {contact.company}</p>
            )}
            {contact.email && (
              <p className="text-gray-500 text-sm mt-1">{contact.email}</p>
            )}
            {contact.linkedin_url && (
              <a 
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block"
              >
                View LinkedIn Profile →
              </a>
            )}
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Added {new Date(contact.created_at).toLocaleDateString()}</p>
            {contact.last_contact_date && (
              <p>Last contact: {new Date(contact.last_contact_date).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        {contact.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-1">Notes</p>
            <p className="text-gray-700">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Main Action - Start New Outreach */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 mb-6 text-white">
        <h2 className="text-xl font-semibold mb-2">Ready to reach out?</h2>
        <p className="text-blue-100 mb-4">
          Start a coaching session to craft the perfect message for {contact.name}
        </p>
        <div className="flex gap-3">
          <Link
            href={`/contacts/${contact.id}/communications`}
            className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-medium"
          >
            Start Outreach Flow
          </Link>
          <Link
            href={`/contacts/${contact.id}/coach`}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-400 font-medium"
          >
            Quick: Voice Coach
          </Link>
        </div>
      </div>

      {/* Communications Context */}
      {context && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Communications Context</h2>
          <p className="text-xs text-gray-500 mb-2">
            Last updated: {new Date(context.created_at).toLocaleString()}
          </p>
          <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
              {context.content}
            </pre>
          </div>
          <Link
            href={`/contacts/${contact.id}/communications`}
            className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
          >
            Update communications →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sent Messages */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Sent Messages</h2>
          {sentComms && sentComms.length > 0 ? (
            <div className="space-y-3">
              {sentComms.map((comm: any) => (
                <div key={comm.id} className="border-l-2 border-green-500 pl-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className="capitalize">{comm.channel?.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{new Date(comm.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{comm.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No messages sent yet.</p>
          )}
        </div>

        {/* Recent Generated Messages */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Drafts</h2>
          {recentMessages && recentMessages.length > 0 ? (
            <div className="space-y-3">
              {recentMessages.map((msg: any) => (
                <div key={msg.id} className="border-l-2 border-blue-300 pl-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className="capitalize">{msg.channel?.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="capitalize">{msg.tone}</span>
                    <span>•</span>
                    <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{msg.content}</p>
                </div>
              ))}
              <Link
                href={`/contacts/${contact.id}/messages`}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View all drafts →
              </Link>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No messages generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
