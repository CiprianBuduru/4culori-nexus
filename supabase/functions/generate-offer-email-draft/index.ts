import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { clientName, products, subtotal, discount, discountAmount, total, notes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const productsSummary = (products || [])
      .map((p: any) => {
        const lines: string[] = [`${p.name}`];
        lines.push(`  \u2022 Tiraj: ${p.quantity} buc`);
        const snap = p.configSnapshot;
        if (snap) {
          if (snap.formatLabel) lines.push(`  \u2022 Format: ${snap.formatLabel}`);
          if (snap.gsm) lines.push(`  \u2022 H\u00E2rtie: Color Copy ${snap.gsm} g/mp`);
          if (snap.colorModeLabel || snap.colorMode) lines.push(`  \u2022 Tipar: ${snap.colorModeLabel || snap.colorMode}`);
          if (snap.laminationLabel || snap.lamination) {
            const lam = snap.laminationLabel || (snap.lamination === 'none' ? 'F\u0103r\u0103 plastifiere' : snap.lamination);
            lines.push(`  \u2022 Plastifiere: ${lam}`);
          }
          if (snap.folds != null && snap.folds > 0) lines.push(`  \u2022 F\u0103l\u021Buire: ${snap.folds} ${snap.folds === 1 ? 'f\u0103l\u021Buire' : 'f\u0103l\u021Buiri'}`);
          if (snap.glue != null) lines.push(`  \u2022 Lipitur\u0103 prisma: ${snap.glue ? 'Da' : 'Nu'}`);
        } else if (p.details) {
          lines.push(`  \u2022 ${p.details}`);
        }
        lines.push(`  \u2022 Pre\u021B unitar: ${p.unitPrice.toFixed(2)} \u20AC + TVA`);
        lines.push(`  \u2022 Total: ${p.totalPrice.toFixed(2)} \u20AC + TVA`);
        return lines.join("\n");
      })
      .join("\n\n");

    const systemPrompt = `Ești un asistent comercial profesionist pentru o tipografie numită 4Culori din România. 
Generezi drafturi de email-uri de ofertă comercială în limba română.
Tonul trebuie să fie profesionist dar prietenos, concis și clar.
NU inventa informații suplimentare despre produse sau prețuri.
Folosește DOAR informațiile furnizate.
Email-ul trebuie să conțină:
1. Salut personalizat (dacă este disponibil numele clientului)
2. Rezumat al produselor solicitate cu specificațiile tehnice furnizate (hârtie, tipar, plastifiere, fălțuire, etc.)
3. Menționează că oferta detaliată este atașată / va fi trimisă separat
4. Menționează valabilitatea ofertei (30 zile)
5. Call to action politicos
6. Semnătură 4Culori
Prețurile sunt în EUR, fără TVA (menționează "+ TVA" unde e cazul).
NU include "Subject:" sau "Subiect:" în corpul emailului.
NU menționa costuri interne, DTP, setup, manoperă, mentenanță sau markup. Arată DOAR prețul final de vânzare.
Listează fiecare produs ca un bloc separat cu specificațiile sale tehnice.`;

    const userPrompt = `Generează un draft de email comercial cu următoarele detalii:

Client: ${clientName || "nestipulat"}

Produse:
${productsSummary || "Niciun produs specificat"}

Subtotal: ${(subtotal || 0).toFixed(2)} € + TVA
${discount > 0 ? `Discount: ${discount}% (-${(discountAmount || 0).toFixed(2)} €)` : ""}
Total: ${(total || 0).toFixed(2)} € + TVA

${notes ? `Note adiționale: ${notes}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limită de rate depășită, reîncearcă mai târziu." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credit insuficient. Adaugă fonduri în setări." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const draft = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-offer-email-draft error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
