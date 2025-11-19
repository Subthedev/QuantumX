/**
 * STRIPE CHECKOUT SESSION CREATOR
 *
 * Creates Stripe checkout session for subscription purchases
 * Called from frontend when user clicks upgrade button
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Price ID mapping (TODO: Replace with actual Stripe Price IDs)
const PRICE_IDS = {
  PRO_MONTHLY: Deno.env.get('STRIPE_PRICE_PRO_MONTHLY') || 'price_pro_monthly',
  PRO_YEARLY: Deno.env.get('STRIPE_PRICE_PRO_YEARLY') || 'price_pro_yearly',
  MAX_MONTHLY: Deno.env.get('STRIPE_PRICE_MAX_MONTHLY') || 'price_max_monthly',
  MAX_YEARLY: Deno.env.get('STRIPE_PRICE_MAX_YEARLY') || 'price_max_yearly',
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { planId, userId, successUrl, cancelUrl } = await req.json();

    if (!planId || !userId || !successUrl || !cancelUrl) {
      return new Response('Missing required parameters', { status: 400 });
    }

    console.log('💳 Creating checkout session:', { planId, userId });

    // Get user's email from Supabase
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData) {
      console.error('❌ Error fetching user:', userError);
      return new Response('User not found', { status: 404 });
    }

    const priceId = PRICE_IDS[planId as keyof typeof PRICE_IDS];

    if (!priceId) {
      return new Response('Invalid plan ID', { status: 400 });
    }

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: {
          user_id: userId,
        },
      });
      customerId = customer.id;
      console.log('✅ Created Stripe customer:', customerId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
        plan_id: planId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
        },
      },
      allow_promotion_codes: true,
    });

    console.log('✅ Checkout session created:', session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('❌ Checkout error:', err);
    return new Response(`Checkout error: ${err.message}`, { status: 500 });
  }
});
