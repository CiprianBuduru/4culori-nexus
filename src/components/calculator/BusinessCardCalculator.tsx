import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, Info, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface CalculatorProps {
  onAddToOffer?: (item: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details: string;
  }) => void;
}

const FORMATS = [
  { value: '9x5', label: '9 × 5 cm', pcsPerSheet: 20 },
  { value: '8.5x5.5', label: '8.5 × 5.5 cm', pcsPerSheet: 20 },
  { value: 'custom', label: 'Format personalizat', pcsPerSheet: 0 },
];

const PAPER_WEIGHTS = [
  { value: 300, label: '300 g/mp' },
  { value: 350, label: '350 g/mp' },
  { value: 400, label: '400 g/mp' },
];

const PRINT_COSTS: Record<string, number> = {
  '4+0': 0.10,
  '4+4': 0.20,
};

const LAMINATION_OPTIONS = [
  { value: 'none', label: 'Fără plastifiere', costPerSheet: 0 },
  { value: 'gloss_1', label: 'Lucioasă 1 față', costPerSheet: 0.07 },
  { value: 'gloss_2', label: 'Lucioasă 2 fețe', costPerSheet: 0.14 },
  { value: 'matte_1', label: 'Mată 1 față', costPerSheet: 0.10 },
  { value: 'matte_2', label: 'Mată 2 fețe', costPerSheet: 0.20 },
  { value: 'soft_1', label: 'Soft Touch 1 față', costPerSheet: 0.16 },
  { value: 'soft_2', label: 'Soft Touch 2 fețe', costPerSheet: 0.32 },
];

const TECH_LOSS = 0.10;
const PAPER_MARKUP = 0.20;
const SETUP_HOURS = 0.5;
const SETUP_RATE = 15;
const SETUP_COST = SETUP_HOURS * SETUP_RATE;
const LABOR_PERCENT = 0.02;
const MAINTENANCE_PERCENT = 0.05;
const PRODUCTION_MARKUP = 1.40;

const MIN_QUANTITY = 60;
const QUANTITY_STEP = 20;

