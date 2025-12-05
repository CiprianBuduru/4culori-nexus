import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Check, X, Loader2, Package } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  category: string | null;
  description: string | null;
}

export function MaterialsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'buc', unit_price: 0, category: '', description: '' });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').order('name');
      if (error) throw error;
      return data as Material[];
    },
  });

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
    if (!form.name) return toast({ title: 'Completează numele', variant: 'destructive' });
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      addMutation.mutate(form);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-brand-blue" />
          <div>
            <h2 className="text-lg font-semibold">Materiale Prime</h2>
            <p className="text-sm text-muted-foreground">Gestionează costurile materialelor</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: '', unit: 'buc', unit_price: 0, category: '', description: '' }); }} disabled={isAdding}>
          <Plus className="mr-1 h-4 w-4" /> Adaugă
        </Button>
      </div>
      <Separator className="my-4" />

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          {(isAdding || editingId) && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Nume *</Label>
                  <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ex: Hârtie A4" />
                </div>
                <div>
                  <Label>Unitate</Label>
                  <Input value={form.unit} onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="buc, m², kg" />
                </div>
                <div>
                  <Label>Preț/Unitate (€)</Label>
                  <Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Categorie</Label>
                  <Input value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="ex: Hârtie" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingId(null); }}><X className="h-4 w-4 mr-1" />Anulează</Button>
                <Button size="sm" onClick={handleSave}><Check className="h-4 w-4 mr-1" />{editingId ? 'Salvează' : 'Adaugă'}</Button>
              </div>
            </div>
          )}

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
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.category || '-'}</TableCell>
                  <TableCell className="text-right">{m.unit_price.toFixed(2)} €</TableCell>
                  <TableCell className="text-right">{m.unit}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {materials.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nu există materiale definite</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
