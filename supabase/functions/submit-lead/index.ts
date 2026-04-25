import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const turnstileSecretKey = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "";
const publicSiteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://app.tradiestools.co.nz").replace(/\/$/, "");
const devTurnstileBypass = Deno.env.get("DEV_TURNSTILE_BYPASS") === "true";

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

const sendLeadNotification = async ({
  businessName,
  contractorSlug,
  contractorEmail,
  customerName,
  customerEmail,
  customerPhone,
  message,
  measurementMode,
  measurementValue,
  measurementUnit,
  selectedProductsSummary,
  estimatedTotal,
}: {
  businessName: string;
  contractorSlug: string;
  contractorEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  measurementMode: "distance" | "area" | null;
  measurementValue: number | null;
  measurementUnit: string | null;
  selectedProductsSummary: string[];
  estimatedTotal: number | null;
}) => {
  if (!resendApiKey || !resendFromEmail || !contractorEmail) {
    console.warn("Lead email notification skipped.", {
      hasResendApiKey: Boolean(resendApiKey),
      hasResendFromEmail: Boolean(resendFromEmail),
      hasContractorEmail: Boolean(contractorEmail),
    });
    return;
  }

  const measurementSummary =
    measurementMode && measurementValue && measurementUnit
      ? `${measurementMode === "distance" ? "Fence length" : "Measured area"}: ${measurementValue.toFixed(1)} ${measurementUnit}`
      : "No measurement saved";
  const adminUrl = `${publicSiteUrl}/admin/${contractorSlug}`;
  const contactLine =
    customerEmail && customerPhone
      ? `${customerEmail} / ${customerPhone}`
      : customerEmail || customerPhone || "No contact details provided";

  const lines = [
    `New fence enquiry for ${businessName}`,
    "================================",
    "",
    "Customer",
    "--------",
    `Name: ${customerName || "Not provided"}`,
    `Contact: ${contactLine}`,
    "",
    "Project",
    "-------",
    `Measurement: ${measurementSummary}`,
    `Selected products: ${selectedProductsSummary.length > 0 ? selectedProductsSummary.join(" | ") : "None selected"}`,
    `Estimated material total: ${estimatedTotal ? `NZ$${estimatedTotal.toFixed(2)}` : "Not calculated"}`,
    "",
    "Customer message:",
    message,
    "",
    "Next step",
    "---------",
    `Open this lead in admin: ${adminUrl}`,
  ];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [contractorEmail],
      reply_to: customerEmail || undefined,
      subject: `New fence enquiry: ${customerName || "Customer"} for ${businessName}`,
      text: lines.join("\n"),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Lead email notification failed: ${response.status} ${responseText}`);
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await request.json()) as LeadPayload;

    const origin = request.headers.get("origin") ?? "";
    const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
    const shouldBypassTurnstile =
      devTurnstileBypass && isLocalOrigin && body.turnstile_token === "local-dev-bypass";

    if (!turnstileSecretKey && !shouldBypassTurnstile) {
      throw new Error("Turnstile secret key is not configured.");
    }

    if (!body.turnstile_token) {
      return new Response(JSON.stringify({ error: "Missing Turnstile token." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!shouldBypassTurnstile) {
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
    }

    if (!body.contractor_id || !body.message || body.measurement_points.length < 2) {
      return new Response(JSON.stringify({ error: "Lead is missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.customer_name?.trim()) {
      return new Response(JSON.stringify({ error: "Customer name is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.customer_email?.trim() && !body.customer_phone?.trim()) {
      return new Response(JSON.stringify({ error: "Customer email or phone is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contractor, error: contractorError } = await supabase
      .from("contractors")
      .select("id, is_published, business_name, email, slug")
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
        status,
        internal_notes,
        last_contacted_at,
        archived_at,
        deleted_at,
        updated_at,
        created_at
      `)
      .single();

    if (error) {
      throw error;
    }

    try {
      await sendLeadNotification({
        businessName: String(contractor.business_name ?? "Contractor"),
        contractorSlug: String(contractor.slug ?? ""),
        contractorEmail: String(contractor.email ?? ""),
        customerName: body.customer_name ?? "",
        customerEmail: body.customer_email ?? "",
        customerPhone: body.customer_phone ?? "",
        message: body.message,
        measurementMode: body.measurement_mode,
        measurementValue: body.measurement_value,
        measurementUnit: body.measurement_unit,
        selectedProductsSummary: body.selected_products_summary ?? [],
        estimatedTotal: body.estimated_total,
      });
    } catch (notificationError) {
      console.error(notificationError);
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
