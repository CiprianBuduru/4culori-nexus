import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Loader2, Sparkles, Copy, Check, Send, Eye, FileText, User, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailDraftPanelProps {
  clientName: string;
  clientEmail: string;
  products: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details?: string;
  }[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  total: number;
  disabled?: boolean;
  onSendEmail?: (draft: string, subject: string) => Promise<void>;
}

export function EmailDraftPanel({
  clientName,
  clientEmail,
  products,
  subtotal,
  discount,
  discountAmount,
  total,
  disabled,
  onSendEmail,
}: EmailDraftPanelProps) {
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('text');

  const offerNumber = `OF-${Date.now()}`;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-offer-email-draft', {
        body: {
          clientName,
          products,
          subtotal,
          discount,
          discountAmount,
          total,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setDraft(data.draft);
      setSubject(`Ofertă de preț – ${clientName || 'Client'} – 4Culori`);
      toast.success('Draft email generat cu succes');
    } catch (error: any) {
      console.error('Error generating email draft:', error);
      if (error?.message?.includes('429') || error?.status === 429) {
        toast.error('Limită de rate depășită, reîncearcă mai târziu.');
      } else if (error?.message?.includes('402') || error?.status === 402) {
        toast.error('Credit insuficient. Adaugă fonduri în setări.');
      } else {
        toast.error(error.message || 'Eroare la generarea draft-ului');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      toast.success('Draft copiat în clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nu s-a putut copia');
    }
  };

  const handleSend = async () => {
    if (!clientEmail.trim()) {
      toast.error('Introdu adresa de email a clientului');
      return;
    }
    if (!draft.trim()) {
      toast.error('Generează mai întâi un draft de email');
      return;
    }

    setIsSending(true);
    try {
      if (onSendEmail) {
        await onSendEmail(draft, subject);
      }
      toast.success(`Email trimis la ${clientEmail}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Eroare la trimiterea email-ului');
    } finally {
      setIsSending(false);
    }
  };

  const renderPreviewHtml = () => {
    const safeProducts = products ?? [];
    const safeDraft = draft ?? '';
    const safeSubtotal = subtotal ?? 0;
    const safeTotal = total ?? 0;
    const safeDiscount = discount ?? 0;
    const safeDiscountAmount = discountAmount ?? 0;

    const paragraphs = safeDraft
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '<br/>';
        return `<p style="margin:0 0 8px 0;line-height:1.6;">${trimmed}</p>`;
      })
      .join('');

    const productsRows = safeProducts
      .map(
        (p) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${p.name ?? ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${p.quantity ?? 0}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${(p.unitPrice ?? 0).toFixed(2)} €</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${(p.totalPrice ?? 0).toFixed(2)} €</td>
      </tr>`
      )
      .join('');

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#0071bc;color:white;padding:16px 20px;text-align:center;">
          <h1 style="margin:0;font-size:20px;">4CULORI</h1>
          <p style="margin:4px 0 0 0;font-size:12px;">Tipografie & Print</p>
        </div>
        <div style="padding:20px;">
          ${paragraphs}
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
            <thead>
              <tr style="background:#f5f5f5;">
                <th style="padding:8px 12px;text-align:left;">Produs</th>
                <th style="padding:8px 12px;text-align:center;">Cant.</th>
                <th style="padding:8px 12px;text-align:right;">Preț unit.</th>
                <th style="padding:8px 12px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${productsRows}
              <tr>
                <td colspan="3" style="padding:8px 12px;text-align:right;"><strong>Subtotal:</strong></td>
                <td style="padding:8px 12px;text-align:right;"><strong>${safeSubtotal.toFixed(2)} € + TVA</strong></td>
              </tr>
              ${
                safeDiscount > 0
                  ? `<tr>
                <td colspan="3" style="padding:8px 12px;text-align:right;color:#ff7f50;">Discount (${safeDiscount}%):</td>
                <td style="padding:8px 12px;text-align:right;color:#ff7f50;">-${safeDiscountAmount.toFixed(2)} €</td>
              </tr>`
                  : ''
              }
            </tbody>
            <tfoot>
              <tr style="background:#0071bc;color:white;font-weight:bold;">
                <td colspan="3" style="padding:10px 12px;text-align:right;">TOTAL:</td>
                <td style="padding:10px 12px;text-align:right;">${safeTotal.toFixed(2)} € + TVA</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="text-align:center;padding:12px;color:#666;font-size:11px;border-top:1px solid #eee;">
          4Culori • Tipografie & Personalizări • www.4culori.ro
        </div>
      </div>
    `;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Draft Email Ofertă
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={handleGenerate}
          disabled={disabled || isGenerating}
          variant="outline"
          className="w-full gap-2"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generez draft-ul...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Generează draft email
            </>
          )}
        </Button>

        {draft && (
          <div className="space-y-3">
            {/* Metadata */}
            <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Destinatar:</span>
                <span className="font-medium">{clientName || '—'}</span>
                {clientEmail ? (
                  <Badge variant="secondary" className="text-xs">{clientEmail}</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Lipsă email</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Ofertă:</span>
                <span className="font-medium">{offerNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">PDF atașat:</span>
                <Badge variant="outline" className="text-xs">Oferta_{offerNumber}.pdf</Badge>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <Label className="text-xs">Subiect email</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subiect..."
                className="text-sm"
              />
            </div>

            <Separator />

            {/* Tabs: Text / Preview */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="text" className="flex-1 gap-1.5 text-xs">
                  <Mail className="h-3.5 w-3.5" />
                  Text email
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex-1 gap-1.5 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  Preview email
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[220px] text-sm"
                  placeholder="Draft-ul emailului va apărea aici..."
                />
                <div className="flex gap-2 mt-2">
                  <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copiat
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiază
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground self-center">
                    Editează textul înainte de trimitere
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-2">
                <div
                  className="border rounded-md overflow-hidden bg-white"
                  dangerouslySetInnerHTML={{ __html: renderPreviewHtml() }}
                />
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Send */}
            <Button
              onClick={handleSend}
              disabled={!clientEmail.trim() || !draft.trim() || isSending}
              className="w-full gap-2"
              size="sm"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Trimit...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Trimite pe Email
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Revizuiește draft-ul și previzualizarea înainte de trimitere
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
