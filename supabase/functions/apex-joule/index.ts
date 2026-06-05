// supabase/functions/apex-joule/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-project-id",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `You are ApexJoule, the AI operational assistant exclusively embedded in the ApexOps SAP Hub enterprise dashboard. You are a highly specialized expert, and you ONLY answer questions related to the ApexOps platform.

Your areas of expertise are:
1. Analytics Hub (Dashboard): KPI metrics, open work orders, pending sales orders.
2. OData Stream Center: OData v4 middleware, endpoint debug logs under /sap/opu/odata4/.
3. Maintenance Hub: Work Orders (WO-XXXX), functional locations, priority (HIGH/MEDIUM/LOW), PM01/PM02/PM03 types.
4. Warehouse Audit Hub: Materials (MAT-XXXX), plants, storage locations, barcode audits.

CRITICAL SCOPE RULE: If a user asks anything outside the ApexOps context, you MUST respond with EXACTLY this:
"I can only assist with queries related to the ApexOps dashboard and enterprise operational workflows."

Keep responses concise, professional, and limited to 2-3 sentences.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: CORS_HEADERS,
    });
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

  const { messages } = body;
  const clientProjectId = req.headers.get("x-client-project-id") || "";

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  // 1. Verify feature flag from DB if a client project ID is supplied
  let isApexJouleEnabled = true; // Enabled by default for admin/employees
  let projectName = "";

  if (clientProjectId) {
    const dbClient = new Client(SUPABASE_DB_URL);
    try {
      await dbClient.connect();
      // Check if project has ApexJoule enabled
      const queryStr = `
        SELECT p.name, COALESCE(f.apex_joule_enabled, FALSE) as enabled
        FROM projects p
        LEFT JOIN feature_flags f ON f.project_id = p.id
        WHERE p.unique_project_id = $1
      `;
      const res = await dbClient.queryObject(queryStr, [clientProjectId]);
      await dbClient.end();

      if (res.rows.length > 0) {
        const row = res.rows[0] as any;
        isApexJouleEnabled = row.enabled;
        projectName = row.name;
      } else {
        // Project ID not found in database, lock by default
        isApexJouleEnabled = false;
      }
    } catch (err) {
      console.error("Database check error for feature flags:", err);
      try {
        await dbClient.end();
      } catch {}
      // Fallback: default to enabled if DB check fails during bootstrap
    }
  }

  // If disabled, return early with locked status
  if (!isApexJouleEnabled) {
    return new Response(
      JSON.stringify({
        type: "text",
        reply: `ApexJoule assistant is locked for project [${clientProjectId}]. Please request the Admin to enable the ApexJoule Add-On.`,
        locked: true,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  }

  const latestMessage = messages[messages.length - 1].content || "";
  const lowercaseMsg = latestMessage.toLowerCase();

  // 2. Try to fetch Gemini API
  if (GEMINI_API_KEY && !GEMINI_API_KEY.startsWith("AQ.")) {
    try {
      const windowedMessages = messages.slice(-5).map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const payload = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: windowedMessages,
        generationConfig: { maxOutputTokens: 150, temperature: 0.4 },
      };

      const res = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return new Response(JSON.stringify({ type: "text", reply: text.trim() }), {
            status: 200,
            headers: CORS_HEADERS,
          });
        }
      }
      console.warn(`Gemini API returned status ${res.status}. Triggering local fallback...`);
    } catch (err) {
      console.error("Gemini API request failed:", err);
    }
  }

  // 3. Robust Local ERP Fallback (Resolves 502)
  console.log("Running local fallback NLP responder...");
  let reply = "";

  // Helper check for OData
  if (lowercaseMsg.includes("odata") || lowercaseMsg.includes("log") || lowercaseMsg.includes("middleware")) {
    reply = "The OData Stream Center monitors real-time traffic under '/sap/opu/odata4/'. Standard requests register correlation IDs and response latencies (usually 45ms-350ms). GET represents reads, POST/PATCH denote data creations/updates, and DELETE handles removals.";
  }
  // Helper check for warehouse / stock
  else if (lowercaseMsg.includes("warehouse") || lowercaseMsg.includes("stock") || lowercaseMsg.includes("material") || lowercaseMsg.includes("inventory")) {
    reply = "The Warehouse Audit Hub registers material batches (MAT-XXXX) across plants like PLNT-DEL1. Low stock alerts are dispatched for items falling below safety levels. Physical audits require camera barcode scanning powered by html5-qrcode.";
  }
  // Helper check for maintenance / work orders
  else if (lowercaseMsg.includes("maintenance") || lowercaseMsg.includes("work order") || lowercaseMsg.includes("repair") || lowercaseMsg.includes("priority")) {
    reply = "The Maintenance Hub schedules work orders (WO-XXXX) under PM01/PM02/PM03 categories. Priority ranges from LOW to HIGH. Active work order limits ensure tasks are dispatched to qualified engineers.";
  }
  // Navigation check
  else if (lowercaseMsg.includes("navigate") || lowercaseMsg.includes("open") || lowercaseMsg.includes("go to") || lowercaseMsg.includes("show me")) {
    let route = "dashboard";
    let name = "Analytics Hub";
    if (lowercaseMsg.includes("warehouse") || lowercaseMsg.includes("stock") || lowercaseMsg.includes("audit")) {
      route = "warehouse";
      name = "Warehouse Audit Hub";
    } else if (lowercaseMsg.includes("maintenance") || lowercaseMsg.includes("work order") || lowercaseMsg.includes("repair")) {
      route = "maintenance";
      name = "Maintenance Hub";
    }
    return new Response(
      JSON.stringify({
        type: "tool_call",
        toolName: "navigateToPage",
        args: {
          route,
          confirmationMessage: `Opening the ${name} for you now.`,
        },
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  }
  // Out of scope trigger
  else if (
    lowercaseMsg.includes("weather") ||
    lowercaseMsg.includes("joke") ||
    lowercaseMsg.includes("sport") ||
    lowercaseMsg.includes("math") ||
    lowercaseMsg.includes("code") ||
    lowercaseMsg.includes("hello") ||
    lowercaseMsg.includes("hi ")
  ) {
    // Normal greetings can be handled, but general queries trigger the guardrail
    if (lowercaseMsg.includes("hello") || lowercaseMsg.includes("hi")) {
      reply = "Welcome to ApexOps Hub! I am ApexJoule, your operational assistant. How can I help you manage your enterprise workflows today?";
    } else {
      reply = "I can only assist with queries related to the ApexOps dashboard and enterprise operational workflows.";
    }
  } else {
    reply = `I am ApexJoule, your enterprise ERP assistant. I can help you inspect materials, track OData logs, analyze KPI metrics, or configure maintenance work orders. What operational details can I fetch for you?`;
  }

  return new Response(JSON.stringify({ type: "text", reply }), {
    status: 200,
    headers: CORS_HEADERS,
  });
});
