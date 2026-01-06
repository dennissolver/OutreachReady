import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const TIER_LIMITS = { free: { messages: 10, contacts: 25 }, starter: { messages: 50, contacts: 100 }, professional: { messages: 200, contacts: 500 }, enterprise: { messages: 1000, contacts: 5000 } };

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === 'subscription') {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const tier = 'starter' as keyof typeof TIER_LIMITS;
      await supabase.from('users').update({
        stripe_customer_id: session.customer as string, stripe_subscription_id: subscription.id, subscription_tier: tier,
        subscription_status: 'active', messages_limit: TIER_LIMITS[tier].messages, contacts_limit: TIER_LIMITS[tier].contacts
      }).eq('email', session.customer_email);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    await supabase.from('users').update({ subscription_tier: 'free', subscription_status: 'canceled', messages_limit: 10, contacts_limit: 25 }).eq('stripe_subscription_id', subscription.id);
  }

  return NextResponse.json({ received: true });
}
