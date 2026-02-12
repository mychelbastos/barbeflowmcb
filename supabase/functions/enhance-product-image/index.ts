import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, image_url } = await req.json();

    if (!product_id || !image_url) {
      return new Response(JSON.stringify({ error: 'product_id and image_url are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GOOGLE_GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get product info for context
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('name, tenant_id')
      .eq('id', product_id)
      .single();

    if (prodError || !product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Enhancing image for product: ${product.name}`);

    // Download the source image and convert to base64
    const imgResponse = await fetch(image_url);
    if (!imgResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to download source image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imgBuffer = await imgResponse.arrayBuffer();
    const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

    // Call Google Gemini API directly
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;

    const aiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Transform this product photo into a professional barbershop/grooming product image. Make it look like a premium e-commerce product shot with:
- Dark moody barbershop-themed background with warm amber/gold lighting
- Professional studio-quality lighting on the product
- Subtle barbershop elements (wood texture, leather, razor, warm tones)
- Sharp focus and high contrast
- The product "${product.name}" should be the hero, centered and prominent
Keep the actual product exactly as it is, only enhance the presentation and background.`,
              },
              {
                inlineData: {
                  mimeType: contentType,
                  data: imgBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('Gemini API error:', aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Erro ao processar imagem com IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();

    // Extract generated image from Gemini response
    let generatedImageData: string | null = null;
    let generatedMimeType = 'image/png';

    const candidates = aiData.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          generatedImageData = part.inlineData.data;
          generatedMimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }
      if (generatedImageData) break;
    }

    if (!generatedImageData) {
      console.error('No image in Gemini response:', JSON.stringify(aiData).substring(0, 500));
      return new Response(JSON.stringify({ error: 'IA não retornou imagem' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert base64 to binary and upload
    const binaryData = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));
    const ext = generatedMimeType.includes('png') ? 'png' : 'jpeg';
    const fileName = `${product.tenant_id}/products/enhanced-${product_id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('tenant-media')
      .upload(fileName, binaryData, {
        contentType: generatedMimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Erro ao salvar imagem melhorada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('tenant-media')
      .getPublicUrl(fileName);

    // Update product photo
    const { error: updateError } = await supabase
      .from('products')
      .update({ photo_url: publicUrl })
      .eq('id', product_id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    console.log(`Image enhanced successfully for product ${product_id}`);

    return new Response(JSON.stringify({ success: true, photo_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhance-product-image:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
