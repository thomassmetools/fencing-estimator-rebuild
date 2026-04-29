import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "";
const turnstileSecretKey = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";

const adminClient = createClient(supabaseUrl, serviceRoleKey);

const sendTestLeadEmail = async (recipientEmail: string, businessName: string) => {
  if (!resendApiKey || !resendFromEmail || !recipientEmail) {
    throw new Error("Lead email notifications are not fully configured yet.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [recipientEmail],
      subject: `Test lead notification for ${businessName}`,
      text: `This is a test lead notification for ${businessName}. If you received this email, contractor lead alerts are working.`,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Test lead email failed: ${response.status} ${responseText}`);
  }
};

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

    const body = (await request.json()) as {
      contractor_id?: string;
      action?: "status" | "send_test_lead_email";
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

    const { data: contractor, error: contractorError } = await adminClient
      .from("contractors")
      .select("id, business_name, email")
      .eq("id", body.contractor_id)
      .single();

    if (contractorError || !contractor) {
      throw contractorError ?? new Error("Unable to load contractor.");
    }

    if (body.action === "send_test_lead_email") {
      await sendTestLeadEmail(String(contractor.email ?? ""), String(contractor.business_name ?? "Contractor"));
      return new Response(JSON.stringify({ message: "Test lead email sent successfully." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        contractorEmail: String(contractor.email ?? ""),
        leadEmailConfigured: Boolean(resendApiKey && resendFromEmail && contractor.email),
        resendConfigured: Boolean(resendApiKey && resendFromEmail),
        turnstileConfigured: Boolean(turnstileSecretKey),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unable to load contractor ops settings.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
