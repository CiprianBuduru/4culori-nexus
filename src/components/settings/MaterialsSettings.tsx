import { useState, useMemo, useRef } from 'react';
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
import { Plus, Pencil, Trash2, Check, X, Loader2, Search, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [form, setForm] = useState({ name: '', unit: 'buc', unit_price: 0, category: '', description: '' });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').order('category').order('name');
      if (error) throw error;
      return data as Material[];
    },
  });

  const categories = useMemo(() => {
    const cats = [...new Set(materials.map(m => m.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = !searchTerm || 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.category && m.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchTerm, filterCategory]);

  const countMaterialsWithPrice = useMemo(() => {
    return materials.filter(m => m.unit_price > 0).length;
  }, [materials]);

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

  const handleExport = () => {
    const exportData = materials.map(m => ({
      'ID': m.id,
      'Nume': m.name,
      'Categorie': m.category || '',
      'Preț/Unitate (€)': m.unit_price,
      'Unitate': m.unit,
      'Descriere': m.description || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materiale');
    ws['!cols'] = [{ wch: 36 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 30 }];
    XLSX.writeFile(wb, `materiale_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Export realizat cu succes!' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

      let updated = 0, added = 0, errors = 0;

      for (const row of jsonData) {
        const name = row['Nume'] || row['name'] || '';
        if (!name) continue;

        const materialData = {
          name: String(name).trim(),
          category: row['Categorie'] || row['category'] || null,
          unit_price: parseFloat(row['Preț/Unitate (€)'] || row['unit_price'] || row['pret'] || 0) || 0,
          unit: row['Unitate'] || row['unit'] || 'buc',
          description: row['Descriere'] || row['description'] || null,
        };

        const existingId = row['ID'] || row['id'];
        const existing = existingId 
          ? materials.find(m => m.id === existingId)
          : materials.find(m => m.name.toLowerCase() === materialData.name.toLowerCase());

        try {
          if (existing) {
            await supabase.from('materials').update(materialData).eq('id', existing.id);
            updated++;
          } else {
            await supabase.from('materials').insert(materialData);
            added++;
          }
        } catch {
          errors++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({ 
        title: 'Import finalizat!',
        description: `${added} adăugate, ${updated} actualizate${errors > 0 ? `, ${errors} erori` : ''}`
      });
    } catch {
      toast({ title: 'Eroare la import', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Materiale Prime</h2>
          <p className="text-sm text-muted-foreground">
            {countMaterialsWithPrice}/{materials.length} materiale cu preț completat
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={materials.length === 0}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: '', unit: 'buc', unit_price: 0, category: '', description: '' }); }} disabled={isAdding}>
            <Plus className="mr-1 h-4 w-4" /> Adaugă
          </Button>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate categoriile</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          {/* Add/Edit Form */}
          {isAdding && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
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

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nume</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead className="text-right w-32">Preț/Unitate</TableHead>
                  <TableHead className="text-right w-20">Unitate</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((m) => (
                  <TableRow key={m.id} className={m.unit_price === 0 ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">
                      {editingId === m.id ? (
                        <Input
                          value={form.name}
                          onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                          className="h-8"
                        />
                      ) : (
                        <>
                          {m.name}
                          {m.unit_price === 0 && <Badge variant="destructive" className="ml-2 text-xs">Fără preț</Badge>}
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {editingId === m.id ? (
                        <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        m.category || '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {editingId === m.id ? (
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          className="w-24 text-right h-8"
                          value={form.unit_price}
                          onChange={(e) => setForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
                        />
                      ) : (
                        <span className={m.unit_price === 0 ? 'text-destructive' : ''}>
                          {m.unit_price.toFixed(3)} €
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === m.id ? (
                        <Select value={form.unit} onValueChange={(v) => setForm(p => ({ ...p, unit: v }))}>
                          <SelectTrigger className="h-8 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map(u => (
                              <SelectItem key={u.value} value={u.value}>{u.value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        m.unit
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === m.id ? (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}><Check className="h-4 w-4 text-green-500" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(m)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteMutation.mutate(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMaterials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {searchTerm || filterCategory !== 'all' ? 'Nu s-au găsit materiale' : 'Nu există materiale definite'}
                    </TableCell>
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
