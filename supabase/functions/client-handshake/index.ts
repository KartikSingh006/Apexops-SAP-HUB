// supabase/functions/client-handshake/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SECURE_TOKEN = "apexops-db-execute-token-2026-06-05";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-secure-token",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  // Verify token
  const token = req.headers.get("x-secure-token");
  if (token !== SECURE_TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Supabase service configuration missing on server" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const { email, project_id, name, company_id } = body;
  if (!email || !project_id || !company_id) {
    return new Response(
      JSON.stringify({ error: "email, project_id, and company_id are required fields" }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Initialize Admin Client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log(`Starting client handshake onboarding for email: ${email}`);

    // 1. Create client auth user using Project ID as the password
    let userId = "";
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: project_id,
      email_confirm: true,
      user_metadata: { role: "client", project_id },
    });

    if (createError) {
      // If user already exists, let's search for their user ID to perform updates
      if (createError.message.includes("already registered") || createError.message.includes("already exists")) {
        console.log("Client user already exists. Retrieving user profile...");
        const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = usersList.users.find(u => u.email === email);
        if (!existingUser) throw new Error("Could not retrieve existing client user");
        userId = existingUser.id;

        // Reset their password to the project ID to keep login aligned
        const { error: resetError } = await supabase.auth.admin.updateUserById(userId, {
          password: project_id,
          user_metadata: { role: "client", project_id },
        });
        if (resetError) throw resetError;
      } else {
        throw createError;
      }
    } else {
      userId = userData.user.id;
    }

    // 2. Create or update profile in profiles table
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      company_id,
      role: "client",
      email,
      full_name: name || email.split("@")[0],
    });

    if (profileError) throw profileError;

    // 3. Log transactional email dispatch in transactional_emails table
    const emailBody = `Welcome to the ApexOps enterprise portal! Your project has been established.

Unique Project ID: ${project_id}
Login Identity: ${email}

To sign in, please navigate to the Client Gateway on the Welcome Page and log in using your registered Email Address and your system-generated Unique Project ID.`;

    const { error: emailError } = await supabase.from("transactional_emails").insert({
      recipient: email,
      subject: "Welcome to ApexOps SAP Hub - Client Onboarding Details",
      body: emailBody,
    });

    if (emailError) throw emailError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Client account established and welcome email dispatched successfully",
        client_id: userId,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error("Client onboarding error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Client handshake failed", details: err }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
