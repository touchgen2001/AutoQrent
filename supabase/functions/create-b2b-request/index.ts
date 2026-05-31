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

    // Check if user is owner
    const userRole = user.user_metadata?.role || user.app_metadata?.role
    if (userRole !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only gallery owners can create B2B requests" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get request body
    const { target_vehicle_id, request_type, note } = await req.json()

    // Validate required fields
    if (!target_vehicle_id || !request_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate request type
    if (!["offer", "trade"].includes(request_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid request type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check if target vehicle exists
    const { data: targetVehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, gallery_id")
      .eq("id", target_vehicle_id)
      .single()

    if (vehicleError || !targetVehicle) {
      return new Response(
        JSON.stringify({ error: "Target vehicle not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get requester's gallery
    const { data: requesterGallery, error: galleryError } = await supabase
      .from("galleries")
      .select("id")
      .eq("owner_email", user.email)
      .single()

    if (galleryError || !requesterGallery) {
      return new Response(
        JSON.stringify({ error: "Requester gallery not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check if requester is trying to trade with their own vehicle
    if (targetVehicle.gallery_id === requesterGallery.id) {
      return new Response(
        JSON.stringify({ error: "Cannot create B2B request for your own vehicle" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create B2B request
    const { data: b2bRequest, error: insertError } = await supabase
      .from("b2b_requests")
      .insert({
        target_vehicle_id,
        requester_id: user.email,
        request_type,
        note: note || "",
        status: "pending",
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify(b2bRequest),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
