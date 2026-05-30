import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.3.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "";
const publicSiteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://app.tradiestools.co.nz").replace(/\/$/, "");

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-02-25.clover",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const contractorColumns = "id, slug, business_name, email";

type StarterTemplate = "residential" | "rural" | "pool";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const deriveBusinessName = (email: string, preferredName?: string | null) => {
  if (preferredName?.trim()) {
    return preferredName.trim();
  }

  const localPart = email.split("@")[0] ?? "contractor";
  return localPart
    .split(/[.\-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const templateProducts = (template: StarterTemplate) => {
  switch (template) {
    case "rural":
      return [
        { name: "Post and rail", description: "Rural boundary fencing with timber rails.", unit: "lineal metre", base_price: 68, is_featured: true },
        { name: "Wire netting", description: "Stock-friendly wire fencing for long runs.", unit: "lineal metre", base_price: 54, is_featured: true },
        { name: "Farm gate", description: "Gate supply and install for paddock access.", unit: "each", base_price: 420, is_featured: false },
      ] as const;
    case "pool":
      return [
        { name: "Aluminium pool fence", description: "Compliant pool fencing with powder-coated panels.", unit: "lineal metre", base_price: 165, is_featured: true },
        { name: "Pool gate", description: "Self-closing gate installation.", unit: "each", base_price: 590, is_featured: true },
        { name: "Glass pool panel", description: "Frameless glass panel upgrade option.", unit: "lineal metre", base_price: 295, is_featured: false },
      ] as const;
    case "residential":
    default:
      return [
        { name: "Timber paling fence", description: "Classic boundary fencing for homes.", unit: "lineal metre", base_price: 125, is_featured: true },
        { name: "Colorsteel fence", description: "Low-maintenance steel privacy fencing.", unit: "lineal metre", base_price: 145, is_featured: true },
        { name: "Pedestrian gate", description: "Matching access gate supply and install.", unit: "each", base_price: 480, is_featured: false },
      ] as const;
  }
};

const buildUniqueSlug = async (businessName: string) => {
  const baseSlug = slugify(businessName) || "new-contractor";
  const { data, error } = await adminClient
    .from("contractors")
    .select("slug")
    .like("slug", `${baseSlug}%`);

  if (error) {
    throw error;
  }

  const existingSlugs = new Set((data ?? []).map((row) => String(row.slug)));
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
};

const createStarterProducts = async (contractorId: string, template: StarterTemplate) => {
  const products = templateProducts(template).map((product, index) => ({
    contractor_id: contractorId,
    name: product.name,
    description: product.description,
    unit: product.unit,
    base_price: product.base_price,
    is_featured: product.is_featured,
    display_order: index,
  }));

  const { error } = await adminClient.from("products").insert(products);
  if (error) {
    throw error;
  }
};

const ensureContractor = async ({
  customerEmail,
  customerName,
  template,
}: {
  customerEmail: string;
  customerName: string;
  template: StarterTemplate;
}) => {
  const { data: existingByEmail, error: existingError } = await adminClient
    .from("contractors")
    .select(contractorColumns)
    .eq("email", customerEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingByEmail) {
    return existingByEmail.id as string;
  }

  const businessName = deriveBusinessName(customerEmail, customerName);
  const slug = await buildUniqueSlug(businessName);

  const { data: contractor, error: contractorError } = await adminClient
    .from("contractors")
    .insert({
      slug,
      business_name: businessName,
      phone: "",
      email: customerEmail,
      website: "",
      facebook_url: "",
      hero_label: "Online fence estimator",
      intro_text: "Measure the project, choose products, and send through the job details for a fast follow-up.",
      opening_line: `Hi ${businessName}, I would like a quote for the following project:`,
      closing_line: "Please get in touch to confirm pricing, site access, and install timing.",
      is_published: false,
    })
    .select("id")
    .single();

  if (contractorError || !contractor) {
    throw contractorError ?? new Error("Unable to create contractor.");
  }

  await createStarterProducts(contractor.id as string, template);

  const { error: onboardingError } = await adminClient.from("onboarding_progress").upsert({
    contractor_id: contractor.id,
    current_step: "business-details",
    is_live: false,
    completed_at: null,
  });

  if (onboardingError) {
    throw onboardingError;
  }

  return contractor.id as string;
};

const buildWelcomeEmailText = (setupLink: string, isReturning: boolean): string => {
  const greeting = isReturning
    ? "Welcome back to TradiesTools."
    : "Your TradiesTools trial has started — you have 14 days free, then $29/month AUD.";

  return [
    greeting,
    "",
    "Before you click the link below, it helps to have these 5 things ready.",
    "Setup takes about 10 minutes once you have them.",
    "",
    "Checklist",
    "---------",
    "1. Business name — the trading name your customers know you by",
    "2. Contact details — phone number, email address, and website URL",
    "3. Facebook page URL — if you have one (used for the share button)",
    "4. Fencing products + prices — the services you quote most often,",
    "   e.g. Colorbond steel $145/lm, Timber paling $125/lm, Pool gate $590 each",
    "5. Brand colours — your primary and accent hex codes, or pick them during setup",
    "",
    "You can also upload your logo once you're in.",
    "",
    "Set up your estimator",
    "---------------------",
    setupLink,
    "",
    "This link is single-use. If it expires, go to app.tradiestools.co.nz and sign in.",
    "",
    "— The TradiesTools team",
  ].join("\n");
};

const sendWelcomeEmail = async (email: string) => {
  const redirectTo = `${publicSiteUrl}/welcome`;

  // Try to generate an invite link for a new user first
  let setupLink: string | null = null;
  let isReturning = false;

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  if (inviteError) {
    const lower = inviteError.message.toLowerCase();
    if (lower.includes("already registered") || lower.includes("already exists")) {
      // Existing user — generate a magic link instead
      isReturning = true;
      const { data: magicData, error: magicError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      if (magicError) {
        console.error("sendWelcomeEmail magic link fallback failed:", magicError.message);
      } else {
        setupLink = magicData.properties?.action_link ?? null;
      }
    } else {
      throw inviteError;
    }
  } else {
    setupLink = inviteData.properties?.action_link ?? null;
  }

  // If Resend is configured and we have a link, send a custom welcome email
  if (resendApiKey && resendFromEmail && setupLink) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [email],
        subject: isReturning
          ? "Your TradiesTools login link"
          : "Your TradiesTools trial has started — here's what to prepare",
        text: buildWelcomeEmailText(setupLink, isReturning),
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error("sendWelcomeEmail Resend failed:", response.status, responseText);
    }
    return;
  }

  // Resend not configured — fall back to Supabase auth emails so dev/staging still works
  if (!setupLink) {
    // generateLink failed for existing user; fall back to OTP
    const { error: otpError } = await adminClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    if (otpError) {
      console.error("sendWelcomeEmail OTP fallback failed:", otpError.message);
    }
    return;
  }

  // New user, no Resend — send standard invite email
  const { error: fallbackError } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (fallbackError) {
    console.error("sendWelcomeEmail invite fallback failed:", fallbackError.message);
  }
};

const upsertSubscription = async ({
  contractorId,
  customerEmail,
  customerName,
  planCode,
  status,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeCheckoutSessionId,
  currentPeriodEnd,
  trialStart,
  trialEnd,
}: {
  contractorId: string;
  customerEmail: string;
  customerName: string;
  planCode: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCheckoutSessionId: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
}) => {
  const payload = {
    contractor_id: contractorId,
    customer_email: customerEmail,
    customer_name: customerName,
    plan_code: planCode,
    status,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_checkout_session_id: stripeCheckoutSessionId,
    current_period_end: currentPeriodEnd,
    trial_start: trialStart,
    trial_end: trialEnd,
  };

  if (stripeCheckoutSessionId) {
    const { error } = await adminClient.from("subscriptions").upsert(payload, {
      onConflict: "stripe_checkout_session_id",
    });
    if (error) {
      throw error;
    }
    return;
  }

  if (stripeSubscriptionId) {
    const { error } = await adminClient.from("subscriptions").upsert(payload, {
      onConflict: "stripe_subscription_id",
    });
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await adminClient.from("subscriptions").insert(payload);
  if (error) {
    throw error;
  }
};

const syncSubscriptionStatus = async ({
  stripeSubscriptionId,
  status,
  currentPeriodEnd,
}: {
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
}) => {
  const { error } = await adminClient
    .from("subscriptions")
    .update({
      status,
      current_period_end: currentPeriodEnd,
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    throw error;
  }
};

const recordBillingEvent = async ({
  stripeEventId,
  eventType,
  stripeSubscriptionId,
  invoiceId,
  invoiceStatus,
  amountPaid,
  amountDue,
  currency,
  billingReason,
  periodEnd,
  occurredAt,
  summary,
}: {
  stripeEventId: string;
  eventType: string;
  stripeSubscriptionId: string | null;
  invoiceId: string | null;
  invoiceStatus: string | null;
  amountPaid: number | null;
  amountDue: number | null;
  currency: string | null;
  billingReason: string | null;
  periodEnd: string | null;
  occurredAt: string;
  summary: string;
}) => {
  if (!stripeSubscriptionId) {
    return;
  }

  const { data: subscription, error: subscriptionLookupError } = await adminClient
    .from("subscriptions")
    .select("id, contractor_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (subscriptionLookupError) {
    throw subscriptionLookupError;
  }

  if (!subscription) {
    return;
  }

  const { error } = await adminClient.from("subscription_billing_events").upsert(
    {
      contractor_id: subscription.contractor_id,
      subscription_id: subscription.id,
      stripe_event_id: stripeEventId,
      event_type: eventType,
      invoice_id: invoiceId,
      invoice_status: invoiceStatus,
      amount_paid: amountPaid,
      amount_due: amountDue,
      currency,
      billing_reason: billingReason,
      period_end: periodEnd,
      occurred_at: occurredAt,
      summary,
    },
    { onConflict: "stripe_event_id" },
  );

  if (error) {
    throw error;
  }
};

const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  console.log("checkout.session.completed", session.id, session.mode, session.customer_details?.email ?? session.customer_email);

  if (session.mode !== "subscription") {
    return;
  }

  const customerEmail = session.customer_details?.email ?? session.customer_email;
  if (!customerEmail) {
    throw new Error("Checkout session completed without a customer email.");
  }

  const customerName = session.customer_details?.name ?? "";
  const planCode = session.metadata?.plan_code ?? "starter-monthly";
  const template = (session.metadata?.template_code as StarterTemplate | undefined) ?? "residential";
  const contractorId = await ensureContractor({ customerEmail, customerName, template });

  let stripeSubscriptionId: string | null = null;
  let status = session.payment_status === "paid" ? "active" : "pending";
  let currentPeriodEnd: string | null = null;
  let trialStart: string | null = null;
  let trialEnd: string | null = null;

  if (typeof session.subscription === "string") {
    stripeSubscriptionId = session.subscription;
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      status = subscription.status;
      currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      trialStart = subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null;
      trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null;
    } catch (err) {
      console.error("stripe.subscriptions.retrieve failed:", err instanceof Error ? err.message : String(err));
    }
  }

  await upsertSubscription({
    contractorId,
    customerEmail,
    customerName,
    planCode,
    status,
    stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
    stripeSubscriptionId,
    stripeCheckoutSessionId: session.id,
    currentPeriodEnd,
    trialStart,
    trialEnd,
  });

  await sendWelcomeEmail(customerEmail);
};

const handleSubscriptionChange = async (subscription: Stripe.Subscription) => {
  await syncSubscriptionStatus({
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  });
};

const handleInvoicePaid = async (event: Stripe.Event, invoice: Stripe.Invoice) => {
  const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  await recordBillingEvent({
    stripeEventId: event.id,
    eventType: event.type,
    stripeSubscriptionId,
    invoiceId: invoice.id,
    invoiceStatus: invoice.status ?? null,
    amountPaid: invoice.amount_paid ?? null,
    amountDue: invoice.amount_due ?? null,
    currency: invoice.currency ?? null,
    billingReason: invoice.billing_reason ?? null,
    periodEnd: invoice.lines.data[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000).toISOString() : null,
    occurredAt: new Date(event.created * 1000).toISOString(),
    summary: "Invoice paid successfully",
  });
};

const handleInvoicePaymentFailed = async (event: Stripe.Event, invoice: Stripe.Invoice) => {
  const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  await recordBillingEvent({
    stripeEventId: event.id,
    eventType: event.type,
    stripeSubscriptionId,
    invoiceId: invoice.id,
    invoiceStatus: invoice.status ?? null,
    amountPaid: invoice.amount_paid ?? null,
    amountDue: invoice.amount_due ?? null,
    currency: invoice.currency ?? null,
    billingReason: invoice.billing_reason ?? null,
    periodEnd: invoice.lines.data[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000).toISOString() : null,
    occurredAt: new Date(event.created * 1000).toISOString(),
    summary: "Invoice payment failed",
  });
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!stripeSecretKey || !stripeWebhookSecret) {
    return new Response(JSON.stringify({ error: "Stripe environment is not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing Stripe signature header." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret, undefined, cryptoProvider);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event, event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event, event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process Stripe webhook.";
    console.error("stripe-provision unhandled error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
