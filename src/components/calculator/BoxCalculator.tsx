import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Box, Plus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BoxCalculation {
  length: number;
  width: number;
  height: number;
  quantity: number;
  boxType: string;
  materialType: string;
  printType: string;
  hasLamination: boolean;
  hasSpotUV: boolean;
  hasHotStamp: boolean;
  hasEmboss: boolean;
  hasMagnet: boolean;
  hasInsert: boolean;
  markup: number;
}

interface BoxResult {
  materialArea: number;
  materialCost: number;
  printCost: number;
  finishingCost: number;
  assemblyCost: number;
  setupCost: number;
  productionCostPerUnit: number;
  pricePerUnitWithMarkup: number;
  totalPrice: number;
}

interface BoxCalculatorProps {
  onAddToOffer?: (item: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details: string;
  }) => void;
}

// Box types with their complexity factor
const BOX_TYPES = [
  { id: 'simple', name: 'Cutie simplă (autoformare)', factor: 1.0 },
  { id: 'magnetic', name: 'Cutie cu capac magnetic', factor: 1.5 },
  { id: 'drawer', name: 'Cutie sertar', factor: 1.3 },
  { id: 'sleeve', name: 'Cutie cu manșon', factor: 1.4 },
  { id: 'corrugated', name: 'Cutie carton ondulat', factor: 0.8 },
  { id: 'gift', name: 'Cutie cadou premium', factor: 1.8 },
];

// Material types with prices per m²
const MATERIAL_TYPES = [
  { id: 'coated-300', name: 'Carton cașerat 300g', pricePerM2: 2.5 },
  { id: 'coated-350', name: 'Carton cașerat 350g', pricePerM2: 3.0 },
  { id: 'coated-400', name: 'Carton cașerat 400g', pricePerM2: 3.5 },
  { id: 'kraft-300', name: 'Carton kraft 300g', pricePerM2: 2.2 },
  { id: 'rigid-1.5mm', name: 'Carton rigid 1.5mm', pricePerM2: 4.5 },
  { id: 'rigid-2mm', name: 'Carton rigid 2mm', pricePerM2: 5.5 },
  { id: 'corrugated-e', name: 'Carton ondulat E', pricePerM2: 1.8 },
  { id: 'corrugated-b', name: 'Carton ondulat B', pricePerM2: 2.0 },
];

// Print types
const PRINT_TYPES = [
  { id: 'none', name: 'Fără imprimare', pricePerM2: 0 },
  { id: 'cmyk-1side', name: 'CMYK 1 față', pricePerM2: 3.5 },
  { id: 'cmyk-2side', name: 'CMYK 2 fețe', pricePerM2: 6.0 },
  { id: 'pantone-1', name: '1 culoare Pantone', pricePerM2: 2.5 },
  { id: 'pantone-2', name: '2 culori Pantone', pricePerM2: 4.0 },
];

// Finishing options with costs
const FINISHING_OPTIONS = {
  lamination: { name: 'Laminare mată/lucioasă', pricePerM2: 1.2 },
  spotUV: { name: 'Lac UV selectiv', pricePerM2: 2.5 },
  hotStamp: { name: 'Hot stamping', pricePerUnit: 0.15 },
  emboss: { name: 'Emboss/deboss', pricePerUnit: 0.12 },
  magnet: { name: 'Magneți (2 buc)', pricePerUnit: 0.80 },
  insert: { name: 'Insert burete/carton', pricePerUnit: 1.20 },
};

// Setup and assembly costs
const SETUP_COST = 35; // € per order
const ASSEMBLY_COST_PER_UNIT = 0.25; // € per box

const MARKUP_OPTIONS = [
  { label: '30%', value: 30 },
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
  { label: '60%', value: 60 },
  { label: '70%', value: 70 },
  { label: '80%', value: 80 },
];

