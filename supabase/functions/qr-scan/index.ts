import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    })

    // Get request body
    const { vehicle_id, source } = await req.json()

    if (!vehicle_id) {
      return new Response(
        JSON.stringify({ error: "vehicle_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Rate limiting: Check IP-based rate limit (30 requests per minute)
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const rateLimitKey = `qr_scan:${clientIP}`
    
    // Use Supabase to track rate limiting (simplified - in production use Redis or similar)
    const { data: recentScans, error: rateError } = await supabase
      .from("qr_scans")
      .select("id")
      .eq("ip_hash", btoa(clientIP))
      .gte("scanned_at", new Date(Date.now() - 60000).toISOString())

    if (!rateError && recentScans && recentScans.length >= 30) {
      return new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Hash user agent and IP for privacy
    const uaHash = await hashText(req.headers.get("user-agent") || "unknown")
    const ipHash = await hashText(clientIP)

    // Record the QR scan
    const { error: insertError } = await supabase
      .from("qr_scans")
      .insert({
        vehicle_id,
        source: source || "direct",
        ua_hash: uaHash,
        ip_hash: ipHash,
      })

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

async function hashText(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input.trim())
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}
