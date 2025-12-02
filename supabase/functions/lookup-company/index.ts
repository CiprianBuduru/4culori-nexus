import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const cuiNumber = parseInt(cleanCui, 10);
    
    if (isNaN(cuiNumber)) {
      return new Response(
        JSON.stringify({ error: 'CUI invalid - trebuie să conțină doar cifre' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Looking up company with CUI: ${cuiNumber}`);

    // Get current date in required format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    const requestBody = [
      {
        cui: cuiNumber,
        data: today
      }
    ];
    
    console.log('Request body:', JSON.stringify(requestBody));

    // Call ANAF API
    const anafResponse = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('ANAF response status:', anafResponse.status);
    
    const responseText = await anafResponse.text();
    console.log('ANAF response body:', responseText);

    if (!anafResponse.ok) {
      console.error(`ANAF API error: ${anafResponse.status} - ${responseText}`);
      return new Response(
        JSON.stringify({ error: `Eroare API ANAF: ${anafResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let anafData;
    try {
      anafData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse ANAF response:', e);
      return new Response(
        JSON.stringify({ error: 'Răspuns invalid de la ANAF' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('ANAF parsed data:', JSON.stringify(anafData));

    if (anafData.cod !== 200) {
      return new Response(
        JSON.stringify({ error: anafData.message || 'Eroare ANAF' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!anafData.found || anafData.found.length === 0) {
      return new Response(
        JSON.stringify({ error: 'CUI-ul nu a fost găsit în baza de date ANAF' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyInfo = anafData.found[0];
    const dateGenerale = companyInfo.date_generale || {};
    const inregistrareScopTva = companyInfo.inregistrare_scop_Tva || {};

    const result = {
      cui: cleanCui,
      name: dateGenerale.denumire || '',
      address: dateGenerale.adresa || '',
      phone: dateGenerale.telefon || '',
      platitorTva: inregistrareScopTva.scpTVA || false,
      statusInactiv: companyInfo.stare_inactiv?.statusInactivi || false,
    };

    console.log('Returning company data:', JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-company:', error);
    return new Response(
      JSON.stringify({ error: 'Eroare la preluarea datelor: ' + (error instanceof Error ? error.message : 'Unknown') }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
