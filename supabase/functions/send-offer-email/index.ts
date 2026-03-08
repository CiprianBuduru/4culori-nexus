import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OfferProduct {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

interface SendOfferEmailRequest {
  clientEmail: string;
  clientName: string;
  offerNumber: string;
  products: OfferProduct[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  total: number;
  validUntil: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const {
      clientEmail, clientName, offerNumber, products,
      subtotal, discount, discountAmount, total, validUntil,
    }: SendOfferEmailRequest = await req.json();

    console.log(`Sending offer ${offerNumber} to ${clientEmail}`);

    const productsHtml = products.map(p => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${p.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${p.unitPrice.toFixed(2)} RON</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${p.totalPrice.toFixed(2)} RON</td>
      </tr>
    `).join('');

    const discountHtml = discount > 0 ? `
      <tr>
        <td colspan="3" style="padding: 10px; text-align: right; color: #ff7f50;">Discount (${discount}%):</td>
        <td style="padding: 10px; text-align: right; color: #ff7f50;">-${discountAmount.toFixed(2)} RON</td>
      </tr>
    ` : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0071bc; color: white; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px; }
          .offer-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
          .total-row { background: #0071bc; color: white; font-weight: bold; }
          .total-row td { padding: 12px 10px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          .cta { text-align: center; margin: 30px 0; }
          .cta a { background: #0071bc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>4CULORI</h1>
            <p style="margin: 5px 0 0 0;">Tipografie & Print</p>
          </div>
          <div class="content">
            <h2>Bună ziua${clientName ? `, ${clientName}` : ''}!</h2>
            <p>Vă mulțumim pentru interesul acordat serviciilor noastre. Mai jos găsiți oferta de preț solicitată:</p>
            <div class="offer-info">
              <strong>Ofertă:</strong> ${offerNumber}<br>
              <strong>Data:</strong> ${new Date().toLocaleDateString('ro-RO')}<br>
              <strong>Valabilă până:</strong> ${validUntil}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Produs</th>
                  <th style="text-align: center;">Cantitate</th>
                  <th style="text-align: right;">Preț unit.</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${productsHtml}
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                  <td style="padding: 10px; text-align: right;"><strong>${subtotal.toFixed(2)} RON</strong></td>
                </tr>
                ${discountHtml}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="3" style="text-align: right;">TOTAL:</td>
                  <td style="text-align: right;">${total.toFixed(2)} RON</td>
                </tr>
              </tfoot>
            </table>
            <p><strong>Note:</strong></p>
            <ul>
              <li>Prețurile includ TVA</li>
              <li>Oferta este valabilă 30 de zile de la data emiterii</li>
              <li>Pentru comenzi speciale, termenul de livrare va fi stabilit la confirmare</li>
            </ul>
            <div class="cta"><a href="https://4culori.ro">Vizitează site-ul nostru</a></div>
            <p>Pentru orice întrebări sau pentru a confirma comanda, nu ezitați să ne contactați.</p>
            <p>Cu stimă,<br><strong>Echipa 4Culori</strong></p>
          </div>
          <div class="footer"><p>4Culori • Tipografie & Personalizări • www.4culori.ro</p></div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "4Culori <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `Ofertă de preț ${offerNumber} - 4Culori`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending offer email:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Eroare la trimiterea email-ului" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
