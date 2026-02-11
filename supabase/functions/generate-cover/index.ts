import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { tenant_id, logo_url } = await req.json();
    if (!tenant_id || !logo_url) {
      return new Response(
        JSON.stringify({ error: "tenant_id and logo_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating cover for tenant:", tenant_id);

    // Use AI to generate a cover image with the logo
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Create a professional barbershop cover banner (landscape 16:9 aspect ratio). Place the provided logo centered on a dark elegant gradient background going from dark charcoal (#1a1a1a) to dark emerald (#064e3b). Add subtle decorative elements like thin lines or geometric patterns around the logo. Keep it minimal, modern and professional. The logo should be prominent and centered."
              },
              {
                type: "image_url",
                image_url: { url: logo_url }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      throw new Error("No image generated from AI");
    }

    // Convert base64 to blob and upload to storage
    const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `${tenant_id}/cover-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("tenant-media")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("tenant-media")
      .getPublicUrl(fileName);

    const coverUrl = publicUrlData.publicUrl;

    // Update tenant record
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ cover_url: coverUrl })
      .eq("id", tenant_id);

    if (updateError) throw updateError;

    console.log("Cover generated successfully:", coverUrl);

    return new Response(
      JSON.stringify({ success: true, cover_url: coverUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating cover:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
