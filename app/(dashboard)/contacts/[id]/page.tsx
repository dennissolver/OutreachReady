import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ContactDetailClient from './ContactDetailClient';

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

  // Get recent communications
  const { data: communications } = await supabase
    .from('communications')
    .select('*')
    .eq('contact_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get generated messages
  const { data: messages } = await supabase
    .from('generated_messages')
    .select('*')
    .eq('contact_id', params.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <ContactDetailClient 
      contact={contact} 
      communications={communications || []}
      generatedMessages={messages || []}
    />
  );
}
