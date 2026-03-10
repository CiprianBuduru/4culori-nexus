import { serve } from "https://deno.land/std@0.168.0/http/server.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Product configs matching the frontend PRINT_PRODUCTS
const PRODUCT_CONFIGS = {
  flyer: {
    id: 'flyer',
    name: 'Flyer',
    formats: ['DL', 'A6', 'A5', 'A4'],
    allowedGsm: [90, 120, 160, 200],
    colorModes: ['4+0', '4+4'],
    laminations: ['none', 'gloss_1', 'gloss_2', 'matte_1', 'matte_2', 'soft_1', 'soft_2'],
  },
  'business-card': {
    id: 'business-card',
    name: 'Cărți de vizită',
    formats: ['9x5', '8.5x5.5'],
    allowedGsm: [300, 350, 400],
    colorModes: ['4+0', '4+4'],
    laminations: ['none', 'gloss_1', 'gloss_2', 'matte_1', 'matte_2', 'soft_1', 'soft_2'],
  },
  pliant: {
    id: 'pliant',
    name: 'Pliant',
    formats: ['A4-tri', 'A3-bi', 'DL-bi'],
    allowedGsm: [120, 160, 200, 250],
    colorModes: ['4+4'],
    laminations: ['none', 'gloss_1', 'gloss_2', 'matte_1', 'matte_2'],
  },
  brosura: {
    id: 'brosura',
    name: 'Broșură',
    formats: ['A5', 'A4'],
    allowedGsm: [90, 120, 160],
    colorModes: ['4+4'],
    laminations: ['none', 'gloss_1', 'matte_1'],
  },
  afis: {
    id: 'afis',
    name: 'Afiș',
    formats: ['A3', 'A2', 'SRA3'],
    allowedGsm: [160, 200, 250, 300],
    colorModes: ['4+0'],
    laminations: ['none', 'gloss_1', 'matte_1'],
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check removed – function uses verify_jwt = false in config.toml
  // and is a stateless calculator tool, not a data-access endpoint.

  try {
    const { brief } = await req.json();

    if (!brief || brief.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Brief-ul este gol' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Ești un asistent pentru o tipografie care analizează brief-uri de la clienți și extrage parametri structurați pentru calcul de preț.

Produsele suportate și configurațiile lor:
${JSON.stringify(PRODUCT_CONFIGS, null, 2)}

REGULI IMPORTANTE:
1. Extrage DOAR valorile care sunt clar menționate sau puternic implicate în brief.
2. NU inventa valori lipsă. Dacă o valoare nu e clară, NU o include.
3. Mapează gramajul la cea mai apropiată valoare din lista permisă a produsului.
4. "față-verso" sau "2 fețe" = "4+4" pentru color, "1+1" pentru B/W.
5. "color" sau "full color" = "4+0" (1 față) sau "4+4" (2 fețe).
6. "mată" = matte, "lucioasă" = gloss, "soft touch" = soft.
7. "1 față" = sufixul "_1", "2 fețe" = sufixul "_2" la plastifiere.
8. "cărți de vizită" sau "business cards" = product_type "business-card".
9. "pliante" sau "trifold" = product_type "pliant".
10. "broșuri" sau "cataloage mici capsate" = product_type "brosura".
11. "afișe" sau "postere" = product_type "afis".
12. Dacă produsul nu e clar, sugerează cele mai probabile 2-3 opțiuni.`;

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
          { role: "user", content: `Analizează acest brief de client și extrage parametrii pentru calculatorul de prețuri:\n\n"${brief}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_print_parameters",
              description: "Extrage parametrii structurați din brief-ul clientului pentru calculul de preț tipografie.",
              parameters: {
                type: "object",
                properties: {
                  product_type: {
                    type: "string",
                    enum: ["flyer", "business-card", "pliant", "brosura", "afis"],
                    description: "Tipul de produs detectat. Omite dacă nu e clar."
                  },
                  quantity: {
                    type: "number",
                    description: "Cantitatea/tirajul cerut. Omite dacă nu e menționat."
                  },
                  format: {
                    type: "string",
                    description: "Formatul detectat (ex: A5, A4, DL, 9x5, A4-tri). Omite dacă nu e clar."
                  },
                  is_custom_format: {
                    type: "boolean",
                    description: "true dacă formatul nu e în lista standard a produsului."
                  },
                  custom_pcs_per_sheet: {
                    type: "number",
                    description: "Bucăți per coală SRA3, doar dacă is_custom_format=true."
                  },
                  gsm: {
                    type: "number",
                    description: "Gramajul hârtiei detectat (mapat la valoarea permisă cea mai apropiată). Omite dacă nu e menționat."
                  },
                  color_mode: {
                    type: "string",
                    enum: ["4+0", "4+4", "1+0", "1+1"],
                    description: "Modul de tipar detectat. Omite dacă nu e clar."
                  },
                  lamination: {
                    type: "string",
                    enum: ["none", "gloss_1", "gloss_2", "matte_1", "matte_2", "soft_1", "soft_2"],
                    description: "Tipul de plastifiere. Omite dacă nu e menționat."
                  },
                  folding_type: {
                    type: "string",
                    description: "Tipul de fălțuire (doar pentru pliante): tri-fold, bi-fold, etc."
                  },
                  notes: {
                    type: "string",
                    description: "Observații suplimentare din brief care nu se mapează direct pe parametri."
                  },
                  confidence: {
                    type: "number",
                    description: "Nivel de încredere general 0-100."
                  },
                  missing_fields: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista câmpurilor care lipsesc sau sunt ambigue."
                  },
                  alternative_products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_type: { type: "string" },
                        reason: { type: "string" }
                      },
                      required: ["product_type", "reason"]
                    },
                    description: "Produse alternative sugerate dacă tipul nu e clar."
                  }
                },
                required: ["confidence", "missing_fields"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_print_parameters" } },
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
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("Eroare la analiza AI");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Răspuns AI fără parametri structurați");
    }

    let extracted;
    try {
      extracted = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Nu am putut interpreta răspunsul AI.");
    }

    // Validate extracted values against product config
    const validation = validateExtraction(extracted);

    // Determine status
    let status: 'complete' | 'partial' | 'ambiguous' = 'complete';
    if (!extracted.product_type || (extracted.alternative_products && extracted.alternative_products.length > 1)) {
      status = 'ambiguous';
    } else if (validation.missingFields.length > 0) {
      status = 'partial';
    }

    return new Response(
      JSON.stringify({
        extraction: extracted,
        validation,
        status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-print-brief:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Eroare la analiza brief-ului' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function validateExtraction(extracted: any) {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (!extracted.product_type) {
    missingFields.push('product_type');
  }

  if (!extracted.quantity) {
    missingFields.push('quantity');
  }

  if (!extracted.format && !extracted.is_custom_format) {
    missingFields.push('format');
  }

  if (!extracted.gsm) {
    missingFields.push('gsm');
  }

  if (!extracted.color_mode) {
    missingFields.push('color_mode');
  }

  // Validate against product config if we have a product type
  if (extracted.product_type && PRODUCT_CONFIGS[extracted.product_type as keyof typeof PRODUCT_CONFIGS]) {
    const config = PRODUCT_CONFIGS[extracted.product_type as keyof typeof PRODUCT_CONFIGS];

    if (extracted.format && !config.formats.includes(extracted.format) && !extracted.is_custom_format) {
      warnings.push(`Formatul "${extracted.format}" nu e standard pentru ${config.name}. Va fi tratat ca format personalizat.`);
      extracted.is_custom_format = true;
    }

    if (extracted.gsm && !config.allowedGsm.includes(extracted.gsm)) {
      const closest = config.allowedGsm.reduce((prev, curr) =>
        Math.abs(curr - extracted.gsm) < Math.abs(prev - extracted.gsm) ? curr : prev
      );
      warnings.push(`Gramajul ${extracted.gsm}g nu e disponibil pentru ${config.name}. Se va folosi ${closest}g.`);
      extracted.gsm = closest;
    }

    if (extracted.color_mode && !config.colorModes.includes(extracted.color_mode)) {
      warnings.push(`Modul de tipar "${extracted.color_mode}" nu e disponibil pentru ${config.name}.`);
      extracted.color_mode = undefined;
      missingFields.push('color_mode');
    }

    if (extracted.lamination && !config.laminations.includes(extracted.lamination)) {
      warnings.push(`Plastifierea "${extracted.lamination}" nu e disponibilă pentru ${config.name}.`);
      extracted.lamination = undefined;
    }
  }

  // Merge AI missing_fields with our validation
  const allMissing = [...new Set([...missingFields, ...(extracted.missing_fields || [])])];

  return { missingFields: allMissing, warnings };
}
