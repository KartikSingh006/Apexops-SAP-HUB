// supabase/functions/apex-joule/index.ts
// ApexJoule AI Backend — Gemini 1.5 Flash proxy with strict scope guardrails

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  "Content-Type": "application/json",
};

// ── System prompt with strict scope guardrails ──────────────────────────────
const SYSTEM_PROMPT = `You are ApexJoule, the AI operational assistant exclusively embedded in the ApexOps SAP Hub enterprise dashboard. You are a highly specialized expert, and you ONLY answer questions related to the ApexOps platform.

Your areas of expertise are strictly limited to:
1. **Analytics Hub (Dashboard)**: Interpreting KPI metrics (total stock, revenue, open work orders, pending sales orders), explaining chart data, and summarizing operational health.
2. **OData Stream Center**: Monitoring SAP OData v4 API call logs, analyzing HTTP methods (GET/POST/PATCH/DELETE), debugging endpoint paths under /sap/opu/odata4/, interpreting response status codes, and explaining correlation IDs and latency.
3. **Maintenance Hub**: Managing SAP Work Orders (WO-XXXX identifiers), PM01/PM02/PM03 order types, functional locations, equipment IDs, maintenance activity types, planning and scheduling, and work order status transitions (OPEN → IN_PROGRESS → COMPLETED → CLOSED).
4. **Warehouse Audit Hub**: Tracking SAP Material master data (MAT-XXXX), MARA/MARD tables, stock quantities, reorder points, safety stock thresholds, storage locations (SLoc-XX), plant codes (PLNT-XXX), material types (FERT/HALB/ROH/HIBE), and performing barcode-based stock audits.
5. **Navigation**: You can help users navigate between pages using the navigateToPage tool when they express intent to visit a section.

CRITICAL SCOPE RULE — STRICTLY ENFORCE THIS:
If a user asks ANYTHING outside the ApexOps dashboard context — including general coding questions, general knowledge, weather, sports, math problems, jokes, or casual conversation — you MUST respond with EXACTLY this message and nothing else:
"I can only assist with queries related to the ApexOps dashboard and enterprise operational workflows."

Keep all responses concise, professional, and actionable. Maximum 2-3 short sentences. Use SAP terminology where appropriate.`;

// ── Navigation tool definition ──────────────────────────────────────────────
const TOOLS = [
  {
    function_declarations: [
      {
        name: "navigateToPage",
        description:
          "Navigates the ApexOps dashboard to a specific page when the user expresses intent to go there, such as 'show me the warehouse', 'take me to maintenance logs', 'open the analytics hub', etc.",
        parameters: {
          type: "object",
          properties: {
            route: {
              type: "string",
              enum: ["dashboard", "warehouse", "maintenance"],
              description:
                "The target route: 'dashboard' for Analytics Hub, 'warehouse' for Warehouse Audit Hub, 'maintenance' for Maintenance Hub.",
            },
            confirmationMessage: {
              type: "string",
              description:
                "A short, professional message to confirm the navigation action to the user, e.g. 'Navigating to Warehouse Audit Hub now.'",
            },
          },
          required: ["route", "confirmationMessage"],
        },
      },
    ],
  },
];

// ── Message type ────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured on server." }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required." }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Sliding window — keep last 5 exchanges only (cost optimization)
  const windowedMessages = messages.slice(-5);

  // Convert to Gemini content format
  const contents = windowedMessages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const geminiPayload = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents,
    tools: TOOLS,
    generationConfig: {
      maxOutputTokens: 150,
      temperature: 0.4,
      topP: 0.8,
      topK: 20,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  try {
    const geminiRes = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${geminiRes.status}` }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const geminiData = await geminiRes.json();
    const candidate = geminiData?.candidates?.[0];

    if (!candidate) {
      return new Response(
        JSON.stringify({ error: "No response candidate from Gemini." }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const parts = candidate?.content?.parts ?? [];

    // Check for function call (navigation tool)
    const funcCallPart = parts.find((p: any) => p.functionCall);
    if (funcCallPart) {
      const { name, args } = funcCallPart.functionCall;
      if (name === "navigateToPage") {
        return new Response(
          JSON.stringify({
            type: "tool_call",
            toolName: name,
            args,
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }
    }

    // Regular text response
    const textPart = parts.find((p: any) => p.text);
    const reply = textPart?.text?.trim() ?? "I'm not sure how to answer that in the context of ApexOps.";

    return new Response(
      JSON.stringify({ type: "text", reply }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
