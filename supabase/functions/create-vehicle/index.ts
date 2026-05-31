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

    // Check if user is admin or owner
    const userRole = user.user_metadata?.role || user.app_metadata?.role
    if (userRole !== "admin" && userRole !== "owner") {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get request body
    const { gallery_id, slug, brand, model, year, price, km, fuel, transmission, color, description, category } = await req.json()

    // Validate required fields
    if (!gallery_id || !slug || !brand || !model) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // If owner, verify they own the gallery
    if (userRole === "owner") {
      const { data: gallery, error: galleryError } = await supabase
        .from("galleries")
        .select("id")
        .eq("id", gallery_id)
        .eq("owner_email", user.email)
        .single()

      if (galleryError || !gallery) {
        return new Response(
          JSON.stringify({ error: "Gallery not found or access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    // Create vehicle
    const { data: vehicle, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        gallery_id,
        slug,
        brand,
        model,
        year: Number(year),
        price: Number(price),
        km: Number(km),
        fuel,
        transmission,
        color: color || "",
        description: description || "",
        category: category || "vitrin",
        status: "active",
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Slug already exists for this gallery" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      throw insertError
    }

    return new Response(
      JSON.stringify(vehicle),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
