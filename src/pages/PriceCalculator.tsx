// Price Calculator v2.0
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, RotateCcw, FileText, Users, Mail, Loader2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecipeSelector } from '@/components/calculator/RecipeSelector';
import { RecipeCalculatorItem } from '@/components/calculator/RecipeCalculatorItem';
import { BriefAnalyzer } from '@/components/calculator/BriefAnalyzer';
import { FlyerCalculator } from '@/components/calculator/FlyerCalculator';
import { BusinessCardCalculator } from '@/components/calculator/BusinessCardCalculator';
import { Recipe, RecipeCalculation, categoryLabels, RecipeCategory, defaultRecipes } from '@/types/recipes';
import { toast } from 'sonner';
import { generateOfferPdf } from '@/lib/generateOfferPdf';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
}

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
  const [clientName, setClientName] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientEmail, setClientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company, email')
        .eq('status', 'active')
        .order('name');
      
      if (!error && data) {
        setClients(data);
      }
    };
    fetchClients();
  }, []);

  const handleClientSelect = (value: string) => {
    if (value === 'custom') {
      setSelectedClientId('');
      setClientName('');
      setClientEmail('');
    } else {
      setSelectedClientId(value);
      const client = clients.find(c => c.id === value);
      if (client) {
        setClientName(client.company ? `${client.name} (${client.company})` : client.name);
        setClientEmail(client.email || '');
      }
    }
  };

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

  const handleAddCalculatorItem = (item: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details: string;
  }, category: RecipeCategory = 'personalized') => {
    const newCalculation: RecipeCalculation = {
      id: crypto.randomUUID(),
      recipeId: `custom-${Date.now()}`,
      recipeName: item.name,
      category,
      quantity: item.quantity,
      materialCost: 0,
      personalizationCost: 0,
      totalPrice: item.totalPrice,
    };
    setCalculations([...calculations, newCalculation]);
    toast.success(`Adăugat: ${item.name} (${item.details})`);
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
    setClientName('');
    setSelectedClientId('');
    setClientEmail('');
  };

  const getRecipeById = (recipeId: string) => {
    return defaultRecipes.find(r => r.id === recipeId);
  };

  const handleGeneratePdf = () => {
    try {
      const offerNumber = generateOfferPdf({
        calculations,
        subtotal,
        discount,
        discountAmount,
        total,
        clientName: clientName.trim() || undefined,
      });
      toast.success(`Oferta ${offerNumber} a fost generată cu succes!`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Eroare la generarea PDF-ului');
    }
  };

  const handleSendEmail = async () => {
    const emailToUse = clientEmail.trim();
    if (!emailToUse) {
      toast.error('Selectează un client cu email sau introdu adresa de email');
      return;
    }

    if (calculations.length === 0) {
      toast.error('Adaugă produse în ofertă');
      return;
    }

    setIsSendingEmail(true);
    
    try {
      const offerNumber = `OF-${Date.now()}`;
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO');
      
      const products = calculations.map(calc => ({
        name: calc.recipeName,
        quantity: calc.quantity,
        unitPrice: calc.quantity > 0 ? calc.totalPrice / calc.quantity : 0,
        totalPrice: calc.totalPrice,
        category: calc.category,
      }));

      const { data, error } = await supabase.functions.invoke('send-offer-email', {
        body: {
          clientEmail: emailToUse,
          clientName: clientName.trim(),
          offerNumber,
          products,
          subtotal,
          discount,
          discountAmount,
          total,
          validUntil,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Eroare la trimiterea email-ului');

      toast.success(`Oferta ${offerNumber} a fost trimisă pe email la ${emailToUse}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Eroare la trimiterea email-ului');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSaveOffer = async () => {
    if (calculations.length === 0) {
      toast.error('Adaugă produse în ofertă');
      return;
    }

    setIsSaving(true);
    
    try {
      // Generate offer number
      const timestamp = Date.now();
      const offerNumber = `OFR-${timestamp}`;
      
      // Build brief from calculations
      const briefItems = calculations.map(calc => 
        `${calc.recipeName} x${calc.quantity} = ${calc.totalPrice.toFixed(2)} €`
      ).join('\n');
      const brief = `Produse calculate:\n${briefItems}\n\nDiscount: ${discount}%`;

      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_number: offerNumber,
          document_type: 'oferta',
          name: `Ofertă ${clientName.trim() || 'Client'}`,
          client_id: selectedClientId || null,
          total_amount: total,
          quantity: calculations.reduce((sum, c) => sum + c.quantity, 0),
          brief: brief,
          status: 'pending',
          notes: `Subtotal: ${subtotal.toFixed(2)} €\nDiscount: ${discount}% (-${discountAmount.toFixed(2)} €)`,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Oferta ${offerNumber} a fost salvată cu succes!`);
      clearAll();
    } catch (error: any) {
      console.error('Error saving offer:', error);
      toast.error(error.message || 'Eroare la salvarea ofertei');
    } finally {
      setIsSaving(false);
    }
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
          {/* Left Column - Calculators, AI Analyzer, Recipe Selector & Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dedicated Calculators */}
            <Tabs defaultValue="flyer" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="flyer" className="text-xs">Flyer</TabsTrigger>
                {/* New calculators will be added here as tabs */}
              </TabsList>
              <TabsContent value="flyer" className="mt-4">
                <FlyerCalculator onAddToOffer={(item) => handleAddCalculatorItem(item, 'printed')} />
              </TabsContent>
            </Tabs>

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
                    <span>{categoryTotal.toFixed(2)} €</span>
                  </div>
                ))}
                {calculations.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Niciun produs adăugat
                  </p>
                )}
              </div>

              <Separator />

              {/* Client Selection */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Client
                </Label>
                <Select value={selectedClientId || 'custom'} onValueChange={handleClientSelect}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selectează client..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="custom">
                      <span className="text-muted-foreground">Introdu manual...</span>
                    </SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}{client.company && ` (${client.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              {!selectedClientId && (
                  <Input
                    type="text"
                    placeholder="Nume client personalizat..."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    maxLength={100}
                  />
                )}
              </div>

              {/* Client Email */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email client
                </Label>
                <Input
                  type="email"
                  placeholder="email@exemplu.ro"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} €</span>
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
                    Reducere: -{discountAmount.toFixed(2)} €
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-brand-green">{total.toFixed(2)} €</span>
              </div>

              <Button 
                className="w-full gradient-brand text-white gap-2" 
                size="lg"
                disabled={calculations.length === 0}
                onClick={handleGeneratePdf}
              >
                <FileText className="h-4 w-4" />
                Generează Ofertă PDF
              </Button>

              <Button 
                variant="outline"
                className="w-full gap-2" 
                size="lg"
                disabled={calculations.length === 0 || !clientEmail.trim() || isSendingEmail}
                onClick={handleSendEmail}
              >
                {isSendingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Trimite pe Email
              </Button>

              <Button 
                variant="secondary"
                className="w-full gap-2" 
                size="lg"
                disabled={calculations.length === 0 || isSaving}
                onClick={handleSaveOffer}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvează Oferta în DB
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
