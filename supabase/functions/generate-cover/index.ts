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
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

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

    // Download the logo image
    const logoResponse = await fetch(logo_url);
    if (!logoResponse.ok) throw new Error("Failed to download logo");
    const logoBuffer = await logoResponse.arrayBuffer();
    const logoBytes = new Uint8Array(logoBuffer);
    let logoBase64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < logoBytes.length; i += chunkSize) {
      logoBase64 += String.fromCharCode(...logoBytes.subarray(i, i + chunkSize));
    }
    logoBase64 = btoa(logoBase64);
    const logoContentType = logoResponse.headers.get('content-type') || 'image/png';

    // Use Gemini API directly for cover generation
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Create a professional service business cover banner (landscape 16:9 aspect ratio). Place the provided logo centered on a dark elegant gradient background going from dark charcoal (#1a1a1a) to dark gold (#8B6914). Add subtle decorative elements like thin lines or geometric patterns around the logo. Keep it minimal, modern and professional. The logo should be prominent and centered."
            },
            {
              inlineData: { mimeType: logoContentType, data: logoBase64 }
            }
          ]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart?.inlineData?.data) {
      throw new Error("No image generated from AI");
    }

    const generatedImageData = imagePart.inlineData.data;

    // Convert base64 to blob and upload to storage
    const imageBytes = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));

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