export function BusinessCardCalculator({ onAddToOffer }: CalculatorProps) {
  const [format, setFormat] = useState('9x5');
  const [customPcsPerSheet, setCustomPcsPerSheet] = useState(20);
  const [paperWeight, setPaperWeight] = useState<number>(300);
  const [printMode, setPrintMode] = useState<'4+0' | '4+4'>('4+4');
  const [lamination, setLamination] = useState('none');
  const [quantity, setQuantity] = useState(100);

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

  const pcsPerSheet = format === 'custom' ? customPcsPerSheet : (FORMATS.find(f => f.value === format)?.pcsPerSheet || 20);
  const paperPricePerSheet = paperPrices[paperWeight] || 0;
  const hasPaperPrice = paperPricePerSheet > 0;

  const result = useMemo(() => {
    if (pcsPerSheet <= 0 || quantity < MIN_QUANTITY) return null;

    const theoreticalSheets = quantity / pcsPerSheet;
    const sheets = Math.ceil(theoreticalSheets);
    const sheetsWithWaste = Math.ceil(sheets * (1 + TECH_LOSS));

    const paperCostPerSheet = paperPricePerSheet * (1 + PAPER_MARKUP);
    const printCostPerSheet = PRINT_COSTS[printMode];
    const laminationOption = LAMINATION_OPTIONS.find(l => l.value === lamination);
    const laminationCostPerSheet = laminationOption?.costPerSheet || 0;

    const productionCost = (paperCostPerSheet + printCostPerSheet + laminationCostPerSheet) * sheetsWithWaste;
    const subtotal = productionCost + SETUP_COST;
    const internalCost = subtotal * (1 + LABOR_PERCENT + MAINTENANCE_PERCENT);
    const productionPrice = internalCost * PRODUCTION_MARKUP;
    const unitPrice = productionPrice / quantity;

    return {
      pcsPerSheet,
      theoreticalSheets,
      sheets,
      sheetsWithWaste,
      paperCostPerSheet,
      printCostPerSheet,
      laminationCostPerSheet,
      productionCost,
      setupCost: SETUP_COST,
      subtotal,
      internalCost,
      productionPrice,
      unitPrice,
    };
  }, [quantity, pcsPerSheet, paperPricePerSheet, printMode, lamination]);

  const handleQuantityChange = (val: string) => {
    let num = parseInt(val) || MIN_QUANTITY;
    if (num < MIN_QUANTITY) num = MIN_QUANTITY;
    num = Math.round(num / QUANTITY_STEP) * QUANTITY_STEP;
    if (num < MIN_QUANTITY) num = MIN_QUANTITY;
    setQuantity(num);
  };

  const handleAddToOffer = () => {
    if (!onAddToOffer || !result) return;

    const formatLabel = format === 'custom' ? `Custom (${customPcsPerSheet}/SRA3)` : FORMATS.find(f => f.value === format)?.label || format;
    const weightLabel = PAPER_WEIGHTS.find(p => p.value === paperWeight)?.label || `${paperWeight} g/mp`;
    const laminationLabel = LAMINATION_OPTIONS.find(l => l.value === lamination)?.label || '';

    let details = `${formatLabel}, Color Copy ${weightLabel}, ${printMode}`;
    if (lamination !== 'none') details += `, ${laminationLabel}`;
    details += `, ${result.sheetsWithWaste} coli SRA3`;

    onAddToOffer({
      name: `Cărți de vizită ${formatLabel}`,
      quantity,
      unitPrice: result.unitPrice,
      totalPrice: result.productionPrice,
      details,
    });
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-primary" />
          Calculator Cărți de Vizită
          <Badge variant="outline" className="text-xs font-normal">Color Copy</Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Calculator cu formule reale de producție pentru cărți de vizită. Prețurile hârtiei se preiau din baza de date.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Format */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Format</Label>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <Button
                key={f.value}
                variant={format === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat(f.value)}
                className="text-xs"
              >
                {f.label}
                {f.value !== 'custom' && (
                  <span className="ml-1 text-muted-foreground">({f.pcsPerSheet}/SRA3)</span>
                )}
              </Button>
            ))}
          </div>
          {format === 'custom' && (
            <div className="mt-2">
              <Label className="text-xs">Bucăți per coală SRA3</Label>
              <Input
                type="number"
                min={1}
                max={40}
                value={customPcsPerSheet}
                onChange={(e) => setCustomPcsPerSheet(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32"
              />
            </div>
          )}
        </div>

        {/* Paper weight */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Gramaj hârtie (Color Copy)</Label>
          <div className="flex flex-wrap gap-2">
            {PAPER_WEIGHTS.map((p) => (
              <Button
                key={p.value}
                variant={paperWeight === p.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaperWeight(p.value)}
                className="text-xs"
              >
                {p.label}
                {paperPrices[p.value] !== undefined && (
                  <span className="ml-1 text-muted-foreground">
                    ({paperPrices[p.value].toFixed(4)} €)
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

        {/* Print mode */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tipar</Label>
          <div className="flex gap-2">
            <Button
              variant={printMode === '4+0' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPrintMode('4+0')}
              className="text-xs"
            >
              4+0 (o față) — 0.10 €/SRA3
            </Button>
            <Button
              variant={printMode === '4+4' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPrintMode('4+4')}
              className="text-xs"
            >
              4+4 (două fețe) — 0.20 €/SRA3
            </Button>
          </div>
        </div>

        {/* Lamination */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Plastifiere (opțional)</Label>
          <Select value={lamination} onValueChange={setLamination}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAMINATION_OPTIONS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                  {l.costPerSheet > 0 && ` — ${l.costPerSheet.toFixed(2)} €/SRA3`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cantitate (bucăți)</Label>
          <Input
            type="number"
            min={MIN_QUANTITY}
            step={QUANTITY_STEP}
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Minim {MIN_QUANTITY} buc, multiplu de {QUANTITY_STEP}
          </p>
        </div>

        <Separator />

        {/* Results */}
        {result && (
          <div className="space-y-2 bg-muted/50 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Detalii calcul
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
              <span>{result.printCostPerSheet.toFixed(2)} €</span>
            </div>
            {lamination !== 'none' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost plastifiere/coală</span>
                <span>{result.laminationCostPerSheet.toFixed(2)} €</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cost producție</span>
              <span>{result.productionCost.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Setup (0.5h × 15 €)</span>
              <span>{result.setupCost.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+2% manoperă, +5% mentenanță</span>
              <span>{result.internalCost.toFixed(2)} €</span>
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
