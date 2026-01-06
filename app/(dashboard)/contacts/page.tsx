import { createClient } from '@/lib/supabase/server';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import ContactCard from '@/components/contacts/ContactCard';
import { FUNNEL_STAGE_LABELS } from '@/types';

export default async function ContactsPage({ searchParams }: { searchParams: { stage?: string; goal?: string; q?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase.from('contacts').select('*').eq('user_id', user.id).eq('is_archived', false).order('updated_at', { ascending: false });
  if (searchParams.stage) query = query.eq('funnel_stage', searchParams.stage);
  if (searchParams.goal) query = query.eq('relationship_goal', searchParams.goal);
  if (searchParams.q) query = query.or(`name.ilike.%${searchParams.q}%,company.ilike.%${searchParams.q}%`);

  const { data: contacts } = await query;
  const { data: stats } = await supabase.rpc('get_user_stats', { p_user_id: user.id });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500">{contacts?.length || 0} contacts • {stats?.followups_due || 0} follow-ups due</p>
        </div>
        <Link href="/contacts/new" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2">
          <Plus className="h-5 w-5" />Add Contact
        </Link>
      </div>
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <form><input type="text" name="q" defaultValue={searchParams.q} placeholder="Search contacts..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" /></form>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-8">
        {Object.entries(FUNNEL_STAGE_LABELS).map(([stage, label]) => (
          <Link key={stage} href={`/contacts?stage=${stage}`} className={`p-3 rounded-lg text-center transition ${searchParams.stage === stage ? 'bg-primary-100 border-2 border-primary-500' : 'bg-white border border-gray-200 hover:border-primary-300'}`}>
            <div className="text-2xl font-bold text-gray-900">{stats?.contacts_by_stage?.[stage] || 0}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </Link>
        ))}
      </div>
      {contacts && contacts.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => <ContactCard key={contact.id} contact={contact} />)}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">No contacts found</p>
          <Link href="/contacts/new" className="text-primary-600 hover:text-primary-700 font-medium">Add your first contact</Link>
        </div>
      )}
    </div>
  );
}
