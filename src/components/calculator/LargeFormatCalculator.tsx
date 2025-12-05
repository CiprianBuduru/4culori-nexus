import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Plus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ProductType = 'autocolant' | 'afis' | 'canvas' | 'banner' | 'rollup' | 'stickere' | 'forex';

interface CalculatorProps {
  onAddToOffer?: (item: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details: string;
  }) => void;
}

// Placeholder prices in EUR (to be updated from Settings)
const PRICES = {
  autocolant_pvc: 8, // €/mp
  cerneala: 5, // €/mp
  laminare: 4, // €/mp
  taiere_contur: 2, // €/mp
  hartie_afis: 3, // €/mp
  canvas: 12, // €/mp
  lemn_cadru: 3, // €/m
  banner_frontlit: 6, // €/mp
  capsa: 0.1, // €/buc
  tiv: 0.5, // €/m
  polipropilena: 10, // €/mp
  suport_85x200: 25, // €/buc
  suport_100x200: 30, // €/buc
  suport_120x200: 40, // €/buc
  suport_150x200: 50, // €/buc
  forex_3mm: 15, // €/mp
  forex_5mm: 20, // €/mp
  forex_10mm: 30, // €/mp
  dtp_ora: 15, // €/ora
};

const HIDDEN_COSTS = {
  dtp: 0.5, // ore
  manopera: 0.02, // 2%
  prisoase: 0.05, // 5%
  mentenanta: 0.05, // 5%
};

const MARKUP_OPTIONS = [
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
  { label: '60%', value: 60 },
  { label: '80%', value: 80 },
  { label: '100%', value: 100 },
];

const PRODUCT_TYPES: { value: ProductType; label: string; icon: string }[] = [
  { value: 'autocolant', label: 'Autocolant PVC', icon: '🏷️' },
  { value: 'afis', label: 'Afiș', icon: '📄' },
  { value: 'canvas', label: 'Canvas', icon: '🖼️' },
  { value: 'banner', label: 'Banner', icon: '🚩' },
  { value: 'rollup', label: 'Roll-up', icon: '📜' },
  { value: 'stickere', label: 'Stickere', icon: '✂️' },
  { value: 'forex', label: 'Forex', icon: '🪧' },
];

const ROLLUP_SIZES = [
  { name: '85x200 cm', width: 0.85, height: 2, price: 'suport_85x200' as const },
  { name: '100x200 cm', width: 1, height: 2, price: 'suport_100x200' as const },
  { name: '120x200 cm', width: 1.2, height: 2, price: 'suport_120x200' as const },
  { name: '150x200 cm', width: 1.5, height: 2, price: 'suport_150x200' as const },
];

const FOREX_THICKNESS = [
  { name: '3 mm', price: 'forex_3mm' as const },
  { name: '5 mm', price: 'forex_5mm' as const },
  { name: '10 mm', price: 'forex_10mm' as const },
];