export function BoxCalculator({ onAddToOffer }: BoxCalculatorProps) {
  const [calculation, setCalculation] = useState<BoxCalculation>({
    length: 20,
    width: 15,
    height: 10,
    quantity: 100,
    boxType: 'simple',
    materialType: 'coated-300',
    printType: 'cmyk-1side',
    hasLamination: false,
    hasSpotUV: false,
    hasHotStamp: false,
    hasEmboss: false,
    hasMagnet: false,
    hasInsert: false,
    markup: 50,
  });

  const calculatePrice = (): BoxResult => {
    const boxType = BOX_TYPES.find(b => b.id === calculation.boxType) || BOX_TYPES[0];
    const material = MATERIAL_TYPES.find(m => m.id === calculation.materialType) || MATERIAL_TYPES[0];
    const print = PRINT_TYPES.find(p => p.id === calculation.printType) || PRINT_TYPES[0];

    // Calculate material area (simplified box unfolding formula)
    // Surface area = 2*(L*W + L*H + W*H) + margins/overlaps (~15%)
    const L = calculation.length / 100; // Convert cm to m
    const W = calculation.width / 100;
    const H = calculation.height / 100;
    const baseArea = 2 * (L * W + L * H + W * H);
    const materialArea = baseArea * 1.15 * boxType.factor; // Add margins and complexity factor

    // Material cost
    const materialCost = materialArea * material.pricePerM2;

    // Print cost
    const printCost = materialArea * print.pricePerM2;

    // Finishing costs
    let finishingCost = 0;
    if (calculation.hasLamination) {
      finishingCost += materialArea * FINISHING_OPTIONS.lamination.pricePerM2;
    }
    if (calculation.hasSpotUV) {
      finishingCost += materialArea * FINISHING_OPTIONS.spotUV.pricePerM2;
    }
    if (calculation.hasHotStamp) {
      finishingCost += FINISHING_OPTIONS.hotStamp.pricePerUnit;
    }
    if (calculation.hasEmboss) {
      finishingCost += FINISHING_OPTIONS.emboss.pricePerUnit;
    }
    if (calculation.hasMagnet) {
      finishingCost += FINISHING_OPTIONS.magnet.pricePerUnit;
    }
    if (calculation.hasInsert) {
      finishingCost += FINISHING_OPTIONS.insert.pricePerUnit;
    }

    // Assembly cost
    const assemblyCost = ASSEMBLY_COST_PER_UNIT;

    // Setup cost per unit (amortized over quantity)
    const setupCostPerUnit = SETUP_COST / calculation.quantity;

    // Total production cost per unit
    const productionCostPerUnit = materialCost + printCost + finishingCost + assemblyCost + setupCostPerUnit;

    // Apply markup
    const pricePerUnitWithMarkup = productionCostPerUnit * (1 + calculation.markup / 100);

    // Total price
    const totalPrice = pricePerUnitWithMarkup * calculation.quantity;

    return {
      materialArea: materialArea * 10000, // Convert to cm²
      materialCost,
      printCost,
      finishingCost,
      assemblyCost,
      setupCost: setupCostPerUnit,
      productionCostPerUnit,
      pricePerUnitWithMarkup,
      totalPrice,
    };
  };

  const result = calculatePrice();

  const handleAddToOffer = () => {
    if (onAddToOffer) {
      const boxType = BOX_TYPES.find(b => b.id === calculation.boxType);
      const material = MATERIAL_TYPES.find(m => m.id === calculation.materialType);
      
      const finishings = [];
      if (calculation.hasLamination) finishings.push('laminare');
      if (calculation.hasSpotUV) finishings.push('UV selectiv');
      if (calculation.hasHotStamp) finishings.push('hot stamp');
      if (calculation.hasEmboss) finishings.push('emboss');
      if (calculation.hasMagnet) finishings.push('magneți');
      if (calculation.hasInsert) finishings.push('insert');
      
      onAddToOffer({
        name: `${boxType?.name} ${calculation.length}x${calculation.width}x${calculation.height}cm`,
        quantity: calculation.quantity,
        unitPrice: result.pricePerUnitWithMarkup,
        totalPrice: result.totalPrice,
        details: `${material?.name}${finishings.length > 0 ? ', ' + finishings.join(', ') : ''}, adaos ${calculation.markup}%`,
      });
    }
  };

  return (
    <Card className="border-brand-orange/30 bg-gradient-to-br from-brand-orange/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Box className="h-5 w-5 text-brand-orange" />
          Calculator Cutii
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Calculează prețul pentru cutii personalizate bazat pe dimensiuni, material și finisări.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Box Type */}
        <div className="space-y-2">
          <Label className="text-xs">Tip cutie</Label>
          <Select 
            value={calculation.boxType} 
            onValueChange={(value) => setCalculation(prev => ({ ...prev, boxType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOX_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Lungime (cm)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={calculation.length}
              onChange={(e) => setCalculation(prev => ({ ...prev, length: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lățime (cm)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={calculation.width}
              onChange={(e) => setCalculation(prev => ({ ...prev, width: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Înălțime (cm)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={calculation.height}
              onChange={(e) => setCalculation(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        {/* Material Type */}
        <div className="space-y-2">
          <Label className="text-xs">Material</Label>
          <Select 
            value={calculation.materialType} 
            onValueChange={(value) => setCalculation(prev => ({ ...prev, materialType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPES.map((mat) => (
                <SelectItem key={mat.id} value={mat.id}>
                  {mat.name} ({mat.pricePerM2.toFixed(2)} €/m²)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Print Type */}
        <div className="space-y-2">
          <Label className="text-xs">Imprimare</Label>
          <Select 
            value={calculation.printType} 
            onValueChange={(value) => setCalculation(prev => ({ ...prev, printType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRINT_TYPES.map((print) => (
                <SelectItem key={print.id} value={print.id}>
                  {print.name} {print.pricePerM2 > 0 && `(${print.pricePerM2.toFixed(2)} €/m²)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Finishing Options */}
        <div className="space-y-2">
          <Label className="text-xs">Finisări</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="lamination"
                checked={calculation.hasLamination}
                onCheckedChange={(checked) => setCalculation(prev => ({ ...prev, hasLamination: !!checked }))}
              />
              <label htmlFor="lamination" className="text-xs cursor-pointer">
                Laminare ({FINISHING_OPTIONS.lamination.pricePerM2.toFixed(2)} €/m²)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spotUV"
                checked={calculation.hasSpotUV}
                onCheckedChange={(checked) => setCalculation(prev => ({ ...prev, hasSpotUV: !!checked }))}
              />
              <label htmlFor="spotUV" className="text-xs cursor-pointer">
                Lac UV selectiv ({FINISHING_OPTIONS.spotUV.pricePerM2.toFixed(2)} €/m²)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hotStamp"
                checked={calculation.hasHotStamp}
                onCheckedChange={(checked) => setCalculation(prev => ({ ...prev, hasHotStamp: !!checked }))}
              />
              <label htmlFor="hotStamp" className="text-xs cursor-pointer">
                Hot stamping ({FINISHING_OPTIONS.hotStamp.pricePerUnit.toFixed(2)} €/buc)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="emboss"
                checked={calculation.hasEmboss}
                onCheckedChange={(checked) => setCalculation(prev => ({ ...prev, hasEmboss: !!checked }))}
              />
              <label htmlFor="emboss" className="text-xs cursor-pointer">
                Emboss ({FINISHING_OPTIONS.emboss.pricePerUnit.toFixed(2)} €/buc)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="magnet"
                checked={calculation.hasMagnet}
                onCheckedChange={(checked) => setCalculation(prev => ({ ...prev, hasMagnet: !!checked }))}
              />
              <label htmlFor="magnet" className="text-xs cursor-pointer">
                Magneți ({FINISHING_OPTIONS.magnet.pricePerUnit.toFixed(2)} €/buc)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="insert"
                checked={calculation.hasInsert}
                onCheckedChange={(checked) => setCalculation(prev => ({ ...prev, hasInsert: !!checked }))}
              />
              <label htmlFor="insert" className="text-xs cursor-pointer">
                Insert ({FINISHING_OPTIONS.insert.pricePerUnit.toFixed(2)} €/buc)
              </label>
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <Label className="text-xs">Cantitate (bucăți)</Label>
          <Input
            type="number"
            min="1"
            max="100000"
            value={calculation.quantity}
            onChange={(e) => setCalculation(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
          />
        </div>

        {/* Markup Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Adaos comercial</Label>
            <Badge variant="secondary" className="text-xs">
              {calculation.markup}%
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MARKUP_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={calculation.markup === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCalculation(prev => ({ ...prev, markup: option.value }))}
                className="text-xs h-7 px-2"
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Slider
            value={[calculation.markup]}
            onValueChange={(values) => setCalculation(prev => ({ ...prev, markup: values[0] }))}
            min={0}
            max={150}
            step={5}
            className="mt-2"
          />
        </div>

        <Separator />

        {/* Results */}
        <div className="space-y-2 bg-muted/50 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Suprafață desfășurată</span>
            <span>{result.materialArea.toFixed(0)} cm²</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost material/buc</span>
            <span>{result.materialCost.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost imprimare/buc</span>
            <span>{result.printCost.toFixed(2)} €</span>
          </div>
          {result.finishingCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Finisări/buc</span>
              <span>{result.finishingCost.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Asamblare/buc</span>
            <span>{result.assemblyCost.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Setup/buc (amortizat)</span>
            <span>{result.setupCost.toFixed(2)} €</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost producție/buc</span>
            <span>{result.productionCostPerUnit.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Preț/bucată (cu adaos {calculation.markup}%)</span>
            <span>{result.pricePerUnitWithMarkup.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-brand-orange">
            <span>Total ({calculation.quantity} buc)</span>
            <span>{result.totalPrice.toFixed(2)} €</span>
          </div>
        </div>

        {/* Add to Offer Button */}
        {onAddToOffer && (
          <Button 
            onClick={handleAddToOffer} 
            className="w-full gap-2 bg-brand-orange hover:bg-brand-orange/90"
            disabled={calculation.length <= 0 || calculation.width <= 0 || calculation.height <= 0}
          >
            <Plus className="h-4 w-4" />
            Adaugă în ofertă
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
