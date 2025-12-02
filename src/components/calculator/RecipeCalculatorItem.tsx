import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Box, FileText, Sparkles, Image } from 'lucide-react';
import { 
  Recipe, 
  RecipeCalculation, 
  RecipeCategory,
  defaultMaterials, 
  defaultPersonalizationMethods,
  categoryLabels 
} from '@/types/recipes';

interface RecipeCalculatorItemProps {
  recipe: Recipe;
  calculation: RecipeCalculation;
  onUpdate: (calculation: RecipeCalculation) => void;
  onRemove: () => void;
}

const categoryIcons: Record<RecipeCategory, typeof Box> = {
  'boxes': Box,
  'printed': FileText,
  'personalized': Sparkles,
  'large-print': Image,
};

const categoryColorClasses: Record<RecipeCategory, string> = {
  'boxes': 'bg-brand-orange/10 border-brand-orange/30',
  'printed': 'bg-brand-blue/10 border-brand-blue/30',
  'personalized': 'bg-brand-teal/10 border-brand-teal/30',
  'large-print': 'bg-brand-green/10 border-brand-green/30',
};

const categoryTextColors: Record<RecipeCategory, string> = {
  'boxes': 'text-brand-orange',
  'printed': 'text-brand-blue',
  'personalized': 'text-brand-teal',
  'large-print': 'text-brand-green',
};

export function RecipeCalculatorItem({ 
  recipe, 
  calculation, 
  onUpdate, 
  onRemove 
}: RecipeCalculatorItemProps) {
  const Icon = categoryIcons[recipe.category];
  const needsDimensions = ['boxes', 'large-print'].includes(recipe.category) || 
    recipe.id === 'poster' || recipe.id === 'plaque-custom';
  const needsDepth = recipe.category === 'boxes';
  
  const availablePersonalizations = defaultPersonalizationMethods.filter(
    m => recipe.personalizationMethods.includes(m.id)
  );

  // Calculate price based on recipe
  const calculatePrice = () => {
    let materialCost = 0;
    let personalizationCost = 0;
    
    // Calculate material cost
    if (recipe.components.length > 0) {
      const material = defaultMaterials.find(m => m.id === recipe.components[0].materialId);
      if (material) {
        if (needsDimensions && calculation.dimensions) {
          const { width, height, depth } = calculation.dimensions;
          if (recipe.category === 'boxes' && depth) {
            // Surface area for box (simplified)
            const surfaceArea = (width * height * 2 + width * depth * 2 + height * depth * 2) / 10000;
            materialCost = surfaceArea * material.pricePerUnit;
          } else {
            // Simple width * height
            const area = (width * height) / 10000;
            materialCost = area * material.pricePerUnit;
          }
        } else {
          materialCost = recipe.components[0].quantity * material.pricePerUnit * calculation.quantity;
        }
      }
    }

    // Calculate personalization cost
    if (calculation.selectedPersonalization) {
      const method = defaultPersonalizationMethods.find(m => m.id === calculation.selectedPersonalization);
      if (method) {
        if (needsDimensions && calculation.dimensions) {
          const area = (calculation.dimensions.width * calculation.dimensions.height) / 10000;
          personalizationCost = area * method.pricePerUnit * calculation.quantity;
        } else {
          personalizationCost = method.pricePerUnit * calculation.quantity;
        }
      }
    }

    const totalPrice = (recipe.basePrice * calculation.quantity) + materialCost + personalizationCost;
    
    return { materialCost, personalizationCost, totalPrice };
  };

  const { materialCost, personalizationCost, totalPrice } = calculatePrice();

  // Update parent when values change
  useEffect(() => {
    onUpdate({
      ...calculation,
      materialCost,
      personalizationCost,
      totalPrice,
    });
  }, [calculation.quantity, calculation.dimensions, calculation.selectedPersonalization]);

  const handleQuantityChange = (value: number) => {
    onUpdate({ ...calculation, quantity: Math.max(1, value) });
  };

  const handleDimensionChange = (dim: 'width' | 'height' | 'depth', value: number) => {
    onUpdate({
      ...calculation,
      dimensions: {
        width: calculation.dimensions?.width || 0,
        height: calculation.dimensions?.height || 0,
        depth: calculation.dimensions?.depth || 0,
        [dim]: Math.max(0, value),
      },
    });
  };

  const handlePersonalizationChange = (value: string) => {
    onUpdate({
      ...calculation,
      selectedPersonalization: value === 'none' ? undefined : value,
    });
  };

  return (
    <Card className={`${categoryColorClasses[recipe.category]} border`}>
      <CardContent className="pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${categoryTextColors[recipe.category]}`} />
            <div>
              <h4 className="font-semibold">{recipe.name}</h4>
              <p className="text-xs text-muted-foreground">{recipe.description}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Cantitate</Label>
            <Input
              type="number"
              min="1"
              value={calculation.quantity}
              onChange={(e) => handleQuantityChange(Number(e.target.value))}
            />
          </div>

          {needsDimensions && (
            <>
              <div>
                <Label className="text-xs">Lățime (cm)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={calculation.dimensions?.width || ''}
                  onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                  placeholder="cm"
                />
              </div>
              <div>
                <Label className="text-xs">Înălțime (cm)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={calculation.dimensions?.height || ''}
                  onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                  placeholder="cm"
                />
              </div>
              {needsDepth && (
                <div>
                  <Label className="text-xs">Adâncime (cm)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculation.dimensions?.depth || ''}
                    onChange={(e) => handleDimensionChange('depth', Number(e.target.value))}
                    placeholder="cm"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Personalization */}
        {availablePersonalizations.length > 0 && (
          <div>
            <Label className="text-xs">Metodă de personalizare</Label>
            <Select 
              value={calculation.selectedPersonalization || 'none'}
              onValueChange={handlePersonalizationChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectează metoda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Fără personalizare</SelectItem>
                {availablePersonalizations.map(method => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name} ({method.pricePerUnit.toFixed(2)} RON/{method.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Price breakdown */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Bază: {(recipe.basePrice * calculation.quantity).toFixed(2)} RON</span>
            {materialCost > 0 && <span>Material: {materialCost.toFixed(2)} RON</span>}
            {personalizationCost > 0 && <span>Personalizare: {personalizationCost.toFixed(2)} RON</span>}
          </div>
          <span className={`font-bold text-lg ${categoryTextColors[recipe.category]}`}>
            {totalPrice.toFixed(2)} RON
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
