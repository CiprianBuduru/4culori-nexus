// Price Calculator v6.0 – Comparative Quote Mode + AI Sales Assistant
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, RotateCcw, FileText, Users, Mail, Loader2, Save, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { RecipeSelector } from '@/components/calculator/RecipeSelector';
import { RecipeCalculatorItem } from '@/components/calculator/RecipeCalculatorItem';
import { BriefAnalyzer } from '@/components/calculator/BriefAnalyzer';
import { PrintCalculator } from '@/components/calculator/PrintCalculator';
import { EmailDraftPanel } from '@/components/calculator/EmailDraftPanel';
import { ComparativeQuoteCards } from '@/components/calculator/ComparativeQuoteCards';
import { Recipe, RecipeCalculation, categoryLabels, RecipeCategory, defaultRecipes, type PrintConfigSnapshot } from '@/types/recipes';
import { type PrintCalculatorPrefill, type BriefExtraction } from '@/types/briefAnalysis';
import { type ComparativeVariant, type ComparativeQuoteState } from '@/types/comparativeQuote';
import { generateComparativeVariants } from '@/lib/comparativeQuote';
import { toast } from 'sonner';
import { generateOfferPdf } from '@/lib/generateOfferPdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const { accessLevel } = useAuth();
  const isAdmin = accessLevel >= 3; // administrator or director can see internal costs

  const [calculations, setCalculations] = useState<RecipeCalculation[]>([]);
  const [discount, setDiscount] = useState(0);
  const [clientName, setClientName] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientEmail, setClientEmail] = useState('');
  const [showInternalCosts, setShowInternalCosts] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [calculatorPrefill, setCalculatorPrefill] = useState<PrintCalculatorPrefill | null>(null);

  // AI Sales Assistant auto-flow state
  const [autoAddToOffer, setAutoAddToOffer] = useState(false);
  const [autoOpenEmail, setAutoOpenEmail] = useState(false);

  // Brief confirmation dialog state
  const [pendingPrefill, setPendingPrefill] = useState<PrintCalculatorPrefill | null>(null);
  const [pendingFullQuote, setPendingFullQuote] = useState(false);
  const [showBriefConfirmDialog, setShowBriefConfirmDialog] = useState(false);

  // Duplicate confirmation dialog
  const [pendingDuplicateItem, setPendingDuplicateItem] = useState<any>(null);
  const [duplicateMatchId, setDuplicateMatchId] = useState<string | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // Comparative quote state
  const [comparativeState, setComparativeState] = useState<ComparativeQuoteState | null>(null);

  // Paper prices for comparative engine (shared with PrintCalculator)
  const [paperPrices, setPaperPrices] = useState<Record<number, number>>({});

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

  // Fetch paper prices for comparative engine
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
    };
    fetchPaperPrices();
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
      category: 'printed' as RecipeCategory,
      quantity: suggestion.quantity,
      materialCost: 0,
      personalizationCost: 0,
      totalPrice: totalPrice,
    };
    setCalculations([...calculations, newCalculation]);
    toast.success(`Adăugat: ${suggestion.recipeName} x${suggestion.quantity}`);
  };

  /** Check for duplicate config and handle accordingly */
  const findDuplicate = (configSnapshot?: PrintConfigSnapshot): RecipeCalculation | undefined => {
    if (!configSnapshot) return undefined;
    return calculations.find(c => {
      if (!c.configSnapshot) return false;
      return c.configSnapshot.productType === configSnapshot.productType &&
             c.configSnapshot.format === configSnapshot.format &&
             c.configSnapshot.gsm === configSnapshot.gsm &&
             c.configSnapshot.colorMode === configSnapshot.colorMode &&
             c.configSnapshot.lamination === configSnapshot.lamination;
    });
  };

  const handleAddCalculatorItem = (item: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details: string;
    productionCost?: number;
    markupMultiplier?: number;
    configSnapshot?: PrintConfigSnapshot;
  }, category: RecipeCategory = 'personalized') => {
    // Check for duplicates
    const duplicate = findDuplicate(item.configSnapshot);
    if (duplicate) {
      setPendingDuplicateItem({ item, category });
      setDuplicateMatchId(duplicate.id);
      setShowDuplicateDialog(true);
      return;
    }

    addItemToCalculations(item, category);
  };

  const addItemToCalculations = (item: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details: string;
    productionCost?: number;
    markupMultiplier?: number;
    configSnapshot?: PrintConfigSnapshot;
  }, category: RecipeCategory) => {
    const newCalculation: RecipeCalculation = {
      id: crypto.randomUUID(),
      recipeId: `custom-${Date.now()}`,
      recipeName: item.name,
      category,
      quantity: item.quantity,
      materialCost: 0,
      personalizationCost: 0,
      totalPrice: item.totalPrice,
      productionCost: item.productionCost,
      markupMultiplier: item.markupMultiplier,
      configSnapshot: item.configSnapshot,
    };
    setCalculations(prev => [...prev, newCalculation]);
    toast.success(`Adăugat în ofertă: ${item.name} (${item.details})`);
  };

  const handleMergeDuplicate = () => {
    if (!pendingDuplicateItem || !duplicateMatchId) return;
    const { item } = pendingDuplicateItem;

    setCalculations(prev => prev.map(c => {
      if (c.id !== duplicateMatchId) return c;
      const newQty = c.quantity + item.quantity;
      const newUnitPrice = item.unitPrice; // use latest unit price
      return {
        ...c,
        quantity: newQty,
        totalPrice: newQty * newUnitPrice,
        productionCost: c.productionCost && item.productionCost
          ? (c.productionCost / c.quantity) * newQty
          : undefined,
      };
    }));
    toast.success('Cantitate actualizată pe produsul existent');
    setShowDuplicateDialog(false);
    setPendingDuplicateItem(null);
    setDuplicateMatchId(null);
  };

  const handleAddDuplicateAnyway = () => {
    if (!pendingDuplicateItem) return;
    addItemToCalculations(pendingDuplicateItem.item, pendingDuplicateItem.category);
    setShowDuplicateDialog(false);
    setPendingDuplicateItem(null);
    setDuplicateMatchId(null);
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
  const totalProductionCost = calculations.reduce((sum, c) => sum + (c.productionCost || 0), 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  // Build products list for email draft (client-facing only)
  const offerProducts = calculations.map(calc => ({
    name: calc.recipeName,
    quantity: calc.quantity,
    unitPrice: calc.quantity > 0 ? calc.totalPrice / calc.quantity : 0,
    totalPrice: calc.totalPrice,
    details: calc.category,
    configSnapshot: calc.configSnapshot,
  }));

  const clearAll = () => {
    setCalculations([]);
    setDiscount(0);
    setClientName('');
    setSelectedClientId('');
    setClientEmail('');
    setAutoAddToOffer(false);
    setAutoOpenEmail(false);
  };

  const getRecipeById = (recipeId: string) => {
    return defaultRecipes.find(r => r.id === recipeId);
  };

  const handleGeneratePdf = async () => {
    try {
      const offerNumber = await generateOfferPdf({
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

  const handleSendEmail = async (draftBody: string, draftSubject: string) => {
    const emailToUse = clientEmail.trim();
    if (!emailToUse) {
      throw new Error('Selectează un client cu email sau introdu adresa de email');
    }
    if (calculations.length === 0) {
      throw new Error('Adaugă produse în ofertă');
    }

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
        subject: draftSubject,
        bodyText: draftBody,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Eroare la trimiterea email-ului');
  };

  const handleSaveOffer = async () => {
    if (calculations.length === 0) {
      toast.error('Adaugă produse în ofertă');
      return;
    }

    setIsSaving(true);
    
    try {
      const timestamp = Date.now();
      const offerNumber = `OFR-${timestamp}`;
      
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

  // ── Brief confirmation flow ──
  const handlePrefillWithConfirmation = (prefill: PrintCalculatorPrefill) => {
    if (calculations.length > 0) {
      setPendingPrefill(prefill);
      setPendingFullQuote(false);
      setShowBriefConfirmDialog(true);
    } else {
      setCalculatorPrefill(prefill);
    }
  };

  const handleFullQuoteWithConfirmation = (prefill: PrintCalculatorPrefill) => {
    if (calculations.length > 0) {
      setPendingPrefill(prefill);
      setPendingFullQuote(true);
      setShowBriefConfirmDialog(true);
    } else {
      handleGenerateFullQuote(prefill);
    }
  };

  const handleBriefConfirmReplace = () => {
    if (!pendingPrefill) return;
    setCalculations([]);
    setAutoOpenEmail(false);
    if (pendingFullQuote) {
      handleGenerateFullQuote(pendingPrefill);
    } else {
      setCalculatorPrefill(pendingPrefill);
    }
    setShowBriefConfirmDialog(false);
    setPendingPrefill(null);
  };

  const handleBriefConfirmAdd = () => {
    if (!pendingPrefill) return;
    if (pendingFullQuote) {
      handleGenerateFullQuote(pendingPrefill);
    } else {
      setCalculatorPrefill(pendingPrefill);
    }
    setShowBriefConfirmDialog(false);
    setPendingPrefill(null);
  };

  /** AI Sales Assistant: full auto-quote flow */
  const handleGenerateFullQuote = (prefill: PrintCalculatorPrefill) => {
    setCalculatorPrefill(prefill);
    setAutoAddToOffer(true);
  };

  /** Called when PrintCalculator auto-adds item to offer */
  const handleAutoAddComplete = () => {
    setAutoAddToOffer(false);
    setTimeout(() => {
      setAutoOpenEmail(true);
    }, 300);
  };

  const handleAutoOpenEmailComplete = () => {
    setAutoOpenEmail(false);
  };

  // ── Comparative quote flow ──
  const handleGenerateComparativeQuote = (extraction: BriefExtraction) => {
    const result = generateComparativeVariants(extraction, paperPrices);
    if (!result) {
      toast.error('Produsul nu suportă ofertă comparativă');
      return;
    }
    setComparativeState(result);
    toast.success('3 variante comerciale generate');
  };

  const handleSelectVariant = (variant: ComparativeVariant) => {
    const newCalc: RecipeCalculation = {
      id: crypto.randomUUID(),
      recipeId: `comparative-${variant.tier}-${Date.now()}`,
      recipeName: variant.productName,
      category: 'printed' as RecipeCategory,
      quantity: variant.quantity,
      materialCost: 0,
      personalizationCost: 0,
      totalPrice: variant.totalPrice,
      productionCost: variant.internalCost,
      markupMultiplier: 1.40,
      configSnapshot: variant.configSnapshot,
    };
    setCalculations(prev => [...prev, newCalc]);
    setComparativeState(null);
    toast.success(`${variant.label} adăugată în ofertă`);
  };

  const handleAddAllVariants = () => {
    if (!comparativeState) return;
    const newCalcs: RecipeCalculation[] = comparativeState.variants.map((variant) => ({
      id: crypto.randomUUID(),
      recipeId: `comparative-${variant.tier}-${Date.now()}`,
      recipeName: `${variant.productName} — ${variant.label}`,
      category: 'printed' as RecipeCategory,
      quantity: variant.quantity,
      materialCost: 0,
      personalizationCost: 0,
      totalPrice: variant.totalPrice,
      productionCost: variant.internalCost,
      markupMultiplier: 1.40,
      configSnapshot: variant.configSnapshot,
      comparativeVariantTier: variant.tier,
    } as RecipeCalculation));
    setCalculations(prev => [...prev, ...newCalcs]);
    setComparativeState(null);
    toast.success('Ofertă comparativă completă adăugată (3 variante)');
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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant={showInternalCosts ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowInternalCosts(!showInternalCosts)}
                className="gap-2"
              >
                {showInternalCosts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showInternalCosts ? 'Ascunde costuri interne' : 'Costuri interne'}
              </Button>
            )}
            <Button variant="outline" onClick={clearAll} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Resetează
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - AI Sales Flow: Brief → Calculator → Products */}
          <div className="lg:col-span-2 space-y-4">
            {/* Step 1: AI Sales Assistant */}
            <BriefAnalyzer
              onApplyToCalculator={handlePrefillWithConfirmation}
              onGenerateFullQuote={handleFullQuoteWithConfirmation}
            />

            {/* Step 2: Universal Print Calculator */}
            <PrintCalculator
              onAddToOffer={(item) => handleAddCalculatorItem(item, 'printed')}
              prefill={calculatorPrefill}
              onPrefillApplied={() => setCalculatorPrefill(null)}
              autoAdd={autoAddToOffer}
              onAutoAddComplete={handleAutoAddComplete}
            />

            {/* Manual Recipe Selector */}
            <RecipeSelector onSelectRecipe={handleSelectRecipe} />

            {/* Added Items with config snapshots */}
            {calculations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Produse adăugate ({calculations.length})</h3>
                {calculations.map((calc) => {
                  // Print calculator items (with config snapshot)
                  if (calc.configSnapshot) {
                    const snap = calc.configSnapshot;
                    return (
                      <Card key={calc.id} className="border bg-card">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{calc.recipeName}</h4>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <Badge variant="outline" className="text-xs">Format: {snap.formatLabel}</Badge>
                                <Badge variant="outline" className="text-xs">Hârtie: {snap.gsm} g/mp</Badge>
                                <Badge variant="outline" className="text-xs">Tipar: {snap.colorModeLabel}</Badge>
                                <Badge variant="outline" className="text-xs">{snap.laminationLabel}</Badge>
                                <Badge variant="secondary" className="text-xs">Tiraj: {calc.quantity} buc</Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCalculation(calc.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Price display */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <div className="flex gap-4 text-sm">
                              {isAdmin && showInternalCosts && calc.productionCost != null && (
                                <>
                                  <span className="text-muted-foreground">
                                    Cost intern: <span className="font-medium text-amber-600">{calc.productionCost.toFixed(2)} €</span>
                                  </span>
                                  <span className="text-muted-foreground">
                                    Markup: ×{calc.markupMultiplier?.toFixed(2)}
                                  </span>
                                </>
                              )}
                              <span className="text-muted-foreground">
                                Preț/buc: {(calc.totalPrice / calc.quantity).toFixed(4)} €
                              </span>
                            </div>
                            <span className="font-bold text-lg text-primary">
                              {calc.totalPrice.toFixed(2)} €
                            </span>
                          </div>

                          {/* Admin margin info */}
                          {isAdmin && showInternalCosts && calc.productionCost != null && calc.productionCost > 0 && (
                            <div className="bg-amber-500/10 rounded-md px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400 flex justify-between">
                              <span>Marjă: {((calc.totalPrice - calc.productionCost) / calc.totalPrice * 100).toFixed(1)}%</span>
                              <span>Profit: {(calc.totalPrice - calc.productionCost).toFixed(2)} €</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }

                  // Legacy recipe items
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

          {/* Right Column - Summary + Email Draft */}
          <div className="space-y-4">
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

                {/* Admin: internal cost summary */}
                {isAdmin && showInternalCosts && totalProductionCost > 0 && (
                  <>
                    <div className="bg-amber-500/10 rounded-lg p-3 space-y-1.5">
                      <div className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        Costuri interne (Admin)
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cost producție total</span>
                        <span className="font-medium text-amber-600">{totalProductionCost.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Preț vânzare</span>
                        <span className="font-medium">{subtotal.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground">Marjă globală</span>
                        <span className="text-green-600">
                          {((subtotal - totalProductionCost) / subtotal * 100).toFixed(1)}%
                          ({(subtotal - totalProductionCost).toFixed(2)} €)
                        </span>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

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

                {/* Email Draft Drawer (trigger button + Sheet) */}
                <EmailDraftPanel
                  clientName={clientName}
                  clientEmail={clientEmail}
                  products={offerProducts}
                  subtotal={subtotal}
                  discount={discount}
                  discountAmount={discountAmount}
                  total={total}
                  disabled={calculations.length === 0}
                  onSendEmail={handleSendEmail}
                  autoOpenAndGenerate={autoOpenEmail}
                  onAutoOpenComplete={handleAutoOpenEmailComplete}
                />

                {calculations.length > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    {calculations.length} produs(e) • {calculations.reduce((sum, c) => sum + c.quantity, 0)} bucăți total
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Brief confirmation dialog */}
      <AlertDialog open={showBriefConfirmDialog} onOpenChange={setShowBriefConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ofertă existentă
            </AlertDialogTitle>
            <AlertDialogDescription>
              Oferta curentă conține {calculations.length} produs(e). Ce doriți să faceți cu noul brief?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => { setShowBriefConfirmDialog(false); setPendingPrefill(null); }}>
              Anulează
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleBriefConfirmAdd}
            >
              Adaugă la oferta curentă
            </Button>
            <AlertDialogAction onClick={handleBriefConfirmReplace}>
              Înlocuiește oferta curentă
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate product dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produs duplicat detectat</AlertDialogTitle>
            <AlertDialogDescription>
              Un produs cu aceeași configurație există deja în ofertă. Doriți să combinați cantitățile sau să adăugați separat?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => { setShowDuplicateDialog(false); setPendingDuplicateItem(null); }}>
              Anulează
            </AlertDialogCancel>
            <Button variant="outline" onClick={handleAddDuplicateAnyway}>
              Adaugă separat
            </Button>
            <AlertDialogAction onClick={handleMergeDuplicate}>
              Combină cantitățile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
