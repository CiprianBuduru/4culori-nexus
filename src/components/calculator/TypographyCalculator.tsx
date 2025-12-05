import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ProductType = 'carti_vizita' | 'flyer' | 'pliant' | 'brosura' | 'notes' | 'agenda' | 'mapa';

interface CalculatorProps {
  onAddToOffer?: (item: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details: string;
  }) => void;
}

// Placeholder prices in EUR (per SRA3 sheet)
const PRICES = {
  carton_300g: 0.5,
  carton_350g: 0.6,
  carton_400g: 0.7,
  hartie_90g: 0.15,
  hartie_120g: 0.2,
  hartie_160g: 0.25,
  hartie_200g: 0.3,
  hartie_250g: 0.35,
  tipar_sra3: 0.1, // per impression
  plastifiere_mata: 0.15,
  plastifiere_lucioasa: 0.12,
  plastifiere_softtouch: 0.25,
  spira: 0.8,
  coperta_mucava: 1.5,
  capsare: 0.2,
  faltuire: 0.1,
  stantare: 2,
  dtp_ora: 15,
};

const HIDDEN_COSTS = {
  dtp: 0.5,
  manopera: 0.02,
  prisoase: 0.10, // 10% for typography
  mentenanta: 0.05,
};

const MARKUP_OPTIONS = [
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
  { label: '60%', value: 60 },
  { label: '80%', value: 80 },
  { label: '100%', value: 100 },
];

const PRODUCT_TYPES: { value: ProductType; label: string; icon: string }[] = [
  { value: 'carti_vizita', label: 'Cărți de vizită', icon: '💳' },
  { value: 'flyer', label: 'Flyer', icon: '📄' },
  { value: 'pliant', label: 'Pliant', icon: '📋' },
  { value: 'brosura', label: 'Broșură', icon: '📖' },
  { value: 'notes', label: 'Notes', icon: '📒' },
  { value: 'agenda', label: 'Agendă', icon: '📅' },
  { value: 'mapa', label: 'Mapă prezentare', icon: '📁' },
];

const FORMATS = {
  carti_vizita: [
    { name: '9x5 cm', pcsPerSheet: 20 },
    { name: '8.5x5.5 cm', pcsPerSheet: 18 },
    { name: 'Atipică', pcsPerSheet: 15 },
  ],
  standard: [
    { name: 'DL', pcsPerSheet: 6 },
    { name: 'A6', pcsPerSheet: 8 },
    { name: 'A5', pcsPerSheet: 4 },
    { name: 'A4', pcsPerSheet: 2 },
  ],
  brosura: [
    { name: 'DL', pcsPerSheet: 3 },
    { name: 'A6', pcsPerSheet: 4 },
    { name: 'A5', pcsPerSheet: 2 },
    { name: 'A4', pcsPerSheet: 1 },
    { name: '20x20 cm', pcsPerSheet: 2 },
  ],
};

const PAPER_TYPES = [
  { value: 'carton_300g', label: '300 g/mp' },
  { value: 'carton_350g', label: '350 g/mp' },
  { value: 'carton_400g', label: '400 g/mp' },
];

const INTERIOR_PAPER = [
  { value: 'hartie_90g', label: '90 g/mp' },
  { value: 'hartie_120g', label: '120 g/mp' },
  { value: 'hartie_160g', label: '160 g/mp' },
  { value: 'hartie_200g', label: '200 g/mp' },
];

const PRINT_OPTIONS = [
  { value: '4+0', label: '4+0 (o față)' },
  { value: '4+4', label: '4+4 (două fețe)' },
];

const LAMINATION_OPTIONS = [
  { value: 'none', label: 'Fără plastifiere', price: 0 },
  { value: 'mata_1', label: 'Mată o față', price: 'plastifiere_mata' as const },
  { value: 'mata_2', label: 'Mată 2 fețe', price: 'plastifiere_mata' as const, multiplier: 2 },
  { value: 'lucioasa_1', label: 'Lucioasă o față', price: 'plastifiere_lucioasa' as const },
  { value: 'lucioasa_2', label: 'Lucioasă 2 fețe', price: 'plastifiere_lucioasa' as const, multiplier: 2 },
  { value: 'softtouch_1', label: 'Soft-touch o față', price: 'plastifiere_softtouch' as const },
  { value: 'softtouch_2', label: 'Soft-touch 2 fețe', price: 'plastifiere_softtouch' as const, multiplier: 2 },
];

