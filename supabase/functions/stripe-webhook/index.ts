/**
 * STRIPE WEBHOOK HANDLER
 *
 * Processes Stripe webhook events and updates user subscriptions
 * Handles: checkout.session.completed, customer.subscription.updated, etc.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.3.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('📨 Stripe webhook event:', event.type);

    // Log event to database for debugging
    await supabase.from('stripe_webhook_events').insert({
      event_id: event.id,
      event_type: event.type,
      payload: event as any,
      processed: false,
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log('⏭️ Unhandled event type:', event.type);
    }

    // Mark event as processed
    await supabase
      .from('stripe_webhook_events')
      .update({ processed: true })
      .eq('event_id', event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('✅ Checkout completed:', session.id);

  const userId = session.metadata?.user_id;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error('Missing user_id or subscription_id in session metadata');
    return;
  }

  // Fetch subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Determine tier from price ID
  const priceId = subscription.items.data[0].price.id;
  const tier = determineTierFromPriceId(priceId);

  // Create or update subscription in database
  const { error } = await supabase.from('user_subscriptions').upsert({
    user_id: userId,
    tier,
    status: subscription.status as any,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  });

  if (error) {
    console.error('❌ Error updating subscription:', error);
  } else {
    console.log('✅ Subscription created/updated for user:', userId);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  const priceId = subscription.items.data[0].price.id;
  const tier = determineTierFromPriceId(priceId);

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      tier,
      status: subscription.status as any,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('❌ Error updating subscription:', error);
  } else {
    console.log('✅ Subscription updated');
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🗑️ Subscription deleted:', subscription.id);

  // Downgrade to FREE tier
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      tier: 'FREE',
      status: 'canceled',
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('❌ Error canceling subscription:', error);
  } else {
    console.log('✅ User downgraded to FREE tier');
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Payment succeeded:', invoice.id);

  if (!invoice.subscription) return;

  // Ensure subscription is active
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'active' })
    .eq('stripe_subscription_id', invoice.subscription as string);

  if (error) {
    console.error('❌ Error updating subscription status:', error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('❌ Payment failed:', invoice.id);

  if (!invoice.subscription) return;

  // Mark subscription as past_due
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription as string);

  if (error) {
    console.error('❌ Error updating subscription status:', error);
  }
}

function determineTierFromPriceId(priceId: string): 'FREE' | 'PRO' | 'MAX' {
  // TODO: Map actual Stripe Price IDs to tiers
  // For now, use simple string matching
  if (priceId.includes('pro')) return 'PRO';
  if (priceId.includes('max')) return 'MAX';
  return 'FREE';
}
