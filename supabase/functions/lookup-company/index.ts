import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchFromANAF(cuiNumber: number, date: string): Promise<any> {
  const requestBody = [{ cui: cuiNumber, data: date }];
  const response = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) throw new Error(`ANAF status: ${response.status}`);
  const text = await response.text();
  if (text.includes('<!DOCTYPE') || text.includes('<html')) throw new Error('ANAF returned HTML instead of JSON');
  return JSON.parse(text);
}

async function fetchFromMfinante(cui: string): Promise<any> {
  const response = await fetch(`https://mfinante.gov.ro/static/10/Mfp/info-formulare/json/codF_${cui}.json`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
  });
  if (!response.ok) throw new Error(`MFinante status: ${response.status}`);
  return response.json();
}

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

    try {
      const anafData = await fetchFromANAF(cuiNumber, today);
      if (anafData.cod === 200 && anafData.found && anafData.found.length > 0) {
        const companyInfo = anafData.found[0];
        const dateGenerale = companyInfo.date_generale || {};
        const inregistrareScopTva = companyInfo.inregistrare_scop_Tva || {};
        result = {
          cui: cleanCui, name: dateGenerale.denumire || '', address: dateGenerale.adresa || '',
          phone: dateGenerale.telefon || '', platitorTva: inregistrareScopTva.scpTVA || false,
          statusInactiv: companyInfo.stare_inactiv?.statusInactivi || false,
        };
      } else if (anafData.notfound && anafData.notfound.length > 0) {
        errorMsg = 'CUI-ul nu a fost găsit în baza de date ANAF';
      }
    } catch (anafError) {
      errorMsg = 'Serviciul ANAF nu este disponibil momentan';
    }

    if (!result) {
      try {
        const mfData = await fetchFromMfinante(cleanCui);
        if (mfData && mfData.denumire) {
          result = { cui: cleanCui, name: mfData.denumire || '', address: mfData.adresa || '', phone: '', platitorTva: false, statusInactiv: false };
        }
      } catch {}
    }

    if (result) {
      return new Response(JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMsg || 'Nu s-au putut prelua datele.', suggestion: 'https://mfinante.gov.ro/infocodfiscal' }),
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
