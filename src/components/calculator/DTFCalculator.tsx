import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Shirt, Plus, Calculator, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DTFCalculation {
  width: number;
  height: number;
  quantity: number;
  markup: number;
  includePress: boolean;
}

interface DTFResult {
  areaCm2: number;
  productionCostPerUnit: number;
  pricePerUnitWithMarkup: number;
  pressCost: number;
  totalPerUnit: number;
  totalPrice: number;
}

interface DTFCalculatorProps {
  onAddToOffer?: (item: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details: string;
  }) => void;
}

// Constants from Excel (all in EUR)
const PRODUCTION_COST_PER_MP = 15.46; // €/mp total production
const PRODUCTION_COST_PER_CM2 = PRODUCTION_COST_PER_MP / 10000; // Convert to cm²
const PRESS_APPLICATION_COST = 0.06; // € per application (0.3 RON / 5)

// Standard formats in cm
const STANDARD_FORMATS = [
  { name: 'A5', width: 14.8, height: 21 },
  { name: 'A4', width: 21, height: 29.7 },
  { name: 'A3', width: 29.7, height: 42 },
  { name: '10x10', width: 10, height: 10 },
  { name: '15x15', width: 15, height: 15 },
  { name: '20x20', width: 20, height: 20 },
];

const MARKUP_OPTIONS = [
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
  { label: '60%', value: 60 },
  { label: '70%', value: 70 },
  { label: '80%', value: 80 },
  { label: '100%', value: 100 },
];

export function DTFCalculator({ onAddToOffer }: DTFCalculatorProps) {
  const [calculation, setCalculation] = useState<DTFCalculation>({
    width: 10,
    height: 10,
    quantity: 1,
    markup: 50,
    includePress: true,
  });

  const calculatePrice = (): DTFResult => {
    const areaCm2 = calculation.width * calculation.height;
    
    // Base production cost per cm² (in EUR)
    const productionCostPerUnit = areaCm2 * PRODUCTION_COST_PER_CM2;
    
    // Apply markup
    const pricePerUnitWithMarkup = productionCostPerUnit * (1 + calculation.markup / 100);
    
    // Press cost (optional)
    const pressCost = calculation.includePress ? PRESS_APPLICATION_COST : 0;
    
    // Total per unit
    const totalPerUnit = pricePerUnitWithMarkup + pressCost;
    
    // Total price
    const totalPrice = totalPerUnit * calculation.quantity;
    
    return {
      areaCm2,
      productionCostPerUnit,
      pricePerUnitWithMarkup,
      pressCost,
      totalPerUnit,
      totalPrice,
    };
  };

  const result = calculatePrice();

  const handleFormatClick = (format: typeof STANDARD_FORMATS[0]) => {
    setCalculation(prev => ({
      ...prev,
      width: format.width,
      height: format.height,
    }));
  };

  const handleAddToOffer = () => {
    if (onAddToOffer) {
      const formatName = STANDARD_FORMATS.find(
        f => Math.abs(f.width - calculation.width) < 0.1 && Math.abs(f.height - calculation.height) < 0.1
      )?.name || `${calculation.width}x${calculation.height}cm`;
      
      onAddToOffer({
        name: `Transfer DTF ${formatName}`,
        quantity: calculation.quantity,
        unitPrice: result.totalPerUnit,
        totalPrice: result.totalPrice,
        details: `${calculation.width}x${calculation.height}cm, adaos ${calculation.markup}%${calculation.includePress ? ', cu presare' : ''}`,
      });
    }
  };

  return (
    <Card className="border-brand-teal/30 bg-gradient-to-br from-brand-teal/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shirt className="h-5 w-5 text-brand-teal" />
          Calculator DTF
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Calculează prețul pentru transfer DTF bazat pe suprafața în cm² și adaosul comercial.</p>
                <p className="mt-1 text-xs text-muted-foreground">Cost producție: {PRODUCTION_COST_PER_MP.toFixed(2)}€/mp</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Standard Formats */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Formate standard</Label>
          <div className="flex flex-wrap gap-2">
            {STANDARD_FORMATS.map((format) => (
              <Button
                key={format.name}
                variant={
                  Math.abs(calculation.width - format.width) < 0.1 && 
                  Math.abs(calculation.height - format.height) < 0.1
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => handleFormatClick(format)}
                className="text-xs"
              >
                {format.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Dimensions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Lățime (cm)</Label>
            <Input
              type="number"
              min="1"
              max="60"
              step="0.1"
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
              step="0.1"
              value={calculation.height}
              onChange={(e) => setCalculation(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <Label className="text-xs">Cantitate (bucăți)</Label>
          <Input
            type="number"
            min="1"
            max="10000"
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

        {/* Press Application Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">Include aplicare presă (+{PRESS_APPLICATION_COST.toFixed(2)} €/buc)</Label>
          <Button
            variant={calculation.includePress ? "default" : "outline"}
            size="sm"
            onClick={() => setCalculation(prev => ({ ...prev, includePress: !prev.includePress }))}
          >
            {calculation.includePress ? 'Da' : 'Nu'}
          </Button>
        </div>

        <Separator />

        {/* Results */}
        <div className="space-y-2 bg-muted/50 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Suprafață</span>
            <span>{result.areaCm2.toFixed(1)} cm²</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost producție/buc</span>
            <span>{result.productionCostPerUnit.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Preț cu adaos {calculation.markup}%</span>
            <span>{result.pricePerUnitWithMarkup.toFixed(2)} €</span>
          </div>
          {calculation.includePress && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aplicare presă</span>
              <span>+{result.pressCost.toFixed(2)} €</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Preț/bucată</span>
            <span>{result.totalPerUnit.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-brand-teal">
            <span>Total ({calculation.quantity} buc)</span>
            <span>{result.totalPrice.toFixed(2)} €</span>
          </div>
        </div>

        {/* Add to Offer Button */}
        {onAddToOffer && (
          <Button 
            onClick={handleAddToOffer} 
            className="w-full gap-2 bg-brand-teal hover:bg-brand-teal/90"
            disabled={calculation.width <= 0 || calculation.height <= 0}
          >
            <Plus className="h-4 w-4" />
            Adaugă în ofertă
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
