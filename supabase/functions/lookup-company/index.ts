import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cui } = await req.json();
    
    if (!cui) {
      return new Response(
        JSON.stringify({ error: 'CUI is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean CUI - remove RO prefix if present and any spaces
    const cleanCui = cui.toString().replace(/^RO/i, '').replace(/\s/g, '').trim();
    
    console.log(`Looking up company with CUI: ${cleanCui}`);

    // Get current date in required format
    const today = new Date().toISOString().split('T')[0];

    // Call ANAF API
    const anafResponse = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          cui: parseInt(cleanCui),
          data: today
        }
      ])
    });

    if (!anafResponse.ok) {
      console.error(`ANAF API error: ${anafResponse.status}`);
      return new Response(
        JSON.stringify({ error: 'Nu s-au putut prelua datele de la ANAF' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anafData = await anafResponse.json();
    console.log('ANAF response:', JSON.stringify(anafData));

    if (!anafData.found || anafData.found.length === 0) {
      return new Response(
        JSON.stringify({ error: 'CUI-ul nu a fost găsit în baza de date ANAF' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyData = anafData.found[0];
    
    // Extract and format address
    const addressParts = [];
    if (companyData.adresa_sediu_social) {
      addressParts.push(companyData.adresa_sediu_social);
    } else {
      if (companyData.sdenumire_Strada) addressParts.push(companyData.sdenumire_Strada);
      if (companyData.snumar_Strada) addressParts.push(`Nr. ${companyData.snumar_Strada}`);
      if (companyData.sdenumire_Localitate) addressParts.push(companyData.sdenumire_Localitate);
      if (companyData.sdenumire_Judet) addressParts.push(`Jud. ${companyData.sdenumire_Judet}`);
    }

    const result = {
      cui: cleanCui,
      name: companyData.denumire || '',
      address: companyData.adresa || addressParts.join(', ') || '',
      phone: companyData.telefon || '',
      platitorTva: companyData.scpTVA || false,
      statusInactiv: companyData.statusInactivi || false,
      dataInregistrare: companyData.data_inregistrare || null,
    };

    console.log('Returning company data:', JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-company:', error);
    return new Response(
      JSON.stringify({ error: 'Eroare la preluarea datelor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
