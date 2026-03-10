import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles, Loader2, AlertCircle, Lightbulb, CheckCircle2, AlertTriangle,
  ArrowRight, HelpCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type BriefAnalysisResult,
  type PrintCalculatorPrefill,
  FIELD_LABELS,
  PRODUCT_NAMES,
} from '@/types/briefAnalysis';

interface BriefAnalyzerProps {
  onApplyToCalculator: (prefill: PrintCalculatorPrefill) => void;
}

export function BriefAnalyzer({ onApplyToCalculator }: BriefAnalyzerProps) {
  const [brief, setBrief] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<BriefAnalysisResult | null>(null);

  const analyzeBrief = async () => {
    if (!brief.trim()) {
      toast.error('Introduceți un brief pentru analiză');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-print-brief', {
        body: { brief },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResult(data as BriefAnalysisResult);

      if (data.status === 'complete') {
        toast.success('Brief complet – gata de aplicat în calculator');
      } else if (data.status === 'partial') {
        toast.info('Brief parțial – unele câmpuri lipsesc');
      } else {
        toast.warning('Brief ambiguu – verificați sugestiile');
      }
    } catch (error) {
      console.error('Error analyzing brief:', error);
      toast.error('Eroare la analiza brief-ului');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = (productType?: string) => {
    if (!result) return;
    const ext = result.extraction;
    const selectedProduct = productType || ext.product_type;
    if (!selectedProduct) {
      toast.error('Selectați un tip de produs');
      return;
    }

    const prefill: PrintCalculatorPrefill = {
      productId: selectedProduct,
      format: ext.is_custom_format ? 'custom' : ext.format,
      customPcsPerSheet: ext.custom_pcs_per_sheet,
      paperWeight: ext.gsm,
      colorMode: ext.color_mode,
      lamination: ext.lamination,
      quantity: ext.quantity,
    };

    onApplyToCalculator(prefill);
    toast.success(`Parametrii aplicați în calculator – ${PRODUCT_NAMES[selectedProduct] || selectedProduct}`);
  };

  const statusConfig = {
    complete: {
      icon: CheckCircle2,
      label: 'Brief complet',
      color: 'text-green-600',
      bg: 'bg-green-500/10 border-green-500/20',
    },
    partial: {
      icon: AlertTriangle,
      label: 'Lipsesc informații',
      color: 'text-amber-600',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    ambiguous: {
      icon: HelpCircle,
      label: 'Brief ambiguu',
      color: 'text-orange-600',
      bg: 'bg-orange-500/10 border-orange-500/20',
    },
  };

  return (
    <Card className="border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-brand-blue" />
          Brief Client — Analiză AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <Textarea
            placeholder='Introduceți brief-ul comenzii aici... (ex: "500 flyere A5 color față-verso pe 130g, cu laminare mată")'
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            className="min-h-[100px] resize-none"
          />
          <Button
            onClick={analyzeBrief}
            disabled={isAnalyzing || !brief.trim()}
            className="w-full gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizez brief-ul...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analizează Brief
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {/* Status badge */}
            {(() => {
              const cfg = statusConfig[result.status];
              const StatusIcon = cfg.icon;
              return (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${cfg.bg}`}>
                  <StatusIcon className={`h-5 w-5 flex-shrink-0 ${cfg.color}`} />
                  <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {result.extraction.confidence}% încredere
                  </Badge>
                </div>
              );
            })()}

            {/* Structured summary card */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Parametri detectați
              </div>

              <SummaryRow
                label="Produs detectat"
                value={result.extraction.product_type ? PRODUCT_NAMES[result.extraction.product_type] : undefined}
                missing={!result.extraction.product_type}
              />
              <SummaryRow
                label="Tiraj"
                value={result.extraction.quantity ? `${result.extraction.quantity} buc` : undefined}
                missing={!result.extraction.quantity}
              />
              <SummaryRow
                label="Format"
                value={result.extraction.is_custom_format
                  ? `Personalizat (${result.extraction.custom_pcs_per_sheet || '?'}/SRA3)`
                  : result.extraction.format}
                missing={!result.extraction.format && !result.extraction.is_custom_format}
              />
              <SummaryRow
                label="Gramaj"
                value={result.extraction.gsm ? `${result.extraction.gsm} g/mp` : undefined}
                missing={!result.extraction.gsm}
              />
              <SummaryRow
                label="Tipar"
                value={result.extraction.color_mode}
                missing={!result.extraction.color_mode}
              />
              <SummaryRow
                label="Plastifiere"
                value={result.extraction.lamination === 'none' ? 'Fără' : result.extraction.lamination?.replace('_', ' ')}
              />
              {result.extraction.folding_type && (
                <SummaryRow label="Fălțuire" value={result.extraction.folding_type} />
              )}
            </div>

            {/* Warnings */}
            {result.validation.warnings.length > 0 && (
              <div className="space-y-1">
                {result.validation.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-amber-500/10 text-xs">
                    <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-amber-600 flex-shrink-0" />
                    <span className="text-amber-700 dark:text-amber-400">{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Missing fields */}
            {result.status === 'partial' && result.validation.missingFields.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Câmpuri lipsă:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.validation.missingFields.map((f) => (
                      <Badge key={f} variant="outline" className="text-xs">
                        {FIELD_LABELS[f] || f}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Puteți aplica parametrii detectați și completa manual restul în calculator.
                  </p>
                </div>
              </div>
            )}

            {/* Alternative products (ambiguous) */}
            {result.status === 'ambiguous' && result.extraction.alternative_products && result.extraction.alternative_products.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Produse posibile:</p>
                {result.extraction.alternative_products.map((alt, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{PRODUCT_NAMES[alt.product_type] || alt.product_type}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{alt.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2 flex-shrink-0 gap-1"
                      onClick={() => handleApply(alt.product_type)}
                    >
                      Aplică
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {result.extraction.notes && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Lightbulb className="h-4 w-4 mt-0.5 text-brand-orange flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{result.extraction.notes}</p>
              </div>
            )}

            <Separator />

            {/* Apply button */}
            {result.extraction.product_type && (
              <Button
                onClick={() => handleApply()}
                className="w-full gap-2"
                size="lg"
              >
                <ArrowRight className="h-4 w-4" />
                Aplică în calculator — {PRODUCT_NAMES[result.extraction.product_type]}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, missing }: { label: string; value?: string; missing?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {missing ? (
        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
          Lipsă
        </Badge>
      ) : value ? (
        <span className="font-medium">{value}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
}
