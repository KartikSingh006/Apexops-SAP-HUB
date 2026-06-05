// supabase/functions/db-executor/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const SUPABASE_DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
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

  // Check secure token
  const token = req.headers.get("x-secure-token");
  if (token !== SECURE_TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  if (!SUPABASE_DB_URL) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_DB_URL environment variable is not set" }),
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

  const { sql } = body;
  if (!sql) {
    return new Response(JSON.stringify({ error: "sql query is required" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  // Robustly convert to string
  let sqlStr = "";
  if (Array.isArray(sql)) {
    sqlStr = sql.join("\n");
  } else if (typeof sql === "object") {
    // If it's some other object, serialize it or convert
    sqlStr = JSON.stringify(sql);
  } else {
    sqlStr = String(sql);
  }

  const client = new Client(SUPABASE_DB_URL);
  try {
    await client.connect();

    const results = [];
    if (sqlStr.includes("-- STATEMENT")) {
      const statements = sqlStr
        .split("-- STATEMENT")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      for (const statement of statements) {
        console.log("Executing statement:", statement.substring(0, 100) + "...");
        const res = await client.queryObject(statement);
        results.push({
          query: statement.substring(0, 100),
          rowCount: res.rowCount,
          command: res.command,
        });
      }
    } else {
      const res = await client.queryObject(sqlStr);
      results.push({
        query: sqlStr.substring(0, 100),
        rowCount: res.rowCount,
        command: res.command,
      });
    }

    await client.end();

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    console.error("Database execution error:", err);
    try {
      await client.end();
    } catch {}
    return new Response(
      JSON.stringify({ error: err?.message ?? "Database query failed", details: err }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
