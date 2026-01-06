import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MessageSquare, Users, Map, Settings, LogOut } from 'lucide-react';
import VoiceCoachWidget from '@/components/voice-coach/VoiceCoachWidget';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            <Link href="/contacts" className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-primary-950">OutreachReady</span>
            </Link>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              <li><Link href="/contacts" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50"><Users className="h-5 w-5" /><span>Contacts</span></Link></li>
              <li><Link href="/journeys" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50"><Map className="h-5 w-5" /><span>Journeys</span></Link></li>
              <li><Link href="/messages" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50"><MessageSquare className="h-5 w-5" /><span>Messages</span></Link></li>
              <li><Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50"><Settings className="h-5 w-5" /><span>Settings</span></Link></li>
            </ul>
          </nav>
          <div className="p-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            <p className="text-xs text-gray-500 capitalize mb-3">{profile?.subscription_tier || 'Free'} Plan</p>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Messages</span><span>{profile?.messages_used_this_month || 0} / {profile?.messages_limit || 10}</span></div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, ((profile?.messages_used_this_month || 0) / (profile?.messages_limit || 10)) * 100)}%` }} /></div>
            </div>
            <form action="/auth/signout" method="post"><button type="submit" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"><LogOut className="h-4 w-4" />Sign out</button></form>
          </div>
        </div>
      </aside>
      <main className="ml-64 min-h-screen">{children}</main>
      <VoiceCoachWidget userId={user.id} />
    </div>
  );
}
