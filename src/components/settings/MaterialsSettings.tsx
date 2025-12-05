import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Pencil, Trash2, Check, X, Loader2, Package, Search, Filter } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  category: string | null;
  description: string | null;
}

const UNIT_OPTIONS = [
  { value: 'buc', label: 'Bucată (buc)' },
  { value: 'm²', label: 'Metru pătrat (m²)' },
  { value: 'ml', label: 'Metru liniar (ml)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'l', label: 'Litru (l)' },
  { value: 'ml_volume', label: 'Mililitru (ml)' },
  { value: 'coală', label: 'Coală' },
  { value: 'rolă', label: 'Rolă' },
  { value: 'set', label: 'Set' },
  { value: 'oră', label: 'Oră' },
];

const CATEGORY_OPTIONS = [
  'Hârtie',
  'Carton',
  'Vinyl',
  'Mesh',
  'Canvas',
  'Folie',
  'Cerneală',
  'Toner',
  'Film',
  'Material textil',
  'Material personalizare',
  'Laminare',
  'Finisare',
  'Ambalaj',
  'Consumabile',
  'Altele',
];

export function MaterialsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'categories'>('categories');
  const [form, setForm] = useState({ name: '', unit: 'buc', unit_price: 0, category: '', description: '' });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').order('category').order('name');
      if (error) throw error;
      return data as Material[];
    },
  });

  // Get unique categories from materials
  const categories = useMemo(() => {
    const cats = [...new Set(materials.map(m => m.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [materials]);

  // Filter materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = !searchTerm || 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.category && m.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchTerm, filterCategory]);

  // Group materials by category
  const groupedMaterials = useMemo(() => {
    const grouped: Record<string, Material[]> = {};
    filteredMaterials.forEach(m => {
      const cat = m.category || 'Fără categorie';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(m);
    });
    return grouped;
  }, [filteredMaterials]);

  const addMutation = useMutation({
    mutationFn: async (item: Omit<Material, 'id'>) => {
      const { error } = await supabase.from('materials').insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setIsAdding(false);
      setForm({ name: '', unit: 'buc', unit_price: 0, category: '', description: '' });
      toast({ title: 'Material adăugat' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: Material) => {
      const { error } = await supabase.from('materials').update(item).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setEditingId(null);
      toast({ title: 'Material actualizat' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({ title: 'Material șters' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setForm({ name: m.name, unit: m.unit, unit_price: m.unit_price, category: m.category || '', description: m.description || '' });
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast({ title: 'Completează numele', variant: 'destructive' });
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      addMutation.mutate(form);
    }
  };

  const countMaterialsWithPrice = useMemo(() => {
    return materials.filter(m => m.unit_price > 0).length;
  }, [materials]);

  const MaterialRow = ({ m, showCategory = false }: { m: Material; showCategory?: boolean }) => (
    <TableRow key={m.id} className={m.unit_price === 0 ? 'bg-destructive/5' : ''}>
      <TableCell className="font-medium">
        {m.name}
        {m.unit_price === 0 && <Badge variant="destructive" className="ml-2 text-xs">Fără preț</Badge>}
      </TableCell>
      {showCategory && <TableCell className="text-muted-foreground">{m.category || '-'}</TableCell>}
      <TableCell className="text-right font-mono">
        {editingId === m.id ? (
          <Input
            type="number"
            step="0.001"
            min="0"
            className="w-24 text-right"
            value={form.unit_price}
            onChange={(e) => setForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
            autoFocus
          />
        ) : (
          <span className={m.unit_price === 0 ? 'text-destructive' : ''}>
            {m.unit_price.toFixed(3)} €
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">{m.unit}</TableCell>
      <TableCell className="text-right">
        {editingId === m.id ? (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={handleSave}><Check className="h-4 w-4 text-green-500" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => startEdit(m)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-brand-blue" />
          <div>
            <h2 className="text-lg font-semibold">Materiale Prime</h2>
            <p className="text-sm text-muted-foreground">
              {countMaterialsWithPrice}/{materials.length} materiale cu preț completat
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: '', unit: 'buc', unit_price: 0, category: '', description: '' }); }} 
          disabled={isAdding}
        >
          <Plus className="mr-1 h-4 w-4" /> Adaugă Material
        </Button>
      </div>

      <Separator className="my-4" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate categoriile</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-md p-1">
          <Button 
            variant={viewMode === 'categories' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('categories')}
          >
            Categorii
          </Button>
          <Button 
            variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Tabel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          {/* Add/Edit Form */}
          {isAdding && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label>Nume *</Label>
                  <Input 
                    value={form.name} 
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} 
                    placeholder="ex: Hârtie cașerată 300g" 
                  />
                </div>
                <div>
                  <Label>Categorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preț/Unitate (€)</Label>
                  <Input 
                    type="number" 
                    step="0.001" 
                    min="0"
                    value={form.unit_price} 
                    onChange={(e) => setForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} 
                  />
                </div>
                <div>
                  <Label>Unitate</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm(p => ({ ...p, unit: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                  <X className="h-4 w-4 mr-1" />Anulează
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-4 w-4 mr-1" />Adaugă
                </Button>
              </div>
            </div>
          )}

          {/* Category View */}
          {viewMode === 'categories' && (
            <Accordion type="multiple" defaultValue={Object.keys(groupedMaterials)} className="space-y-2">
              {Object.entries(groupedMaterials).map(([category, mats]) => {
                const withPrice = mats.filter(m => m.unit_price > 0).length;
                return (
                  <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{category}</span>
                        <Badge variant={withPrice === mats.length ? 'secondary' : 'destructive'} className="text-xs">
                          {withPrice}/{mats.length} completate
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nume</TableHead>
                            <TableHead className="text-right w-32">Preț/Unitate</TableHead>
                            <TableHead className="text-right w-20">Unitate</TableHead>
                            <TableHead className="w-24"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mats.map((m) => <MaterialRow key={m.id} m={m} />)}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead className="text-right">Preț/Unitate</TableHead>
                  <TableHead className="text-right">Unitate</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((m) => <MaterialRow key={m.id} m={m} showCategory />)}
                {filteredMaterials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {searchTerm || filterCategory !== 'all' ? 'Nu s-au găsit materiale' : 'Nu există materiale definite'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
