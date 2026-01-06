import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowRight, MessageSquare } from 'lucide-react';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/contacts');

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-primary-950">OutreachReady</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Log in</Link>
            <Link href="/signup" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Get Started</Link>
          </div>
        </div>
      </nav>
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Turn Every Message Into a <span className="text-primary-600">Strategic Move</span></h1>
          <p className="text-xl text-gray-600 mb-8">Stop sending random messages. OutreachReady helps you build relationships with purpose.</p>
          <Link href="/signup" className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 inline-flex items-center gap-2 text-lg">
            Start Free <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
