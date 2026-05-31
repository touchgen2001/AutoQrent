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
    // Create Supabase client with auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    })

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get request body
    const { 
      vehicle_id, 
      pickup_address, 
      pickup_lat, 
      pickup_lng, 
      dropoff_address, 
      dropoff_lat, 
      dropoff_lng 
    } = await req.json()

    // Validate required fields
    if (!pickup_address || !dropoff_address) {
      return new Response(
        JSON.stringify({ error: "Pickup and dropoff addresses are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create logistics order
    const { data: order, error: insertError } = await supabase
      .from("logistics_orders")
      .insert({
        vehicle_id: vehicle_id || null,
        user_id: user.email,
        pickup_address,
        pickup_lat: pickup_lat || null,
        pickup_lng: pickup_lng || null,
        dropoff_address,
        dropoff_lat: dropoff_lat || null,
        dropoff_lng: dropoff_lng || null,
        status: "pending",
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify(order),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
