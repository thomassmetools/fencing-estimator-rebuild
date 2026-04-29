import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.3.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const publicSiteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://app.tradiestools.co.nz").replace(/\/$/, "");

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-02-25.clover",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unable to resolve signed-in user." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!stripeSecretKey) {
      throw new Error("Stripe environment is not configured.");
    }

    const body = (await request.json()) as {
      contractor_id?: string;
      flow?: "manage" | "cancel";
    };

    if (!body.contractor_id) {
      return new Response(JSON.stringify({ error: "Missing contractor id." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership, error: membershipError } = await adminClient
      .from("contractor_users")
      .select("contractor_id, role")
      .eq("auth_user_id", user.id)
      .eq("contractor_id", body.contractor_id)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership) {
      return new Response(JSON.stringify({ error: "You do not have access to this contractor." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscription, error: subscriptionError } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("contractor_id", body.contractor_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    if (!subscription?.stripe_customer_id) {
      throw new Error("No Stripe customer id is saved for this contractor yet.");
    }

    const returnUrl = `${publicSiteUrl}/admin`;
    const session = await stripe.billingPortal.sessions.create({
      customer: String(subscription.stripe_customer_id),
      return_url: returnUrl,
      ...(body.flow === "cancel" && subscription.stripe_subscription_id
        ? {
            flow_data: {
              type: "subscription_cancel" as const,
              subscription_cancel: {
                subscription: String(subscription.stripe_subscription_id),
              },
            },
          }
        : {}),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unable to create billing portal session.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
