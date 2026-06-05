import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: "legacy_edge_function_retired",
      message: "Bu eski Supabase Edge Function kapatıldı. Lütfen Cebindegaleri panel API akışını kullanın.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  )
})
