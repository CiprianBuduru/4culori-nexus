import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Check, X, Loader2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  brief_keywords: string[] | null;
  materials: any[];
  services: any[];
  base_price: number;
  price_per_unit: number;
  formula: string | null;
}

export function RecipesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    brief_keywords: [] as string[],
    base_price: 0,
    price_per_unit: 0,
    formula: '',
  });

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recipes').select('*').order('name');
      if (error) throw error;
      return data as Recipe[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (item: Partial<Recipe>) => {
      const { error } = await supabase.from('recipes').insert({
        name: item.name!,
        description: item.description || null,
        brief_keywords: item.brief_keywords || [],
        base_price: item.base_price || 0,
        price_per_unit: item.price_per_unit || 0,
        formula: item.formula || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setIsAdding(false);
      resetForm();
      toast({ title: 'Rețetă adăugată' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: { id: string } & Partial<Recipe>) => {
      const { error } = await supabase.from('recipes').update(item).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setEditingId(null);
      toast({ title: 'Rețetă actualizată' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({ title: 'Rețetă ștearsă' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const resetForm = () => {
    setForm({ name: '', description: '', brief_keywords: [], base_price: 0, price_per_unit: 0, formula: '' });
    setKeywordInput('');
  };

  const startEdit = (r: Recipe) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      description: r.description || '',
      brief_keywords: r.brief_keywords || [],
      base_price: r.base_price,
      price_per_unit: r.price_per_unit,
      formula: r.formula || '',
    });
    setExpandedId(r.id);
  };

  const handleSave = () => {
    if (!form.name) return toast({ title: 'Completează numele', variant: 'destructive' });
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      addMutation.mutate(form);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !form.brief_keywords.includes(keywordInput.trim())) {
      setForm(p => ({ ...p, brief_keywords: [...p.brief_keywords, keywordInput.trim()] }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setForm(p => ({ ...p, brief_keywords: p.brief_keywords.filter(k => k !== kw) }));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-brand-teal" />
          <div>
            <h2 className="text-lg font-semibold">Rețete de Calcul</h2>
            <p className="text-sm text-muted-foreground">Definește rețete pentru calculul automat al costurilor</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }} disabled={isAdding}>
          <Plus className="mr-1 h-4 w-4" /> Adaugă
        </Button>
      </div>
      <Separator className="my-4" />

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {(isAdding || editingId) && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nume Rețetă *</Label>
                  <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ex: Cărți de vizită standard" />
                </div>
                <div>
                  <Label>Descriere</Label>
                  <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descriere scurtă" />
                </div>
              </div>

              <div>
                <Label>Cuvinte cheie pentru brief (AI le va folosi pentru a sugera rețeta)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="ex: carte vizită, business card..."
                  />
                  <Button type="button" variant="outline" onClick={addKeyword}>Adaugă</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.brief_keywords.map(kw => (
                    <Badge key={kw} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(kw)}>
                      {kw} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preț de bază (RON)</Label>
                  <Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm(p => ({ ...p, base_price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Preț per bucată (RON)</Label>
                  <Input type="number" step="0.01" value={form.price_per_unit} onChange={(e) => setForm(p => ({ ...p, price_per_unit: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>

              <div>
                <Label>Formulă de calcul (opțional)</Label>
                <Textarea
                  value={form.formula}
                  onChange={(e) => setForm(p => ({ ...p, formula: e.target.value }))}
                  placeholder="ex: base_price + (quantity * price_per_unit)"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">Variabile: base_price, price_per_unit, quantity</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }}>
                  <X className="h-4 w-4 mr-1" />Anulează
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-4 w-4 mr-1" />{editingId ? 'Salvează' : 'Adaugă'}
                </Button>
              </div>
            </div>
          )}

          {recipes.map((r) => (
            <Collapsible key={r.id} open={expandedId === r.id && editingId !== r.id} onOpenChange={() => setExpandedId(expandedId === r.id ? null : r.id)}>
              <div className="rounded-lg border">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="font-medium">{r.name}</p>
                      {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                      <div className="flex gap-1 mt-1">
                        {r.brief_keywords?.slice(0, 3).map(kw => (
                          <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                        ))}
                        {(r.brief_keywords?.length || 0) > 3 && <Badge variant="outline" className="text-xs">+{r.brief_keywords!.length - 3}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.base_price.toFixed(2)} + {r.price_per_unit.toFixed(2)}/buc</span>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); startEdit(r); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      {expandedId === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-2">
                    <Separator />
                    <div className="text-sm">
                      <p><strong>Cuvinte cheie:</strong> {r.brief_keywords?.join(', ') || 'Niciuna'}</p>
                      <p><strong>Formulă:</strong> {r.formula || 'base_price + (quantity × price_per_unit)'}</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}

          {recipes.length === 0 && !isAdding && (
            <div className="text-center text-muted-foreground py-8">Nu există rețete definite</div>
          )}
        </div>
      )}
    </div>
  );
}
