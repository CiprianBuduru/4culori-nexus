import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Palette, Plus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type TransferType = 'serigrafie' | 'dtg' | 'colorprint' | 'psfilm' | 'serigrafie_directa' | 'tampografie' | 'uv' | 'gravura';

interface CalculatorProps {
  onAddToOffer?: (item: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details: string;
  }) => void;
}

// Placeholder prices in EUR
const PRICES = {
  serigrafie_mp: 20, // €/mp per culoare
  dtg_mp: 25, // €/mp
  colorprint_mp: 15, // €/mp
  psfilm_mp: 12, // €/mp
  tragere_serigrafie: 0.5, // €/buc per culoare
  tragere_tampografie: 0.4, // €/buc per culoare
  uv_cmyk_cmp: 0.003, // €/cmp
  uv_alba_cmp: 0.002, // €/cmp
  gravura_metal: 0.8, // €/buc
  gravura_lemn_cmp: 0.005, // €/cmp
  ambalare: 0.15, // €/buc
  dtp_ora: 15, // €/ora
};

const SETUP_COSTS = {
  serigrafie: 40,
  dtg: 15,
  colorprint: 15,
  psfilm: 15,
  serigrafie_directa: 40,
  tampografie: 40,
  uv: 40,
  gravura: 40,
};

const HIDDEN_COSTS = {
  dtp: 0.5,
  manopera: 0.02,
  prisoase: 0.05,
  mentenanta: 0.05,
};

const MARKUP_OPTIONS = [
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
  { label: '60%', value: 60 },
  { label: '80%', value: 80 },
  { label: '100%', value: 100 },
];

const TRANSFER_TYPES: { value: TransferType; label: string; icon: string }[] = [
  { value: 'serigrafie', label: 'Transfer Serigrafie', icon: '🎨' },
  { value: 'dtg', label: 'DTG', icon: '👕' },
  { value: 'colorprint', label: 'ColorPrint', icon: '🌈' },
  { value: 'psfilm', label: 'PSFilm', icon: '✨' },
  { value: 'serigrafie_directa', label: 'Serigrafie Directă', icon: '🖌️' },
  { value: 'tampografie', label: 'Tampografie', icon: '🖊️' },
  { value: 'uv', label: 'Print UV', icon: '💡' },
  { value: 'gravura', label: 'Gravură Laser', icon: '⚡' },
];

const MATERIAL_TYPES = [
  { value: 'metal', label: 'Metal' },
  { value: 'lemn', label: 'Lemn/Plastic/Sticlă' },
];

