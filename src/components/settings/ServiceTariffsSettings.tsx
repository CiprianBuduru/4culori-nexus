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
import { Plus, Pencil, Trash2, Check, X, Loader2, Clock } from 'lucide-react';

interface ServiceTariff {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  department_id: string | null;
  description: string | null;
}

export function ServiceTariffsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'ora', unit_price: 0, department_id: '', description: '' });

  const { data: tariffs = [], isLoading } = useQuery({
    queryKey: ['service_tariffs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('service_tariffs').select('*').order('name');
      if (error) throw error;
      return data as ServiceTariff[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (item: Omit<ServiceTariff, 'id'>) => {
      const { error } = await supabase.from('service_tariffs').insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_tariffs'] });
      setIsAdding(false);
      setForm({ name: '', unit: 'ora', unit_price: 0, department_id: '', description: '' });
      toast({ title: 'Tarif adăugat' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: ServiceTariff) => {
      const { error } = await supabase.from('service_tariffs').update(item).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_tariffs'] });
      setEditingId(null);
      toast({ title: 'Tarif actualizat' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_tariffs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_tariffs'] });
      toast({ title: 'Tarif șters' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const startEdit = (t: ServiceTariff) => {
    setEditingId(t.id);
    setForm({ name: t.name, unit: t.unit, unit_price: t.unit_price, department_id: t.department_id || '', description: t.description || '' });
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
          <Clock className="h-5 w-5 text-brand-orange" />
          <div>
            <h2 className="text-lg font-semibold">Tarife Servicii</h2>
            <p className="text-sm text-muted-foreground">Costurile pentru servicii și manoperă</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: '', unit: 'ora', unit_price: 0, department_id: '', description: '' }); }} disabled={isAdding}>
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Nume Serviciu *</Label>
                  <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ex: Tipar Digital" />
                </div>
                <div>
                  <Label>Unitate</Label>
                  <Input value={form.unit} onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="ora, buc, m²" />
                </div>
                <div>
                  <Label>Preț/Unitate (RON)</Label>
                  <Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
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
                <TableHead>Serviciu</TableHead>
                <TableHead className="text-right">Preț/Unitate</TableHead>
                <TableHead className="text-right">Unitate</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffs.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-right">{t.unit_price.toFixed(2)} RON</TableCell>
                  <TableCell className="text-right">{t.unit}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {tariffs.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nu există tarife definite</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
