import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderNotificationRequest {
  orderId: string;
  orderNumber: string;
  orderName?: string;
  clientName?: string;
  previousStatus: string;
  newStatus: string;
  notifyEmail?: string;
}

const statusLabels: Record<string, string> = {
  pending: 'În așteptare',
  in_progress: 'În lucru',
  completed: 'Finalizată',
  cancelled: 'Anulată',
  dtp: 'DTP',
  bt_waiting: 'Așteaptă BT',
  bt_approved: 'BT Aprobat',
  production: 'În Producție',
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-order-notification function called");
  
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
    const payload: OrderNotificationRequest = await req.json();
    console.log("Received order notification request:", payload);

    const { orderId, orderNumber, orderName, clientName, previousStatus, newStatus, notifyEmail } = payload;

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const prevLabel = statusLabels[previousStatus] || previousStatus;
    const newLabel = statusLabels[newStatus] || newStatus;

    const { error: dbError } = await supabase
      .from("notifications")
      .insert({
        user_id: null,
        title: `Comandă ${orderNumber} - Status actualizat`,
        message: `Comanda ${orderNumber}${orderName ? ` (${orderName})` : ''}${clientName ? ` pentru ${clientName}` : ''} a trecut de la "${prevLabel}" la "${newLabel}".`,
        type: "info",
        related_task_id: null,
      });

    if (dbError) {
      console.error("Error saving notification to database:", dbError);
    }

    let emailResponse = null;
    if (notifyEmail) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📦 Status Comandă Actualizat</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">Statusul comenzii a fost actualizat:</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Comandă ${orderNumber}</h2>
              ${orderName ? `<p style="color: #64748b; margin: 0 0 10px 0;">${orderName}</p>` : ''}
              ${clientName ? `<p style="color: #64748b; margin: 0 0 15px 0;">👤 Client: <strong>${clientName}</strong></p>` : ''}
              <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: #f1f5f9; border-radius: 6px;">
                <div style="text-align: center;"><div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">De la</div><div style="background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 4px; font-weight: 500;">${prevLabel}</div></div>
                <div style="font-size: 24px; color: #94a3b8;">→</div>
                <div style="text-align: center;"><div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">La</div><div style="background: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 4px; font-weight: 500;">${newLabel}</div></div>
              </div>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">Acest email a fost trimis automat de sistemul de management 4culori.</p>
          </div>
        </div>
      `;

      emailResponse = await resend.emails.send({
        from: "4culori Producție <onboarding@resend.dev>",
        to: [notifyEmail],
        subject: `📦 Comandă ${orderNumber} - ${newLabel}`,
        html: emailHtml,
      });

      console.log("Email sent successfully:", emailResponse);
    }

    return new Response(
      JSON.stringify({ success: true, emailResponse, notificationSaved: !dbError }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(
      JSON.stringify({ error: "Eroare la trimiterea notificării" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