export function TransferCalculator({ onAddToOffer }: CalculatorProps) {
  const [transferType, setTransferType] = useState<TransferType>('serigrafie');
  const [width, setWidth] = useState(10); // cm
  const [height, setHeight] = useState(10); // cm
  const [quantity, setQuantity] = useState(100);
  const [markup, setMarkup] = useState(40);
  const [colors, setColors] = useState(1);
  const [pantone, setPantone] = useState(false);
  const [ambalare, setAmbalare] = useState(false);
  const [substratAlb, setSubstratAlb] = useState(false);
  const [materialType, setMaterialType] = useState('metal');
  const [rotund, setRotund] = useState(false);

  const calculatePrice = () => {
    let baseCost = 0;
    const areaCm2 = width * height;
    const areaMp = areaCm2 / 10000;
    const setupCost = SETUP_COSTS[transferType];
    
    switch (transferType) {
      case 'serigrafie':
        baseCost = areaMp * PRICES.serigrafie_mp * colors * quantity;
        break;
        
      case 'dtg':
        baseCost = areaMp * PRICES.dtg_mp * quantity;
        break;
        
      case 'colorprint':
        baseCost = areaMp * PRICES.colorprint_mp * quantity;
        break;
        
      case 'psfilm':
        baseCost = areaMp * PRICES.psfilm_mp * quantity;
        break;
        
      case 'serigrafie_directa':
        baseCost = quantity * PRICES.tragere_serigrafie * colors;
        break;
        
      case 'tampografie':
        baseCost = quantity * PRICES.tragere_tampografie * colors;
        break;
        
      case 'uv':
        baseCost = areaCm2 * PRICES.uv_cmyk_cmp * quantity;
        if (substratAlb) baseCost += areaCm2 * PRICES.uv_alba_cmp * quantity;
        break;
        
      case 'gravura':
        if (materialType === 'metal') {
          baseCost = quantity * PRICES.gravura_metal * (rotund ? 1.5 : 1);
        } else {
          baseCost = areaCm2 * PRICES.gravura_lemn_cmp * quantity;
        }
        break;
    }
    
    // Add ambalare if selected
    if (ambalare) baseCost += quantity * PRICES.ambalare;
    
    // Add hidden costs
    const dtpCost = HIDDEN_COSTS.dtp * PRICES.dtp_ora;
    const hiddenMultiplier = 1 + HIDDEN_COSTS.manopera + HIDDEN_COSTS.prisoase + HIDDEN_COSTS.mentenanta;
    
    const productionCost = baseCost * hiddenMultiplier + dtpCost + setupCost;
    const finalPrice = productionCost * (1 + markup / 100);
    
    return {
      areaCm2,
      setupCost,
      productionCost,
      pricePerUnit: finalPrice / quantity,
      totalPrice: finalPrice,
    };
  };

  const result = calculatePrice();

  const handleAddToOffer = () => {
    if (!onAddToOffer) return;
    
    const typeLabel = TRANSFER_TYPES.find(t => t.value === transferType)?.label || transferType;
    let details = `${width}x${height}cm, ${quantity} buc`;
    
    if (['serigrafie', 'serigrafie_directa', 'tampografie'].includes(transferType)) {
      details += `, ${colors} culori`;
    }
    if (pantone) details += ', Pantone';
    if (ambalare) details += ', ambalat';
    if (substratAlb) details += ', substrat alb';
    if (transferType === 'gravura') details += `, ${materialType}`;
    details += `, adaos ${markup}%`;
    
    onAddToOffer({
      name: typeLabel,
      quantity,
      unitPrice: result.pricePerUnit,
      totalPrice: result.totalPrice,
      details,
    });
  };

  const showColors = ['serigrafie', 'serigrafie_directa', 'tampografie'].includes(transferType);
  const showSubstratAlb = transferType === 'uv';
  const showMaterialType = transferType === 'gravura';

  return (
    <Card className="border-brand-orange/30 bg-gradient-to-br from-brand-orange/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-brand-orange" />
          Calculator Transfer & Personalizare
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Calculează prețuri pentru transferuri textile și personalizări: serigrafie, DTG, tampografie, UV, gravură.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transfer Type */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tip personalizare</Label>
          <div className="flex flex-wrap gap-2">
            {TRANSFER_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={transferType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTransferType(type.value)}
                className="text-xs gap-1"
              >
                <span>{type.icon}</span>
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Lățime (cm)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Înălțime (cm)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <Label className="text-xs">Cantitate (bucăți)</Label>
          <Input
            type="number"
            min="1"
            max="100000"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          />
        </div>

        {/* Colors (for serigrafie types) */}
        {showColors && (
          <div className="space-y-1">
            <Label className="text-xs">Număr culori</Label>
            <Input
              type="number"
              min="1"
              max="8"
              value={colors}
              onChange={(e) => setColors(parseInt(e.target.value) || 1)}
            />
            <div className="flex items-center justify-between mt-2">
              <Label className="text-sm">Culoare Pantone</Label>
              <Switch checked={pantone} onCheckedChange={setPantone} />
            </div>
          </div>
        )}

        {/* Substrat alb (for UV) */}
        {showSubstratAlb && (
          <div className="flex items-center justify-between">
            <Label className="text-sm">Substrat alb</Label>
            <Switch checked={substratAlb} onCheckedChange={setSubstratAlb} />
          </div>
        )}

        {/* Material type (for gravura) */}
        {showMaterialType && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Tip material</Label>
              <div className="flex gap-2">
                {MATERIAL_TYPES.map((mat) => (
                  <Button
                    key={mat.value}
                    variant={materialType === mat.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMaterialType(mat.value)}
                    className="text-xs"
                  >
                    {mat.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Obiect rotund</Label>
              <Switch checked={rotund} onCheckedChange={setRotund} />
            </div>
          </>
        )}

        {/* Ambalare */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">Ambalat/Dezambalat (+{PRICES.ambalare.toFixed(2)} €/buc)</Label>
          <Switch checked={ambalare} onCheckedChange={setAmbalare} />
        </div>

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
            <span>{result.areaCm2.toFixed(1)} cm²</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Setup</span>
            <span>{result.setupCost.toFixed(2)} €</span>
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
          <div className="flex justify-between text-lg font-bold text-brand-orange">
            <span>Total ({quantity} buc)</span>
            <span>{result.totalPrice.toFixed(2)} €</span>
          </div>
        </div>

        {onAddToOffer && (
          <Button
            onClick={handleAddToOffer}
            className="w-full gap-2 bg-brand-orange hover:bg-brand-orange/90"
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