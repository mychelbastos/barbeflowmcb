import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_TABLES = ['products', 'services', 'service_packages', 'subscription_plans'] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { item_id, image_url, table, product_id } = await req.json();

    // Backward compatibility: support old product_id param
    const finalId = item_id || product_id;
    const finalTable: AllowedTable = (table as AllowedTable) || 'products';

    if (!finalId || !image_url) {
      return new Response(JSON.stringify({ error: 'item_id and image_url are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_TABLES.includes(finalTable)) {
      return new Response(JSON.stringify({ error: 'Invalid table' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GOOGLE_GEMINI_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get item info
    const { data: item, error: itemError } = await supabase
      .from(finalTable)
      .select('name, tenant_id')
      .eq('id', finalId)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Enhancing image for ${finalTable}: ${item.name}`);

    // Download the source image
    const imgResponse = await fetch(image_url);
    if (!imgResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to download source image' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imgBuffer = await imgResponse.arrayBuffer();
    const bytes = new Uint8Array(imgBuffer);
    let imgBase64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      imgBase64 += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    imgBase64 = btoa(imgBase64);
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

    // Build prompt based on table type
    const prompts: Record<AllowedTable, string> = {
      products: `Transform this product photo into a professional premium product image. Make it look like a premium e-commerce product shot with:
- Dark moody background with warm amber/gold lighting
- Professional studio-quality lighting on the product
- Subtle premium elements (wood texture, leather, warm tones)
- Sharp focus and high contrast
- The product "${item.name}" should be the hero, centered and prominent
Keep the actual product exactly as it is, only enhance the presentation and background.`,
      services: `Transform this service photo into a professional marketing image. Make it look like a premium promotional shot with:
- Professional studio lighting with warm, inviting tones
- Clean, elegant atmosphere
- Sharp focus on the main subject
- High-end professional aesthetic
- The service "${item.name}" should be clearly represented
Keep the main subject as is, enhance lighting, background and overall quality.`,
      service_packages: `Transform this image into a professional promotional photo for a service package. Make it look premium and appealing with:
- Clean, modern aesthetic with warm tones
- Professional lighting and composition
- High-end spa atmosphere
- The package "${item.name}" should feel luxurious and valuable
Enhance the overall quality while keeping the original subject intact.`,
      subscription_plans: `Transform this image into a professional subscription plan promotional photo. Make it look premium with:
- Elegant, modern aesthetic suggesting recurring premium service
- Professional studio-quality lighting
- Warm, inviting atmosphere
- The plan "${item.name}" should convey exclusivity and value
Enhance quality and presentation while keeping the original subject.`,
    };

    // Call Gemini API directly for image editing
    const sourceDataUrl = `data:${contentType};base64,${imgBase64}`;

    const geminiImageUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;

    const aiResponse = await fetch(geminiImageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompts[finalTable] },
            { inlineData: { mimeType: contentType, data: imgBase64 } },
          ],
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('Gemini image error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Erro ao processar imagem com IA' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();

    // Extract inline image from Gemini response
    const parts = aiData.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart?.inlineData?.data) {
      console.error('No image in Gemini response:', JSON.stringify(aiData).substring(0, 500));
      return new Response(JSON.stringify({ error: 'IA não retornou imagem' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const generatedMimeType = imagePart.inlineData.mimeType || 'image/png';
    const generatedImageData = imagePart.inlineData.data;

    // Upload to storage
    const binaryData = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));
    const ext = generatedMimeType.includes('png') ? 'png' : 'jpeg';
    const folder = finalTable.replace('_', '-');
    const fileName = `${item.tenant_id}/${folder}/enhanced-${finalId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('tenant-media')
      .upload(fileName, binaryData, { contentType: generatedMimeType, upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Erro ao salvar imagem melhorada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { publicUrl } } = supabase.storage.from('tenant-media').getPublicUrl(fileName);

    // Update item photo
    await supabase.from(finalTable).update({ photo_url: publicUrl }).eq('id', finalId);

    console.log(`Image enhanced successfully for ${finalTable}/${finalId}`);

    return new Response(JSON.stringify({ success: true, photo_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhance-product-image:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
