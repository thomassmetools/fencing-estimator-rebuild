import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const turnstileSecretKey = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface LeadPayload {
  contractor_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  message: string;
  measurement_mode: "distance" | "area" | null;
  measurement_value: number | null;
  measurement_unit: string | null;
  measurement_points: Array<{ lat: number; lng: number }>;
  estimated_total: number | null;
  selected_products_summary: string[];
  source: "submit";
  turnstile_token: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await request.json()) as LeadPayload;

    if (!turnstileSecretKey) {
      throw new Error("Turnstile secret key is not configured.");
    }

    if (!body.turnstile_token) {
      return new Response(JSON.stringify({ error: "Missing Turnstile token." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ipAddress =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "";

    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: turnstileSecretKey,
        response: body.turnstile_token,
        remoteip: ipAddress,
      }),
    });

    const verifyPayload = (await verifyResponse.json()) as { success?: boolean };
    if (!verifyPayload.success) {
      return new Response(JSON.stringify({ error: "Bot verification failed." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.contractor_id || !body.message || body.measurement_points.length < 2) {
      return new Response(JSON.stringify({ error: "Lead is missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contractor, error: contractorError } = await supabase
      .from("contractors")
      .select("id, is_published")
      .eq("id", body.contractor_id)
      .eq("is_published", true)
      .single();

    if (contractorError || !contractor) {
      return new Response(JSON.stringify({ error: "Contractor is not available." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count, error: rateError } = await supabase
      .from("lead_events")
      .select("id", { count: "exact", head: true })
      .eq("contractor_id", body.contractor_id)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (rateError) {
      throw rateError;
    }

    if ((count ?? 0) >= 20) {
      return new Response(JSON.stringify({ error: "Too many recent submissions. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insertPayload = {
      contractor_id: body.contractor_id,
      customer_name: body.customer_name ?? "",
      customer_email: body.customer_email ?? "",
      customer_phone: body.customer_phone ?? "",
      message: body.message,
      measurement_mode: body.measurement_mode,
      measurement_value: body.measurement_value,
      measurement_unit: body.measurement_unit,
      measurement_points: body.measurement_points,
      estimated_total: body.estimated_total,
      selected_products_summary: body.selected_products_summary ?? [],
      source: "submit",
    };

    const { data, error } = await supabase
      .from("lead_events")
      .insert(insertPayload)
      .select(`
        id,
        contractor_id,
        customer_name,
        customer_email,
        customer_phone,
        message,
        measurement_mode,
        measurement_value,
        measurement_unit,
        measurement_points,
        estimated_total,
        selected_products_summary,
        source,
        created_at
      `)
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unable to submit lead.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
