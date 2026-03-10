import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Plus, Info, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import {
  PRINT_PRODUCTS,
  PRINT_ENGINE,
  type PrintProductConfig,
} from './printProductConfigs';
import { type PrintCalculatorPrefill } from '@/types/briefAnalysis';

import { type PrintConfigSnapshot } from '@/types/recipes';

interface PrintOfferItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  details: string;
  productionCost: number;
  markupMultiplier: number;
  configSnapshot: PrintConfigSnapshot;
}

interface CalculatorProps {
  onAddToOffer?: (item: PrintOfferItem) => void;
  prefill?: PrintCalculatorPrefill | null;
  onPrefillApplied?: () => void;
  autoAdd?: boolean;
  onAutoAddComplete?: () => void;
}

export function PrintCalculator({ onAddToOffer, prefill, onPrefillApplied, autoAdd, onAutoAddComplete }: CalculatorProps) {
  // ── Product selection ──
  const [productId, setProductId] = useState(PRINT_PRODUCTS[0].id);
  const product = useMemo(
    () => PRINT_PRODUCTS.find((p) => p.id === productId) ?? PRINT_PRODUCTS[0],
    [productId],
  );

  // ── Calculator state ──
  const [format, setFormat] = useState('');
  const [customPcsPerSheet, setCustomPcsPerSheet] = useState(4);
  const [paperWeight, setPaperWeight] = useState<number>(0);
  const [colorMode, setColorMode] = useState('');
  const [lamination, setLamination] = useState('none');
  const [quantity, setQuantity] = useState(100);

  // ── Paper prices from DB ──
  const [paperPrices, setPaperPrices] = useState<Record<number, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);

  useEffect(() => {
    const fetchPaperPrices = async () => {
      const { data } = await supabase
        .from('materials')
        .select('unit_price, weight_gsm')
        .eq('brand', 'Color Copy')
        .eq('format', 'SRA3')
        .eq('active', true);

      if (data) {
        const prices: Record<number, number> = {};
        data.forEach((m: any) => {
          if (m.weight_gsm) prices[m.weight_gsm] = Number(m.unit_price);
        });
        setPaperPrices(prices);
      }
      setLoadingPrices(false);
    };
    fetchPaperPrices();
  }, []);

  // Reset calculator state when product changes
  useEffect(() => {
    resetToProduct(product);
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply prefill from AI Brief Analyzer
  useEffect(() => {
    if (!prefill) return;

    // Select the product
    setProductId(prefill.productId);
    const targetProduct = PRINT_PRODUCTS.find(p => p.id === prefill.productId) ?? PRINT_PRODUCTS[0];

    // Apply individual fields (only if provided)
    if (prefill.format) {
      setFormat(prefill.format);
    } else {
      setFormat(targetProduct.formats[0]?.value ?? '');
    }

    if (prefill.format === 'custom' && prefill.customPcsPerSheet) {
      setCustomPcsPerSheet(prefill.customPcsPerSheet);
    }

    if (prefill.paperWeight && targetProduct.allowedGsm.includes(prefill.paperWeight)) {
      setPaperWeight(prefill.paperWeight);
    } else {
      setPaperWeight(targetProduct.defaultGsm);
    }

    if (prefill.colorMode && targetProduct.colorModes.some(c => c.value === prefill.colorMode)) {
      setColorMode(prefill.colorMode);
    } else {
      setColorMode(targetProduct.defaultColorMode);
    }

    if (prefill.lamination && targetProduct.laminations.some(l => l.value === prefill.lamination)) {
      setLamination(prefill.lamination);
    } else {
      setLamination(targetProduct.defaultLamination);
    }

    if (prefill.quantity && prefill.quantity >= 1) {
      setQuantity(prefill.quantity);
    }

    onPrefillApplied?.();
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetToProduct(p: PrintProductConfig) {
    const firstFormat = p.formats[0]?.value ?? '';
    setFormat(firstFormat);
    setCustomPcsPerSheet(p.formats[0]?.pcsPerSheet ?? 4);
    setPaperWeight(p.defaultGsm);
    setColorMode(p.defaultColorMode);
    setLamination(p.defaultLamination);
    setQuantity(p.defaultQuantity);
  }

  // ── Derived values ──
  const selectedFormat = product.formats.find((f) => f.value === format);
  const pcsPerSheet =
    format === 'custom'
      ? customPcsPerSheet
      : selectedFormat?.pcsPerSheet ?? 1;

  const folds = selectedFormat?.folds ?? 0;
  const glue = selectedFormat?.glue ?? false;

  const paperPricePerSheet = paperPrices[paperWeight] || 0;
  const hasPaperPrice = paperPricePerSheet > 0;

  const colorCostPerSheet =
    product.colorModes.find((c) => c.value === colorMode)?.costPerSheet ?? 0;
  const laminationCostPerSheet =
    product.laminations.find((l) => l.value === lamination)?.costPerSheet ?? 0;

  // ── Calculation ──
  const result = useMemo(() => {
    if (pcsPerSheet <= 0 || quantity < 1) return null;

    const setupCost = product.dtpHours * PRINT_ENGINE.SETUP_RATE;
    const sheets = Math.ceil(quantity / pcsPerSheet);
    const sheetsWithWaste = Math.ceil(sheets * (1 + PRINT_ENGINE.SPOILAGE));

    const paperCostPerSheet = paperPricePerSheet * (1 + PRINT_ENGINE.PAPER_TECH_LOSS);
    const productionCost =
      (paperCostPerSheet + colorCostPerSheet + laminationCostPerSheet) * sheetsWithWaste;

    // Finishing costs
    const foldingCost = folds > 0 ? quantity * folds * PRINT_ENGINE.FOLD_COST_PER_FOLD : 0;
    const glueCost = glue ? quantity * PRINT_ENGINE.GLUE_COST_PER_PIECE : 0;

    const labor = productionCost * PRINT_ENGINE.LABOR_PCT;
    const maintenance = productionCost * PRINT_ENGINE.MAINTENANCE_PCT;
    const internalCost = productionCost + setupCost + foldingCost + glueCost + labor + maintenance;
    const productionPrice = internalCost * PRINT_ENGINE.PRODUCTION_MARKUP;
    const unitPrice = productionPrice / quantity;

    return {
      sheets,
      sheetsWithWaste,
      paperCostPerSheet,
      colorCostPerSheet,
      laminationCostPerSheet,
      productionCost,
      setupCost,
      dtpHours: product.dtpHours,
      foldingCost,
      glueCost,
      folds,
      glue,
      labor,
      maintenance,
      internalCost,
      productionPrice,
      unitPrice,
    };
  }, [
    quantity,
    pcsPerSheet,
    paperPricePerSheet,
    colorCostPerSheet,
    laminationCostPerSheet,
    product.minQuantity,
    product.dtpHours,
    folds,
    glue,
  ]);

  /** Build the full offer item with config snapshot */
  const buildOfferItem = (): PrintOfferItem | null => {
    if (!result) return null;

    const formatLabel =
      format === 'custom'
        ? `Custom (${customPcsPerSheet}/SRA3)`
        : product.formats.find((f) => f.value === format)?.label ?? format;
    const colorModeObj = product.colorModes.find((c) => c.value === colorMode);
    const laminationObj = product.laminations.find((l) => l.value === lamination);
    const laminationLabel = laminationObj?.label ?? '';
    const weightLabel = `${paperWeight} g/mp`;

    let details = `${formatLabel}, Color Copy ${weightLabel}, ${colorMode}`;
    if (lamination !== 'none') details += `, ${laminationLabel}`;
    details += `, ${result.sheetsWithWaste} coli SRA3`;

    const configSnapshot: PrintConfigSnapshot = {
      productType: product.id,
      productName: product.name,
      format: format,
      formatLabel,
      gsm: paperWeight,
      colorMode,
      colorModeLabel: colorModeObj?.label ?? colorMode,
      lamination,
      laminationLabel: laminationObj?.label ?? 'Fără plastifiere',
      sheetsUsed: result.sheetsWithWaste,
      dtpHours: product.dtpHours,
      folds: result.folds > 0 ? result.folds : undefined,
      glue: result.glue || undefined,
    };

    return {
      name: `${product.name} ${formatLabel}`,
      quantity,
      unitPrice: result.unitPrice,
      totalPrice: result.productionPrice,
      details,
      productionCost: result.internalCost,
      markupMultiplier: PRINT_ENGINE.PRODUCTION_MARKUP,
      configSnapshot,
    };
  };

  // Auto-add to offer when autoAdd is true and result is ready
  useEffect(() => {
    if (!autoAdd || !result || !onAddToOffer || !hasPaperPrice) return;

    const item = buildOfferItem();
    if (item) {
      onAddToOffer(item);
      onAutoAddComplete?.();
    }
  }, [autoAdd, result, hasPaperPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Quantity handler ──
  const handleQuantityChange = (val: string) => {
    let num = parseInt(val) || product.minQuantity;
    if (num < product.minQuantity) num = product.minQuantity;
    num = Math.round(num / product.quantityStep) * product.quantityStep;
    if (num < product.minQuantity) num = product.minQuantity;
    setQuantity(num);
  };

  // ── Add to offer ──
  const handleAddToOffer = () => {
    if (!onAddToOffer || !result) return;
    const item = buildOfferItem();
    if (item) onAddToOffer(item);
  };

  // ── Allowed GSM buttons (only those with prices) ──
  const gsmButtons = product.allowedGsm;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Printer className="h-5 w-5 text-primary" />
          Calculator Tipărituri
          <Badge variant="outline" className="text-xs font-normal">Color Copy SRA3</Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Motor universal de calcul pentru produse tipărite. Prețurile hârtiei se preiau din
                  baza de date (Setări → Materiale).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Product type selector ── */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tip produs</Label>
          <div className="flex flex-wrap gap-2">
            {PRINT_PRODUCTS.map((p) => (
              <Button
                key={p.id}
                variant={productId === p.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProductId(p.id)}
                className="text-xs"
              >
                {p.name}
                {!p.ready && (
                  <span className="ml-1 text-muted-foreground opacity-60">(draft)</span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {!product.ready && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            Configurația pentru „{product.name}" este în draft. Rezultatele sunt estimative.
          </div>
        )}

        {product.finishingNotes && (
          <p className="text-xs text-muted-foreground italic">{product.finishingNotes}</p>
        )}

        {/* ── Format ── */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Format</Label>
          <div className="flex flex-wrap gap-2">
            {product.formats.map((f) => (
              <Button
                key={f.value}
                variant={format === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFormat(f.value);
                  // Auto-switch color mode for prisma (4+0 only)
                  if (f.glue && colorMode !== '4+0') {
                    setColorMode('4+0');
                  }
                }}
                className="text-xs"
              >
                {f.label}
                <span className="ml-1 text-muted-foreground">
                  ({f.pcsPerSheet}/SRA3{f.folds ? `, ${f.folds}f` : ''}{f.glue ? ', lipire' : ''})
                </span>
              </Button>
            ))}
            {product.allowCustomFormat && (
              <Button
                variant={format === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('custom')}
                className="text-xs"
              >
                Format personalizat
              </Button>
            )}
          </div>
          {format === 'custom' && (
            <div className="mt-2">
              <Label className="text-xs">Bucăți per coală SRA3</Label>
              <Input
                type="number"
                min={1}
                max={40}
                value={customPcsPerSheet}
                onChange={(e) =>
                  setCustomPcsPerSheet(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-32"
              />
            </div>
          )}
        </div>

        {/* ── Paper weight ── */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Gramaj hârtie (Color Copy)</Label>
          <div className="flex flex-wrap gap-2">
            {gsmButtons.map((gsm) => (
              <Button
                key={gsm}
                variant={paperWeight === gsm ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaperWeight(gsm)}
                className="text-xs"
              >
                {gsm} g/mp
                {paperPrices[gsm] !== undefined && (
                  <span className="ml-1 text-muted-foreground">
                    ({paperPrices[gsm].toFixed(4)} €)
                  </span>
                )}
              </Button>
            ))}
          </div>
          {!loadingPrices && !hasPaperPrice && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              Prețul hârtiei nu este configurat. Actualizează-l din Setări → Materiale.
            </div>
          )}
        </div>

        {/* ── Color mode ── */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tipar</Label>
          <div className="flex flex-wrap gap-2">
            {product.colorModes.map((cm) => (
              <Button
                key={cm.value}
                variant={colorMode === cm.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setColorMode(cm.value)}
                className="text-xs"
              >
                {cm.label} — {cm.costPerSheet.toFixed(2)} €/SRA3
              </Button>
            ))}
          </div>
        </div>

        {/* ── Lamination ── */}
        {product.laminations.length > 1 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Plastifiere (opțional)</Label>
            <Select value={lamination} onValueChange={setLamination}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {product.laminations.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                    {l.costPerSheet > 0 && ` — ${l.costPerSheet.toFixed(2)} €/SRA3`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Quantity ── */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cantitate (bucăți)</Label>
          <Input
            type="number"
            min={product.minQuantity}
            step={product.quantityStep}
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Minim {product.minQuantity} buc, multiplu de {product.quantityStep}
          </p>
        </div>

        <Separator />

        {/* ── Calculation breakdown ── */}
        {result && (
          <div className="space-y-2 bg-muted/50 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Detalii calcul — {product.name}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Coli SRA3 (teoretice)</span>
              <span>{result.sheets}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Coli cu prisos 10%</span>
              <span>{result.sheetsWithWaste}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cost hârtie/coală (+20%)</span>
              <span>{result.paperCostPerSheet.toFixed(4)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cost tipar/coală</span>
              <span>{result.colorCostPerSheet.toFixed(2)} €</span>
            </div>
            {lamination !== 'none' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost plastifiere/coală</span>
                <span>{result.laminationCostPerSheet.toFixed(2)} €</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cost direct</span>
              <span>{result.productionCost.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Setup ({result.dtpHours}h × {PRINT_ENGINE.SETUP_RATE} €)</span>
              <span>{result.setupCost.toFixed(2)} €</span>
            </div>
            {result.foldingCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fălțuire ({result.folds} fălțuiri × {quantity} buc × {PRINT_ENGINE.FOLD_COST_PER_FOLD} €)</span>
                <span>{result.foldingCost.toFixed(2)} €</span>
              </div>
            )}
            {result.glueCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lipire prisma ({quantity} buc × {PRINT_ENGINE.GLUE_COST_PER_PIECE} €)</span>
                <span>{result.glueCost.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Manoperă (2%)</span>
              <span>{result.labor.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mentenanță (5%)</span>
              <span>{result.maintenance.toFixed(2)} €</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span>Cost intern total</span>
              <span>{result.internalCost.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Preț producție (×1.40)</span>
              <span>{result.productionPrice.toFixed(2)} € + TVA</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-primary">
              <span>Preț/bucată</span>
              <span>{result.unitPrice.toFixed(4)} € + TVA</span>
            </div>

            {/* ── Quick quantity estimates ── */}
            <div className="mt-3 bg-muted/30 rounded-lg p-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Estimare rapidă tiraje
              </div>
              <div className="space-y-1">
                {[100, 200, 500, 1000].map((qty) => (
                  <div key={qty} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{qty} buc</span>
                    <span>{(qty * result.unitPrice).toFixed(2)} € + TVA</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!result && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Configurează parametrii pentru a calcula prețul.
          </div>
        )}

        {onAddToOffer && result && (
          <Button
            onClick={handleAddToOffer}
            className="w-full gap-2"
            disabled={!hasPaperPrice}
          >
            <Plus className="h-4 w-4" />
            Adaugă în ofertă — {result.productionPrice.toFixed(2)} € + TVA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
