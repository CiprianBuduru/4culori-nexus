import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  taskTitle: string;
  taskId: string;
  startDate: string;
  endDate: string;
  clientName?: string;
  operationName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-task-notification function called");
  
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
    const payload: NotificationRequest = await req.json();
    console.log("Received notification request:", payload);

    const { 
      employeeId, 
      employeeName, 
      employeeEmail, 
      taskTitle, 
      taskId,
      startDate, 
      endDate, 
      clientName,
      operationName 
    } = payload;

    // Use service role for DB operations
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase
      .from("notifications")
      .insert({
        user_id: employeeId,
        title: "Ai fost asignat la un task nou",
        message: `Ai fost asignat la task-ul "${taskTitle}"${clientName ? ` pentru clientul ${clientName}` : ''}. Perioada: ${new Date(startDate).toLocaleDateString('ro-RO')} - ${new Date(endDate).toLocaleDateString('ro-RO')}.`,
        type: "task_assigned",
        related_task_id: taskId,
      });

    if (dbError) {
      console.error("Error saving notification to database:", dbError);
    } else {
      console.log("Notification saved to database");
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 Task Nou Asignat</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">
            Salut <strong>${employeeName}</strong>,
          </p>
          <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">
            Ai fost asignat la un task nou în calendarul de producție:
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">${taskTitle}</h2>
            <div style="display: grid; gap: 10px;">
              ${clientName ? `<div style="display: flex; align-items: center; gap: 10px;"><span style="color: #64748b;">👤 Client:</span><span style="color: #1e293b; font-weight: 500;">${clientName}</span></div>` : ''}
              ${operationName ? `<div style="display: flex; align-items: center; gap: 10px;"><span style="color: #64748b;">⚙️ Operațiune:</span><span style="color: #1e293b; font-weight: 500;">${operationName}</span></div>` : ''}
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #64748b;">📅 Perioadă:</span>
                <span style="color: #1e293b; font-weight: 500;">${new Date(startDate).toLocaleDateString('ro-RO')} - ${new Date(endDate).toLocaleDateString('ro-RO')}</span>
              </div>
            </div>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">Acest email a fost trimis automat de sistemul de management al producției 4culori.</p>
        </div>
      </div>
    `;

    console.log("Attempting to send email to:", employeeEmail);

    const emailResponse = await resend.emails.send({
      from: "4culori Producție <onboarding@resend.dev>",
      to: [employeeEmail],
      subject: `📋 Ai fost asignat la task: ${taskTitle}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse, notificationSaved: !dbError }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-task-notification function:", error);
    return new Response(
      JSON.stringify({ error: "Eroare la trimiterea notificării" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
