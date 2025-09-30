import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { processWebhookPayload, type WebhookPayload, type WebhookEvent } from "./handler.ts";

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Rate limiting - simple in-memory store (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per IP

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Utility functions for validation
function validatePayloadStructure(body: unknown): body is WebhookPayload {
  return !!(body && typeof body === 'object' && 'events' in body && Array.isArray((body as any).events));
}

// Rate limiting check
function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const key = clientIP;

  if (rateLimitStore.has(key)) {
    const existing = rateLimitStore.get(key)!;

    if (now < existing.resetTime) {
      if (existing.count >= RATE_LIMIT_MAX) {
        return false;
      }
      existing.count++;
    } else {
      // Reset window
      rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
  } else {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  return true;
}


// Main webhook handler
serve(async (req: Request) => {
  // Security headers
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", message: "Only POST requests are accepted" }),
      { status: 405, headers }
    );
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") ||
                    req.headers.get("x-real-ip") ||
                    "unknown";

    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", message: "Too many requests" }),
        { status: 429, headers }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON", message: "Request body must be valid JSON" }),
        { status: 400, headers }
      );
    }

    // Validate payload structure
    if (!validatePayloadStructure(body)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", message: "Payload must contain 'events' array" }),
        { status: 400, headers }
      );
    }

    if (body.events.length === 0) {
      return new Response(
        JSON.stringify({ message: "No events to process" }),
        { status: 200, headers }
      );
    }

    console.log(`📥 Received webhook with ${body.events.length} events from ${body.provider || 'unknown provider'}`);

    // Process webhook payload using handler
    const results = await processWebhookPayload(body);

    // Return results
    const status = results.errors > 0 ? 207 : 200; // 207 Multi-Status if some failed
    return new Response(
      JSON.stringify({
        message: "Webhook processed",
        summary: {
          total_events: body.events.length,
          processed: results.processed,
          skipped: results.skipped,
          errors: results.errors
        },
        details: results.details
      }),
      { status, headers }
    );

  } catch (error) {
    console.error("Fatal error processing webhook:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "Failed to process webhook"
      }),
      { status: 500, headers }
    );
  }
});

console.log("🚀 Sync Events webhook endpoint is running!");