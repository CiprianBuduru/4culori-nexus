import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles, Loader2, AlertCircle, Lightbulb, CheckCircle2, AlertTriangle,
  ArrowRight, HelpCircle, Zap, Settings2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type BriefAnalysisResult,
  type BriefExtraction,
  type PrintCalculatorPrefill,
  FIELD_LABELS,
  PRODUCT_NAMES,
} from '@/types/briefAnalysis';
import { isComparativeAvailable } from '@/lib/comparativeQuote';
import { PRINT_PRODUCTS, type CommercialDefaults } from './printProductConfigs';

interface BriefAnalyzerProps {
  onApplyToCalculator: (prefill: PrintCalculatorPrefill) => void;
  /** Full AI Sales flow: prefill + auto-add + generate email + open drawer */
  onGenerateFullQuote?: (prefill: PrintCalculatorPrefill) => void;
  /** Comparative quote flow */
  onGenerateComparativeQuote?: (extraction: BriefExtraction) => void;
}

export function BriefAnalyzer({ onApplyToCalculator, onGenerateFullQuote, onGenerateComparativeQuote }: BriefAnalyzerProps) {
  const [brief, setBrief] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<BriefAnalysisResult | null>(null);
  const [isAutoQuoting, setIsAutoQuoting] = useState(false);

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

  const buildPrefill = (productType?: string): PrintCalculatorPrefill | null => {
    if (!result) return null;
    const ext = result.extraction;
    const selectedProduct = productType || ext.product_type;
    if (!selectedProduct) {
      toast.error('Selectați un tip de produs');
      return null;
    }

    return {
      productId: selectedProduct,
      format: ext.is_custom_format ? 'custom' : ext.format,
      customPcsPerSheet: ext.custom_pcs_per_sheet,
      paperWeight: ext.gsm,
      colorMode: ext.color_mode,
      lamination: ext.lamination,
      quantity: ext.quantity,
    };
  };

  const handleApply = (productType?: string) => {
    const prefill = buildPrefill(productType);
    if (!prefill) return;
    onApplyToCalculator(prefill);
    toast.success(`Parametrii aplicați în calculator – ${PRODUCT_NAMES[prefill.productId] || prefill.productId}`);
  };

  /** Apply commercial defaults to fill missing fields, then trigger full quote */
  const handleApplyDefaults = () => {
    if (!result) return;
    const ext = result.extraction;
    const productType = ext.product_type;
    if (!productType) return;

    const config = PRINT_PRODUCTS.find(p => p.id === productType);
    if (!config) return;

    const defaults = config.commercialDefaults;
    const prefill: PrintCalculatorPrefill = {
      productId: productType,
      format: ext.is_custom_format ? 'custom' : (ext.format || defaults.format),
      customPcsPerSheet: ext.custom_pcs_per_sheet,
      paperWeight: ext.gsm || defaults.gsm,
      colorMode: ext.color_mode || defaults.colorMode,
      lamination: ext.lamination || defaults.lamination,
      quantity: ext.quantity || config.defaultQuantity,
    };

    onApplyToCalculator(prefill);
    toast.success('Sugestiile standard au fost aplicate');
  };

  /** Full auto-quote: analyze → prefill → add → email → drawer */
  const handleGenerateQuote = async () => {
    if (!brief.trim()) {
      toast.error('Introduceți un brief pentru analiză');
      return;
    }
    if (!onGenerateFullQuote) return;

    setIsAutoQuoting(true);
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

      const analysisResult = data as BriefAnalysisResult;
      setResult(analysisResult);

      if (analysisResult.status === 'complete' && analysisResult.extraction.product_type) {
        // Complete brief → full auto flow
        const ext = analysisResult.extraction;
        const config = PRINT_PRODUCTS.find(p => p.id === ext.product_type);
        const defaults = config?.commercialDefaults;

        const prefill: PrintCalculatorPrefill = {
          productId: ext.product_type!,
          format: ext.is_custom_format ? 'custom' : (ext.format || defaults?.format),
          customPcsPerSheet: ext.custom_pcs_per_sheet,
          paperWeight: ext.gsm || defaults?.gsm,
          colorMode: ext.color_mode || defaults?.colorMode,
          lamination: ext.lamination || defaults?.lamination,
          quantity: ext.quantity,
        };

        onGenerateFullQuote(prefill);
        toast.success('Brief complet – ofertă generată automat!');
      } else if (analysisResult.status === 'partial') {
        toast.info('Brief parțial – completați câmpurile lipsă sau aplicați sugestiile standard');
      } else {
        toast.warning('Brief ambiguu – selectați tipul de produs');
      }
    } catch (error) {
      console.error('Error in auto-quote:', error);
      toast.error('Eroare la generarea ofertei');
    } finally {
      setIsAutoQuoting(false);
    }
  };

  /** After applying defaults on partial brief, trigger full quote */
  const handleApplyDefaultsAndQuote = () => {
    if (!result || !onGenerateFullQuote) return;
    const ext = result.extraction;
    const productType = ext.product_type;
    if (!productType) return;

    const config = PRINT_PRODUCTS.find(p => p.id === productType);
    if (!config) return;

    const defaults = config.commercialDefaults;
    const prefill: PrintCalculatorPrefill = {
      productId: productType,
      format: ext.is_custom_format ? 'custom' : (ext.format || defaults.format),
      customPcsPerSheet: ext.custom_pcs_per_sheet,
      paperWeight: ext.gsm || defaults.gsm,
      colorMode: ext.color_mode || defaults.colorMode,
      lamination: ext.lamination || defaults.lamination,
      quantity: ext.quantity || config.defaultQuantity,
    };

    onGenerateFullQuote(prefill);
    toast.success('Sugestiile aplicate – ofertă generată automat!');
  };

  const getCommercialDefaults = (productType: string): CommercialDefaults | null => {
    const config = PRINT_PRODUCTS.find(p => p.id === productType);
    return config?.commercialDefaults || null;
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
      label: 'Brief incomplet',
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
          AI Sales Assistant
          <Badge variant="secondary" className="text-xs">Tipărituri</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <Textarea
            placeholder='Introduceți brief-ul comenzii aici... (ex: "2000 flyere A5 color față-verso pe 130g" sau "500 cărți de vizită cu laminare mată")'
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            className="min-h-[100px] resize-none"
          />
          <div className="flex gap-2">
            <Button
              onClick={analyzeBrief}
              disabled={isAnalyzing || isAutoQuoting || !brief.trim()}
              variant="outline"
              className="flex-1 gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizez...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analizează Brief
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateQuote}
              disabled={isAnalyzing || isAutoQuoting || !brief.trim()}
              className="flex-1 gap-2"
            >
              {isAutoQuoting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generez ofertă...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Generează ofertă din brief
                </>
              )}
            </Button>
          </div>
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

            {/* Commercial defaults suggestions for partial briefs */}
            {result.status === 'partial' && result.extraction.product_type && (() => {
              const defaults = getCommercialDefaults(result.extraction.product_type!);
              if (!defaults) return null;
              const ext = result.extraction;
              const missingWithDefaults: { field: string; label: string; suggestedValue: string }[] = [];
              
              if (!ext.format && !ext.is_custom_format) missingWithDefaults.push({ field: 'format', label: 'Format', suggestedValue: defaults.labels.format });
              if (!ext.gsm) missingWithDefaults.push({ field: 'gsm', label: 'Gramaj', suggestedValue: defaults.labels.gsm });
              if (!ext.color_mode) missingWithDefaults.push({ field: 'colorMode', label: 'Tipar', suggestedValue: defaults.labels.colorMode });
              if (!ext.lamination) missingWithDefaults.push({ field: 'lamination', label: 'Plastifiere', suggestedValue: defaults.labels.lamination });

              if (missingWithDefaults.length === 0) return null;

              return (
                <div className="bg-primary/5 rounded-lg p-4 space-y-3 border border-primary/20">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Settings2 className="h-4 w-4 text-primary" />
                    Sugestii comerciale standard
                  </div>
                  <div className="space-y-1.5">
                    {missingWithDefaults.map(({ field, label, suggestedValue }) => (
                      <div key={field} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          {suggestedValue}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleApplyDefaults}
                    >
                      <ArrowRight className="h-3 w-3" />
                      Aplică sugestiile standard
                    </Button>
                    {onGenerateFullQuote && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={handleApplyDefaultsAndQuote}
                      >
                        <Zap className="h-3 w-3" />
                        Aplică + Generează ofertă
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}

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

            {/* Missing fields (when no commercial defaults or product unknown) */}
            {result.status === 'partial' && result.validation.missingFields.length > 0 && !result.extraction.product_type && (
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

            {/* Apply button (manual flow) */}
            {result.extraction.product_type && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApply()}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Aplică în calculator
                  </Button>
                  {onGenerateFullQuote && result.status !== 'ambiguous' && (
                    <Button
                      onClick={() => {
                        const prefill = buildPrefill();
                        if (prefill) onGenerateFullQuote(prefill);
                      }}
                      className="flex-1 gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Generează ofertă
                    </Button>
                  )}
                </div>
                {onGenerateComparativeQuote &&
                  result.status !== 'ambiguous' &&
                  isComparativeAvailable(result.extraction.product_type!) && (
                  <Button
                    onClick={() => onGenerateComparativeQuote(result.extraction)}
                    variant="outline"
                    className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Settings2 className="h-4 w-4" />
                    Generează ofertă comparativă (3 variante)
                  </Button>
                )}
              </div>
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
