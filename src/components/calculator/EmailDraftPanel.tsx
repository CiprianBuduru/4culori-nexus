import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Mail,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Send,
  Eye,
  FileText,
  User,
  Hash,
  X,
} from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('text');

  const offerNumber = `OF-${Date.now()}`;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setOpen(true);
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

      setDraft(data.draft ?? '');
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
    const safeEmail = (clientEmail ?? '').trim();
    const safeDraft = (draft ?? '').trim();

    if (!safeEmail) {
      toast.error('Introdu adresa de email a clientului');
      return;
    }
    if (!safeDraft) {
      toast.error('Generează mai întâi un draft de email');
      return;
    }

    setIsSending(true);
    try {
      if (onSendEmail) {
        await onSendEmail(draft, subject);
      }
      toast.success(`Email trimis la ${safeEmail}`);
      setOpen(false);
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

  const safeClientEmail = clientEmail || 'email@client';
  const safeClientName = clientName || '—';

  return (
    <>
      {/* Trigger buttons in the page */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleGenerate}
          disabled={disabled || isGenerating}
          variant="outline"
          className="w-full gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generez draft-ul...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generează draft email
            </>
          )}
        </Button>

        {draft && (
          <Button
            onClick={() => setOpen(true)}
            variant="outline"
            className="w-full gap-2"
            size="sm"
          >
            <Eye className="h-4 w-4" />
            Deschide preview email
          </Button>
        )}
      </div>

      {/* Large right-side drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl flex flex-col p-0 gap-0"
        >
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 flex-shrink-0">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Draft Email Ofertă
            </SheetTitle>
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Destinatar:</span>
                <span className="font-medium">{safeClientName}</span>
                <Badge variant="secondary" className="text-xs">
                  {safeClientEmail}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Ofertă:</span>
                <span className="font-medium">{offerNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">PDF atașat:</span>
                <Badge variant="outline" className="text-xs">
                  Oferta_{offerNumber}.pdf
                </Badge>
              </div>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Subiect email</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subiect..."
              />
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="w-full">
                <TabsTrigger value="text" className="flex-1 gap-1.5">
                  <Mail className="h-4 w-4" />
                  Text email
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex-1 gap-1.5">
                  <Eye className="h-4 w-4" />
                  Preview email
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                {draft ? (
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-[400px] text-sm leading-relaxed font-mono"
                    placeholder="Draft-ul emailului va apărea aici..."
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Mail className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">Niciun draft generat încă.</p>
                    <p className="text-xs mt-1">Apasă „Generează draft email" pentru a crea un draft.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                {draft ? (
                  <div
                    className="border rounded-lg overflow-hidden bg-white shadow-sm"
                    dangerouslySetInnerHTML={{ __html: renderPreviewHtml() }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Eye className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">Generează un draft pentru a vedea previzualizarea.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {isGenerating && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Se generează draft-ul email...</span>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Revizuiește draft-ul și previzualizarea înainte de trimitere
            </p>
          </div>

          {/* Footer */}
          <SheetFooter className="px-6 py-4 border-t bg-muted/30 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-2 w-full">
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!draft}
              >
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

              <div className="flex-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Închide
              </Button>

              <Button
                onClick={handleSend}
                disabled={!(clientEmail ?? '').trim() || !(draft ?? '').trim() || isSending}
                size="sm"
                className="gap-1.5"
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
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
