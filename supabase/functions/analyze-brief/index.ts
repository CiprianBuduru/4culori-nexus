import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { brief } = await req.json();
    
    if (!brief || brief.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Brief-ul este gol', suggestions: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*');

    if (recipesError) {
      console.error('Error fetching recipes:', recipesError);
      throw new Error('Nu am putut încărca rețetele');
    }

    if (!recipes || recipes.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], message: 'Nu există rețete definite. Adăugați rețete în Setări.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipeSummary = recipes.map(r => ({
      id: r.id, name: r.name, description: r.description,
      keywords: r.brief_keywords || [], basePrice: r.base_price, pricePerUnit: r.price_per_unit
    }));

    const systemPrompt = `Ești un asistent pentru o tipografie/print shop care analizează brief-uri de comenzi și sugerează rețete potrivite pentru calcul de costuri.

Rețetele disponibile sunt:
${JSON.stringify(recipeSummary, null, 2)}

Analizează brief-ul clientului și returnează un JSON cu rețetele potrivite și cantitățile estimate.

IMPORTANT: Răspunde DOAR cu JSON valid în formatul următor, fără text suplimentar:
{
  "suggestions": [
    {
      "recipeId": "uuid-ul rețetei",
      "recipeName": "numele rețetei",
      "quantity": număr estimat,
      "confidence": procentaj de potrivire (0-100),
      "reasoning": "explicație scurtă de ce s-a ales această rețetă"
    }
  ],
  "notes": "observații generale despre comandă"
}

Dacă nu găsești nicio rețetă potrivită, returnează suggestions: [] cu o notă explicativă.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analizează acest brief de comandă și sugerează rețetele potrivite:\n\n${brief}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Prea multe cereri. Încercați din nou mai târziu." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credit AI insuficient." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("Eroare la analiza AI");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) throw new Error("Răspuns AI gol");

    let parsedResponse;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      else if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      parsedResponse = JSON.parse(cleanContent.trim());
    } catch {
      parsedResponse = { suggestions: [], notes: 'Nu am putut interpreta răspunsul AI.' };
    }

    const enrichedSuggestions = (parsedResponse.suggestions || []).map((suggestion: any) => {
      const recipe = recipes.find(r => r.id === suggestion.recipeId);
      return { ...suggestion, recipe: recipe || null };
    }).filter((s: any) => s.recipe !== null);

    return new Response(
      JSON.stringify({ suggestions: enrichedSuggestions, notes: parsedResponse.notes || '' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-brief:', error);
    return new Response(
      JSON.stringify({ error: 'Eroare la analiza brief-ului' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
