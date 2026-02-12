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
    const { type, table, item_name, item_description, user_instruction, item_id } = await req.json();

    if (!type || !['text', 'image'].includes(type)) {
      return new Response(JSON.stringify({ error: 'type must be "text" or "image"' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GOOGLE_GEMINI_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'text') {
      // Generate title and description
      const contextMap: Record<string, string> = {
        products: 'produto de barbearia/grooming',
        services: 'serviço de barbearia',
        service_packages: 'pacote de serviços de barbearia',
        subscription_plans: 'plano de assinatura de barbearia',
      };
      const context = contextMap[table as string] || 'item de barbearia';

      const prompt = `Você é um especialista em marketing para barbearias premium. 
Gere um título (máximo 40 caracteres) e uma descrição curta e persuasiva (máximo 120 caracteres) para um ${context}.

${item_name ? `Nome atual: "${item_name}"` : ''}
${item_description ? `Descrição atual: "${item_description}"` : ''}
${user_instruction ? `Instrução do usuário: "${user_instruction}"` : ''}

Foque em:
- Linguagem que converte (urgência, exclusividade, benefício claro)
- Tom masculino e premium
- Ser direto e objetivo

Responda EXATAMENTE neste formato JSON (sem markdown):
{"title": "...", "description": "..."}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;
      
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8 },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini text error:', response.status, errText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Erro ao gerar conteúdo com IA' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse JSON from response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Failed to parse AI text response:', textContent);
        return new Response(JSON.stringify({ error: 'IA não retornou formato esperado' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify({ success: true, title: result.title, description: result.description }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'image') {
      // Generate image from name/description
      if (!item_id || !table) {
        return new Response(JSON.stringify({ error: 'item_id and table are required for image generation' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const finalTable = table as AllowedTable;
      if (!ALLOWED_TABLES.includes(finalTable)) {
        return new Response(JSON.stringify({ error: 'Invalid table' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Get item info - products table has no description column
      const selectCols = finalTable === 'products' ? 'name, tenant_id' : 'name, tenant_id, description';
      const { data: item, error: itemError } = await supabase
        .from(finalTable)
        .select(selectCols)
        .eq('id', item_id)
        .single();

      if (itemError || !item) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const imagePrompts: Record<AllowedTable, string> = {
        products: `Professional product photography of a premium barbershop/grooming product called "${item.name}"${item.description ? `, described as: ${item.description}` : ''}. Dark moody background with warm amber lighting. Studio quality, centered product, luxurious barbershop aesthetic. High resolution, sharp focus, e-commerce style.`,
        services: `Professional barbershop promotional photo representing the service "${item.name}"${item.description ? `, described as: ${item.description}` : ''}. Warm lighting, premium barbershop interior, elegant masculine atmosphere. High quality, sharp focus, marketing material style.`,
        service_packages: `Elegant promotional image for a barbershop package called "${item.name}"${item.description ? `, described as: ${item.description}` : ''}. Premium look with warm tones, luxury grooming atmosphere. Clean composition, professional marketing style.`,
        subscription_plans: `Premium subscription plan promotional image for "${item.name}"${item.description ? `, described as: ${item.description}` : ''}. Exclusive, VIP feel with warm barbershop tones. Modern, clean, professional marketing aesthetic.`,
      };

      console.log(`Generating image for ${finalTable}: ${item.name}`);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;

      const aiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompts[finalTable] }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
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
        return new Response(JSON.stringify({ error: 'Erro ao gerar imagem com IA' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();

      let generatedImageData: string | null = null;
      let generatedMimeType = 'image/png';

      for (const candidate of (aiData.candidates || [])) {
        for (const part of (candidate.content?.parts || [])) {
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
        return new Response(JSON.stringify({ error: 'IA não retornou imagem. Tente novamente.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upload to storage
      const binaryData = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));
      const ext = generatedMimeType.includes('png') ? 'png' : 'jpeg';
      const folder = finalTable.replace('_', '-');
      const fileName = `${item.tenant_id}/${folder}/generated-${item_id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-media')
        .upload(fileName, binaryData, { contentType: generatedMimeType, upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return new Response(JSON.stringify({ error: 'Erro ao salvar imagem gerada' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: { publicUrl } } = supabase.storage.from('tenant-media').getPublicUrl(fileName);

      // Update item photo
      await supabase.from(finalTable).update({ photo_url: publicUrl }).eq('id', item_id);

      console.log(`Image generated successfully for ${finalTable}/${item_id}`);

      return new Response(JSON.stringify({ success: true, photo_url: publicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid type' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-generate-content:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
