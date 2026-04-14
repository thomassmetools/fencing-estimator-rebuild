import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const adminClient = createClient(supabaseUrl, serviceRoleKey);

const contractorColumns = `
  id,
  slug,
  business_name,
  phone,
  email,
  website,
  facebook_url,
  primary_color,
  accent_color,
  hero_label,
  intro_text,
  opening_line,
  closing_line,
  include_pricing_disclaimer,
  is_published
`;

const productColumns = `
  id,
  contractor_id,
  name,
  description,
  unit,
  base_price,
  is_featured,
  display_order
`;

const onboardingColumns = `
  contractor_id,
  current_step,
  is_live,
  completed_at,
  created_at,
  updated_at
`;

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

    const { data: existingMembership } = await adminClient
      .from("contractor_users")
      .select("contractor_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    let contractorId = existingMembership?.contractor_id as string | undefined;
    let subscription: Record<string, unknown> | null = null;

    if (!contractorId) {
      const { data: matchedSubscription, error: subscriptionError } = await adminClient
        .from("subscriptions")
        .select("*")
        .eq("customer_email", user.email ?? "")
        .in("status", ["pending", "active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError) {
        throw subscriptionError;
      }

      if (!matchedSubscription) {
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      contractorId = matchedSubscription.contractor_id as string;
      subscription = matchedSubscription as Record<string, unknown>;

      const { error: linkError } = await adminClient.from("contractor_users").upsert(
        {
          contractor_id: contractorId,
          auth_user_id: user.id,
          role: "admin",
        },
        { onConflict: "contractor_id,auth_user_id" },
      );

      if (linkError) {
        throw linkError;
      }
    }

    const { data: contractor, error: contractorError } = await adminClient
      .from("contractors")
      .select(contractorColumns)
      .eq("id", contractorId)
      .single();

    if (contractorError) {
      throw contractorError;
    }

    const { data: onboarding, error: onboardingError } = await adminClient
      .from("onboarding_progress")
      .select(onboardingColumns)
      .eq("contractor_id", contractorId)
      .maybeSingle();

    if (onboardingError) {
      throw onboardingError;
    }

    if (!onboarding) {
      const { data: createdOnboarding, error: createOnboardingError } = await adminClient
        .from("onboarding_progress")
        .insert({
          contractor_id: contractorId,
          current_step: "business-details",
          is_live: false,
        })
        .select(onboardingColumns)
        .single();

      if (createOnboardingError) {
        throw createOnboardingError;
      }

      subscription = subscription ?? null;

      const { data: products, error: productsError } = await adminClient
        .from("products")
        .select(productColumns)
        .eq("contractor_id", contractorId)
        .order("display_order", { ascending: true });

      if (productsError) {
        throw productsError;
      }

      return new Response(
        JSON.stringify({
          contractor,
          onboarding: createdOnboarding,
          subscription,
          products,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: latestSubscription } = await adminClient
      .from("subscriptions")
      .select("*")
      .eq("contractor_id", contractorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: products, error: productsError } = await adminClient
      .from("products")
      .select(productColumns)
      .eq("contractor_id", contractorId)
      .order("display_order", { ascending: true });

    if (productsError) {
      throw productsError;
    }

    return new Response(
      JSON.stringify({
        contractor,
        onboarding,
        subscription: subscription ?? latestSubscription ?? null,
        products,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unable to claim onboarding.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
