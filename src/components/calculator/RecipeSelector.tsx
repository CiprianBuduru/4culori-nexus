import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Box, FileText, Sparkles, Image, Plus } from 'lucide-react';
import { 
  Recipe, 
  RecipeCategory, 
  defaultRecipes, 
  categoryLabels 
} from '@/types/recipes';

interface RecipeSelectorProps {
  onSelectRecipe: (recipe: Recipe) => void;
}

const categoryIcons = {
  'boxes': Box,
  'printed': FileText,
  'personalized': Sparkles,
  'large-print': Image,
};

const categoryColorClasses: Record<RecipeCategory, string> = {
  'boxes': 'text-brand-orange border-brand-orange/30 bg-brand-orange/10',
  'printed': 'text-brand-blue border-brand-blue/30 bg-brand-blue/10',
  'personalized': 'text-brand-teal border-brand-teal/30 bg-brand-teal/10',
  'large-print': 'text-brand-green border-brand-green/30 bg-brand-green/10',
};

export function RecipeSelector({ onSelectRecipe }: RecipeSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<RecipeCategory>('boxes');

  const categories: RecipeCategory[] = ['boxes', 'printed', 'personalized', 'large-print'];
  
  const filteredRecipes = defaultRecipes.filter(r => r.category === activeCategory);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Selectează Rețetă</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as RecipeCategory)}>
          <TabsList className="grid grid-cols-4 mb-4">
            {categories.map(cat => {
              const Icon = categoryIcons[cat];
              return (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="text-xs gap-1"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{categoryLabels[cat]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat} value={cat} className="space-y-2">
              {filteredRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{recipe.name}</span>
                      <Badge variant="outline" className={categoryColorClasses[recipe.category]}>
                        {categoryLabels[recipe.category]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{recipe.description}</p>
                    {recipe.personalizationMethods.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Personalizări: {recipe.personalizationMethods.length} metode disponibile
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      de la {recipe.basePrice.toFixed(2)} RON
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => onSelectRecipe(recipe)}
                      className="gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adaugă
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