export function LargeFormatCalculator({ onAddToOffer }: CalculatorProps) {
  const [productType, setProductType] = useState<ProductType>('autocolant');
  const [width, setWidth] = useState(1); // meters
  const [height, setHeight] = useState(1); // meters
  const [quantity, setQuantity] = useState(1);
  const [markup, setMarkup] = useState(40);
  const [laminare, setLaminare] = useState(false);
  const [taiere, setTaiere] = useState(false);
  const [cadruLemn, setCadruLemn] = useState(false);
  const [capse, setCapse] = useState(false);
  const [tiv, setTiv] = useState(false);
  const [rollupSize, setRollupSize] = useState(ROLLUP_SIZES[0]);
  const [forexThickness, setForexThickness] = useState(FOREX_THICKNESS[0]);
  const [doubleSided, setDoubleSided] = useState(false);

  const calculatePrice = () => {
    let baseCost = 0;
    const area = width * height; // mp
    const perimeter = 2 * (width + height); // m
    
    switch (productType) {
      case 'autocolant':
        baseCost = area * (PRICES.autocolant_pvc + PRICES.cerneala);
        if (laminare) baseCost += area * PRICES.laminare;
        if (taiere) baseCost += area * PRICES.taiere_contur;
        break;
        
      case 'afis':
        baseCost = area * (PRICES.hartie_afis + PRICES.cerneala);
        if (laminare) baseCost += area * PRICES.laminare;
        break;
        
      case 'canvas':
        baseCost = area * (PRICES.canvas + PRICES.cerneala);
        if (cadruLemn) baseCost += perimeter * PRICES.lemn_cadru;
        break;
        
      case 'banner':
        baseCost = area * (PRICES.banner_frontlit + PRICES.cerneala);
        if (capse) baseCost += Math.ceil(perimeter / 0.3) * PRICES.capsa;
        if (tiv) baseCost += perimeter * PRICES.tiv;
        break;
        
      case 'rollup':
        const rollupArea = rollupSize.width * rollupSize.height;
        baseCost = rollupArea * (PRICES.polipropilena + PRICES.cerneala);
        baseCost += PRICES[rollupSize.price];
        break;
        
      case 'stickere':
        baseCost = area * (PRICES.autocolant_pvc + PRICES.cerneala);
        baseCost += quantity * 0.1; // per-piece cutting cost
        break;
        
      case 'forex':
        baseCost = area * (PRICES.autocolant_pvc + PRICES.cerneala + PRICES[forexThickness.price]);
        if (doubleSided) baseCost *= 1.8; // almost double for 2 sides
        if (laminare) baseCost += area * PRICES.laminare * (doubleSided ? 2 : 1);
        break;
    }
    
    // Add hidden costs
    const dtpCost = HIDDEN_COSTS.dtp * PRICES.dtp_ora;
    const hiddenMultiplier = 1 + HIDDEN_COSTS.manopera + HIDDEN_COSTS.prisoase + HIDDEN_COSTS.mentenanta;
    
    const productionCost = (baseCost * hiddenMultiplier + dtpCost) * quantity;
    const finalPrice = productionCost * (1 + markup / 100);
    
    return {
      area,
      perimeter,
      productionCost,
      pricePerUnit: finalPrice / quantity,
      totalPrice: finalPrice,
    };
  };

  const result = calculatePrice();

  const handleAddToOffer = () => {
    if (!onAddToOffer) return;
    
    const productLabel = PRODUCT_TYPES.find(p => p.value === productType)?.label || productType;
    let details = `${width}x${height}m`;
    
    if (productType === 'rollup') details = rollupSize.name;
    if (laminare) details += ', laminat';
    if (taiere) details += ', tăiere contur';
    if (cadruLemn) details += ', cadru lemn';
    if (capse) details += ', capse';
    if (tiv) details += ', tiv';
    if (doubleSided) details += ', 2 fețe';
    details += `, adaos ${markup}%`;
    
    onAddToOffer({
      name: productLabel,
      quantity,
      unitPrice: result.pricePerUnit,
      totalPrice: result.totalPrice,
      details,
    });
  };

  const renderProductOptions = () => {
    switch (productType) {
      case 'autocolant':
      case 'afis':
        return (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Laminare</Label>
              <Switch checked={laminare} onCheckedChange={setLaminare} />
            </div>
            {productType === 'autocolant' && (
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tăiere pe contur</Label>
                <Switch checked={taiere} onCheckedChange={setTaiere} />
              </div>
            )}
          </>
        );
        
      case 'canvas':
        return (
          <div className="flex items-center justify-between">
            <Label className="text-sm">Cadru lemn</Label>
            <Switch checked={cadruLemn} onCheckedChange={setCadruLemn} />
          </div>
        );
        
      case 'banner':
        return (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Capse</Label>
              <Switch checked={capse} onCheckedChange={setCapse} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tiv</Label>
              <Switch checked={tiv} onCheckedChange={setTiv} />
            </div>
          </>
        );
        
      case 'rollup':
        return (
          <div className="space-y-2">
            <Label className="text-xs">Dimensiune suport</Label>
            <div className="flex flex-wrap gap-2">
              {ROLLUP_SIZES.map((size) => (
                <Button
                  key={size.name}
                  variant={rollupSize.name === size.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRollupSize(size)}
                  className="text-xs"
                >
                  {size.name}
                </Button>
              ))}
            </div>
          </div>
        );
        
      case 'forex':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Grosime placă</Label>
              <div className="flex flex-wrap gap-2">
                {FOREX_THICKNESS.map((th) => (
                  <Button
                    key={th.name}
                    variant={forexThickness.name === th.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForexThickness(th)}
                    className="text-xs"
                  >
                    {th.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Print 2 fețe</Label>
              <Switch checked={doubleSided} onCheckedChange={setDoubleSided} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Laminare</Label>
              <Switch checked={laminare} onCheckedChange={setLaminare} />
            </div>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <Card className="border-brand-blue/30 bg-gradient-to-br from-brand-blue/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Printer className="h-5 w-5 text-brand-blue" />
          Calculator Print Mare Format
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Calculează prețuri pentru print mare format: autocolante, afișe, canvas, bannere, roll-up, stickere, forex.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Type */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tip produs</Label>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={productType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setProductType(type.value)}
                className="text-xs gap-1"
              >
                <span>{type.icon}</span>
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Dimensions (not for roll-up) */}
        {productType !== 'rollup' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Lățime (m)</Label>
              <Input
                type="number"
                min="0.1"
                max="50"
                step="0.01"
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Înălțime (m)</Label>
              <Input
                type="number"
                min="0.1"
                max="50"
                step="0.01"
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="space-y-1">
          <Label className="text-xs">Cantitate (bucăți)</Label>
          <Input
            type="number"
            min="1"
            max="10000"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          />
        </div>

        {/* Product-specific options */}
        {renderProductOptions()}

        {/* Markup */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Adaos comercial</Label>
            <Badge variant="secondary" className="text-xs">{markup}%</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MARKUP_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={markup === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setMarkup(option.value)}
                className="text-xs h-7 px-2"
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Slider
            value={[markup]}
            onValueChange={(values) => setMarkup(values[0])}
            min={0}
            max={150}
            step={5}
          />
        </div>

        <Separator />

        {/* Results */}
        <div className="space-y-2 bg-muted/50 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Suprafață</span>
            <span>{result.area.toFixed(2)} mp</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost producție</span>
            <span>{result.productionCost.toFixed(2)} €</span>
          </div>
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Preț/bucată</span>
            <span>{result.pricePerUnit.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-brand-blue">
            <span>Total ({quantity} buc)</span>
            <span>{result.totalPrice.toFixed(2)} €</span>
          </div>
        </div>

        {onAddToOffer && (
          <Button
            onClick={handleAddToOffer}
            className="w-full gap-2 bg-brand-blue hover:bg-brand-blue/90"
            disabled={width <= 0 || height <= 0}
          >
            <Plus className="h-4 w-4" />
            Adaugă în ofertă
          </Button>
        )}
      </CardContent>
    </Card>
  );
}