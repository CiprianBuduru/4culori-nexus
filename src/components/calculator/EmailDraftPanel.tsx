import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailDraftPanelProps {
  clientName: string;
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
}

export function EmailDraftPanel({
  clientName,
  products,
  subtotal,
  discount,
  discountAmount,
  total,
  disabled,
}: EmailDraftPanelProps) {
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

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
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[200px] text-sm"
              placeholder="Draft-ul emailului va apărea aici..."
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="gap-1.5"
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
              <p className="text-xs text-muted-foreground self-center">
                Revizuiește și editează înainte de trimitere
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
