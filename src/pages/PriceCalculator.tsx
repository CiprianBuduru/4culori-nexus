import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, RotateCcw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { RecipeSelector } from '@/components/calculator/RecipeSelector';
import { RecipeCalculatorItem } from '@/components/calculator/RecipeCalculatorItem';
import { BriefAnalyzer } from '@/components/calculator/BriefAnalyzer';
import { Recipe, RecipeCalculation, categoryLabels, RecipeCategory, defaultRecipes } from '@/types/recipes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AISuggestion {
  recipeId: string;
  recipeName: string;
  quantity: number;
  confidence: number;
  reasoning: string;
  recipe: {
    id: string;
    name: string;
    description: string;
    base_price: number;
    price_per_unit: number;
    materials: any;
    services: any;
  };
}

export default function PriceCalculator() {
  const [calculations, setCalculations] = useState<RecipeCalculation[]>([]);
  const [discount, setDiscount] = useState(0);

  const handleSelectRecipe = (recipe: Recipe) => {
    const newCalculation: RecipeCalculation = {
      id: crypto.randomUUID(),
      recipeId: recipe.id,
      recipeName: recipe.name,
      category: recipe.category,
      quantity: 1,
      dimensions: ['boxes', 'large-print'].includes(recipe.category) || 
                  recipe.id === 'poster' || recipe.id === 'plaque-custom'
        ? { width: 0, height: 0, depth: 0 }
        : undefined,
      materialCost: 0,
      personalizationCost: 0,
      totalPrice: recipe.basePrice,
    };
    setCalculations([...calculations, newCalculation]);
  };

  const handleAddAISuggestion = (suggestion: AISuggestion) => {
    const basePrice = suggestion.recipe.base_price || 0;
    const pricePerUnit = suggestion.recipe.price_per_unit || 0;
    const totalPrice = basePrice + (pricePerUnit * suggestion.quantity);

    const newCalculation: RecipeCalculation = {
      id: crypto.randomUUID(),
      recipeId: suggestion.recipeId,
      recipeName: suggestion.recipeName,
      category: 'printed' as RecipeCategory, // Default category for DB recipes
      quantity: suggestion.quantity,
      materialCost: 0,
      personalizationCost: 0,
      totalPrice: totalPrice,
    };
    setCalculations([...calculations, newCalculation]);
    toast.success(`Adăugat: ${suggestion.recipeName} x${suggestion.quantity}`);
  };

  const handleUpdateCalculation = (updated: RecipeCalculation) => {
    setCalculations(calculations.map(c => c.id === updated.id ? updated : c));
  };

  const handleRemoveCalculation = (id: string) => {
    setCalculations(calculations.filter(c => c.id !== id));
  };

  // Group calculations by category for summary
  const groupedTotals = calculations.reduce((acc, calc) => {
    acc[calc.category] = (acc[calc.category] || 0) + calc.totalPrice;
    return acc;
  }, {} as Record<RecipeCategory, number>);

  const subtotal = calculations.reduce((sum, c) => sum + c.totalPrice, 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  const clearAll = () => {
    setCalculations([]);
    setDiscount(0);
  };

  const getRecipeById = (recipeId: string) => {
    return defaultRecipes.find(r => r.id === recipeId);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calculator Prețuri</h1>
            <p className="text-muted-foreground">
              Calculează prețuri pentru cutii, tipărituri, personalizări și printuri mari
            </p>
          </div>
          <Button variant="outline" onClick={clearAll} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Resetează
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - AI Analyzer, Recipe Selector & Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* AI Brief Analyzer */}
            <BriefAnalyzer onAddSuggestion={handleAddAISuggestion} />

            {/* Manual Recipe Selector */}
            <RecipeSelector onSelectRecipe={handleSelectRecipe} />

            {/* Added Items */}
            {calculations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Produse adăugate ({calculations.length})</h3>
              {calculations.map((calc) => {
                  const recipe = getRecipeById(calc.recipeId);
                  if (!recipe) return null;
                  return (
                    <RecipeCalculatorItem
                      key={calc.id}
                      recipe={recipe}
                      calculation={calc}
                      onUpdate={handleUpdateCalculation}
                      onRemove={() => handleRemoveCalculation(calc.id)}
                    />
                  );
                })}
              </div>
            )}

            {calculations.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selectează o rețetă din lista de mai sus pentru a începe calculul</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Summary */}
          <Card className="h-fit sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-brand-orange" />
                Sumar Ofertă
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category breakdown */}
              <div className="space-y-2">
                {Object.entries(groupedTotals).map(([category, categoryTotal]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {categoryLabels[category as RecipeCategory]}
                    </span>
                    <span>{categoryTotal.toFixed(2)} RON</span>
                  </div>
                ))}
                {calculations.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Niciun produs adăugat
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} RON</span>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label className="text-xs">Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                />
                {discount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Reducere: -{discountAmount.toFixed(2)} RON
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-brand-green">{total.toFixed(2)} RON</span>
              </div>

              <Button 
                className="w-full gradient-brand text-white" 
                size="lg"
                disabled={calculations.length === 0}
              >
                Generează Ofertă
              </Button>

              {calculations.length > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {calculations.length} produs(e) • {calculations.reduce((sum, c) => sum + c.quantity, 0)} bucăți total
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
