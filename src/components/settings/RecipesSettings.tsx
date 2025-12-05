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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rețete de Calcul</h2>
          <p className="text-sm text-muted-foreground">Definește rețete pentru calculul automat al costurilor</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }} disabled={isAdding}>
          <Plus className="mr-1 h-4 w-4" /> Adaugă
        </Button>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          {/* Add/Edit Form */}
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
                <Label>Cuvinte cheie pentru brief</Label>
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
                  <Label>Preț de bază (€)</Label>
                  <Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm(p => ({ ...p, base_price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Preț per bucată (€)</Label>
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

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Rețetă</TableHead>
                  <TableHead>Cuvinte Cheie</TableHead>
                  <TableHead className="text-right w-28">Preț Bază</TableHead>
                  <TableHead className="text-right w-28">Preț/Buc</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((r) => (
                  <Collapsible key={r.id} asChild open={expandedId === r.id && editingId !== r.id}>
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                        <TableCell className="font-medium">
                          <div>
                            {r.name}
                            {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.brief_keywords?.slice(0, 2).map(kw => (
                              <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                            ))}
                            {(r.brief_keywords?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">+{r.brief_keywords!.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{r.base_price.toFixed(2)} €</TableCell>
                        <TableCell className="text-right font-mono">{r.price_per_unit.toFixed(2)} €</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            {expandedId === r.id ? <ChevronUp className="h-4 w-4 mt-2" /> : <ChevronDown className="h-4 w-4 mt-2" />}
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={5} className="py-3">
                            <div className="text-sm space-y-1 px-2">
                              <p><strong>Cuvinte cheie:</strong> {r.brief_keywords?.join(', ') || 'Niciuna'}</p>
                              <p><strong>Formulă:</strong> <code className="bg-muted px-1 rounded">{r.formula || 'base_price + (quantity × price_per_unit)'}</code></p>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
                {recipes.length === 0 && !isAdding && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nu există rețete definite</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
