import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchFromANAF(cuiNumber: number, date: string): Promise<any> {
  const requestBody = [{ cui: cuiNumber, data: date }];
  
  const response = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`ANAF status: ${response.status}`);
  }

  const text = await response.text();
  if (text.includes('<!DOCTYPE') || text.includes('<html')) {
    throw new Error('ANAF returned HTML instead of JSON');
  }

  return JSON.parse(text);
}

async function fetchFromMfinante(cui: string): Promise<any> {
  // Alternative: Try mfinante.gov.ro API
  const response = await fetch(`https://mfinante.gov.ro/static/10/Mfp/info-formulare/json/codF_${cui}.json`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  
  if (!response.ok) {
    throw new Error(`MFinante status: ${response.status}`);
  }
  
  return response.json();
}

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

    const cleanCui = cui.toString().replace(/^RO/i, '').replace(/\s/g, '').trim();
    const cuiNumber = parseInt(cleanCui, 10);
    
    if (isNaN(cuiNumber)) {
      return new Response(
        JSON.stringify({ error: 'CUI invalid - trebuie să conțină doar cifre' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Looking up company with CUI: ${cuiNumber}`);
    const today = new Date().toISOString().split('T')[0];

    let result: any = null;
    let errorMsg = '';

    // Try ANAF first
    try {
      const anafData = await fetchFromANAF(cuiNumber, today);
      console.log('ANAF response:', JSON.stringify(anafData));
      
      if (anafData.cod === 200 && anafData.found && anafData.found.length > 0) {
        const companyInfo = anafData.found[0];
        const dateGenerale = companyInfo.date_generale || {};
        const inregistrareScopTva = companyInfo.inregistrare_scop_Tva || {};

        result = {
          cui: cleanCui,
          name: dateGenerale.denumire || '',
          address: dateGenerale.adresa || '',
          phone: dateGenerale.telefon || '',
          platitorTva: inregistrareScopTva.scpTVA || false,
          statusInactiv: companyInfo.stare_inactiv?.statusInactivi || false,
        };
      } else if (anafData.notfound && anafData.notfound.length > 0) {
        errorMsg = 'CUI-ul nu a fost găsit în baza de date ANAF';
      }
    } catch (anafError) {
      console.log('ANAF error:', anafError);
      errorMsg = 'Serviciul ANAF nu este disponibil momentan';
    }

    // If ANAF failed, try MFinante
    if (!result) {
      try {
        const mfData = await fetchFromMfinante(cleanCui);
        console.log('MFinante response:', JSON.stringify(mfData));
        
        if (mfData && mfData.denumire) {
          result = {
            cui: cleanCui,
            name: mfData.denumire || '',
            address: mfData.adresa || '',
            phone: '',
            platitorTva: false,
            statusInactiv: false,
          };
        }
      } catch (mfError) {
        console.log('MFinante error:', mfError);
      }
    }

    if (result) {
      console.log('Returning company data:', JSON.stringify(result));
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All sources failed - return 200 with error flag for better client handling
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMsg || 'Nu s-au putut prelua datele. API-ul ANAF poate fi temporar indisponibil.',
        suggestion: 'https://mfinante.gov.ro/infocodfiscal'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-company:', error);
    return new Response(
      JSON.stringify({ error: 'Eroare la preluarea datelor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