export function TypographyCalculator({ onAddToOffer }: CalculatorProps) {
  const [productType, setProductType] = useState<ProductType>('carti_vizita');
  const [quantity, setQuantity] = useState(100);
  const [markup, setMarkup] = useState(40);
  const [format, setFormat] = useState(FORMATS.carti_vizita[0]);
  const [paper, setPaper] = useState('carton_300g');
  const [print, setPrint] = useState('4+0');
  const [lamination, setLamination] = useState('none');
  const [interiorPaper, setInteriorPaper] = useState('hartie_90g');
  const [interiorPages, setInteriorPages] = useState(16);
  const [dtpHours, setDtpHours] = useState(0.5);

  const getFormats = () => {
    if (productType === 'carti_vizita') return FORMATS.carti_vizita;
    if (['brosura', 'notes', 'agenda', 'mapa'].includes(productType)) return FORMATS.brosura;
    return FORMATS.standard;
  };

  const calculatePrice = () => {
    const formats = getFormats();
    const selectedFormat = formats.find(f => f.name === format.name) || formats[0];
    const sheetsNeeded = Math.ceil(quantity / selectedFormat.pcsPerSheet);
    
    let baseCost = 0;
    const paperPrice = PRICES[paper as keyof typeof PRICES] || 0.5;
    const printMultiplier = print === '4+4' ? 2 : 1;
    
    // Paper cost
    baseCost = sheetsNeeded * paperPrice;
    
    // Print cost
    baseCost += sheetsNeeded * PRICES.tipar_sra3 * printMultiplier;
    
    // Lamination
    const laminationOption = LAMINATION_OPTIONS.find(l => l.value === lamination);
    if (laminationOption && laminationOption.price !== 0) {
      const laminationPrice = PRICES[laminationOption.price];
      const laminationMultiplier = laminationOption.multiplier || 1;
      baseCost += sheetsNeeded * laminationPrice * laminationMultiplier;
    }
    
    // Product-specific additions
    if (productType === 'pliant') {
      baseCost += quantity * PRICES.faltuire;
    }
    
    if (productType === 'brosura') {
      // Interior pages
      const interiorSheets = Math.ceil((quantity * interiorPages / 4) / 2); // 4 pages per sheet, 2 per SRA3
      const interiorPaperPrice = PRICES[interiorPaper as keyof typeof PRICES] || 0.15;
      baseCost += interiorSheets * interiorPaperPrice;
      baseCost += interiorSheets * PRICES.tipar_sra3 * printMultiplier;
      baseCost += quantity * PRICES.capsare;
    }
    
    if (['notes', 'agenda'].includes(productType)) {
      // Interior pages
      const interiorSheets = Math.ceil((quantity * interiorPages) / 2);
      const interiorPaperPrice = PRICES[interiorPaper as keyof typeof PRICES] || 0.15;
      baseCost += interiorSheets * interiorPaperPrice;
      baseCost += interiorSheets * PRICES.tipar_sra3;
      baseCost += quantity * PRICES.coperta_mucava;
      baseCost += quantity * PRICES.spira;
    }
    
    if (productType === 'mapa') {
      baseCost += quantity * PRICES.stantare;
    }
    
    // DTP cost
    const dtpCost = dtpHours * PRICES.dtp_ora;
    
    // Hidden costs multiplier
    const hiddenMultiplier = 1 + HIDDEN_COSTS.manopera + HIDDEN_COSTS.prisoase + HIDDEN_COSTS.mentenanta;
    
    const productionCost = baseCost * hiddenMultiplier + dtpCost;
    const finalPrice = productionCost * (1 + markup / 100);
    
    return {
      sheetsNeeded,
      productionCost,
      pricePerUnit: finalPrice / quantity,
      totalPrice: finalPrice,
    };
  };

  const result = calculatePrice();

  const handleProductTypeChange = (newType: ProductType) => {
    setProductType(newType);
    const formats = newType === 'carti_vizita' 
      ? FORMATS.carti_vizita 
      : ['brosura', 'notes', 'agenda', 'mapa'].includes(newType) 
        ? FORMATS.brosura 
        : FORMATS.standard;
    setFormat(formats[0]);
  };

  const handleAddToOffer = () => {
    if (!onAddToOffer) return;
    
    const typeLabel = PRODUCT_TYPES.find(t => t.value === productType)?.label || productType;
    const paperLabel = PAPER_TYPES.find(p => p.value === paper)?.label || paper;
    const laminationLabel = LAMINATION_OPTIONS.find(l => l.value === lamination)?.label || '';
    
    let details = `${format.name}, ${paperLabel}, ${print}`;
    if (lamination !== 'none') details += `, ${laminationLabel}`;
    if (['brosura', 'notes', 'agenda'].includes(productType)) {
      details += `, ${interiorPages} pagini interior`;
    }
    details += `, adaos ${markup}%`;
    
    onAddToOffer({
      name: typeLabel,
      quantity,
      unitPrice: result.pricePerUnit,
      totalPrice: result.totalPrice,
      details,
    });
  };

  const showInterior = ['brosura', 'notes', 'agenda'].includes(productType);

  return (
    <Card className="border-brand-green/30 bg-gradient-to-br from-brand-green/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-brand-green" />
          Calculator Tipografie
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Calculează prețuri pentru tipărituri: cărți de vizită, flyere, pliante, broșuri, notes, agende.</p>
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
                onClick={() => handleProductTypeChange(type.value)}
                className="text-xs gap-1"
              >
                <span>{type.icon}</span>
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <Label className="text-xs">Format</Label>
          <div className="flex flex-wrap gap-2">
            {getFormats().map((f) => (
              <Button
                key={f.name}
                variant={format.name === f.name ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat(f)}
                className="text-xs"
              >
                {f.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <Label className="text-xs">Cantitate (bucăți)</Label>
          <Input
            type="number"
            min={productType === 'carti_vizita' ? 60 : 10}
            max="100000"
            step={productType === 'carti_vizita' ? 20 : 10}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          />
          {productType === 'carti_vizita' && (
            <p className="text-xs text-muted-foreground">Minim 60 buc, multiplu de 20</p>
          )}
        </div>

        {/* Paper type */}
        <div className="space-y-2">
          <Label className="text-xs">Gramaj hârtie/carton</Label>
          <Select value={paper} onValueChange={setPaper}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAPER_TYPES.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Print type */}
        <div className="space-y-2">
          <Label className="text-xs">Tipar</Label>
          <div className="flex gap-2">
            {PRINT_OPTIONS.map((p) => (
              <Button
                key={p.value}
                variant={print === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPrint(p.value)}
                className="text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Lamination */}
        <div className="space-y-2">
          <Label className="text-xs">Plastifiere</Label>
          <Select value={lamination} onValueChange={setLamination}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAMINATION_OPTIONS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Interior pages (for brosura, notes, agenda) */}
        {showInterior && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Hârtie interior</Label>
              <Select value={interiorPaper} onValueChange={setInteriorPaper}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERIOR_PAPER.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pagini interior {productType === 'brosura' && '(multiplu de 4)'}</Label>
              <Input
                type="number"
                min={productType === 'brosura' ? 4 : 10}
                max="500"
                step={productType === 'brosura' ? 4 : 10}
                value={interiorPages}
                onChange={(e) => setInteriorPages(parseInt(e.target.value) || 4)}
              />
            </div>
          </>
        )}

        {/* DTP hours */}
        <div className="space-y-1">
          <Label className="text-xs">Ore DTP</Label>
          <Input
            type="number"
            min="0"
            max="20"
            step="0.5"
            value={dtpHours}
            onChange={(e) => setDtpHours(parseFloat(e.target.value) || 0)}
          />
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
            <span className="text-muted-foreground">Coli SRA3 necesare</span>
            <span>{result.sheetsNeeded}</span>
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
          <div className="flex justify-between text-lg font-bold text-brand-green">
            <span>Total ({quantity} buc)</span>
            <span>{result.totalPrice.toFixed(2)} €</span>
          </div>
        </div>

        {onAddToOffer && (
          <Button
            onClick={handleAddToOffer}
            className="w-full gap-2 bg-brand-green hover:bg-brand-green/90"
            disabled={quantity <= 0}
          >
            <Plus className="h-4 w-4" />
            Adaugă în ofertă
          </Button>
        )}
      </CardContent>
    </Card>
  );
}