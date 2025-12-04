import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Pencil, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CompanySettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  emailNotifications: boolean;
  weeklyReports: boolean;
}

interface OrderTypeDefault {
  id: string;
  order_type: string;
  order_type_label: string;
  default_production_days: number;
}

const defaultSettings: CompanySettings = {
  companyName: '4culori SRL',
  companyEmail: 'contact@4culori.ro',
  companyPhone: '+40 21 123 4567',
  companyAddress: 'Str. Culorilor nr. 4, București',
  emailNotifications: false,
  weeklyReports: false,
};

const STORAGE_KEY = '4culori-settings';

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canManageSettings, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ order_type: '', order_type_label: '', default_production_days: 7 });
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ order_type: '', order_type_label: '', default_production_days: 7 });

  // Fetch order type defaults
  const { data: orderTypeDefaults, isLoading: isLoadingOrderTypes } = useQuery({
    queryKey: ['order_type_defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_type_defaults')
        .select('*')
        .order('order_type_label');
      if (error) throw error;
      return data as OrderTypeDefault[];
    },
    enabled: canManageSettings,
  });

  // Mutation for updating order type defaults
  const updateOrderTypeMutation = useMutation({
    mutationFn: async (item: Partial<OrderTypeDefault> & { id: string }) => {
      const { error } = await supabase
        .from('order_type_defaults')
        .update({
          order_type: item.order_type,
          order_type_label: item.order_type_label,
          default_production_days: item.default_production_days,
        })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_type_defaults'] });
      setEditingId(null);
      toast({ title: 'Tip comandă actualizat' });
    },
    onError: () => {
      toast({ title: 'Eroare', description: 'Nu s-a putut actualiza', variant: 'destructive' });
    },
  });

  // Mutation for adding new order type
  const addOrderTypeMutation = useMutation({
    mutationFn: async (item: Omit<OrderTypeDefault, 'id'>) => {
      const { error } = await supabase
        .from('order_type_defaults')
        .insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_type_defaults'] });
      setIsAdding(false);
      setNewForm({ order_type: '', order_type_label: '', default_production_days: 7 });
      toast({ title: 'Tip comandă adăugat' });
    },
    onError: () => {
      toast({ title: 'Eroare', description: 'Nu s-a putut adăuga', variant: 'destructive' });
    },
  });

  // Mutation for deleting order type
  const deleteOrderTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('order_type_defaults')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_type_defaults'] });
      toast({ title: 'Tip comandă șters' });
    },
    onError: () => {
      toast({ title: 'Eroare', description: 'Nu s-a putut șterge', variant: 'destructive' });
    },
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  const updateSetting = <K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setHasChanges(false);
    toast({
      title: 'Setări salvate',
      description: 'Modificările au fost salvate cu succes',
    });
  };

  const startEdit = (item: OrderTypeDefault) => {
    setEditingId(item.id);
    setEditForm({
      order_type: item.order_type,
      order_type_label: item.order_type_label,
      default_production_days: item.default_production_days,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ order_type: '', order_type_label: '', default_production_days: 7 });
  };

  const saveEdit = (id: string) => {
    if (!editForm.order_type || !editForm.order_type_label) {
      toast({ title: 'Completează toate câmpurile', variant: 'destructive' });
      return;
    }
    updateOrderTypeMutation.mutate({ id, ...editForm });
  };

  const handleAdd = () => {
    if (!newForm.order_type || !newForm.order_type_label) {
      toast({ title: 'Completează toate câmpurile', variant: 'destructive' });
      return;
    }
    addOrderTypeMutation.mutate(newForm);
  };

  // Check access - show loading or restricted after all hooks
  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!canManageSettings) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <ShieldAlert className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Acces Restricționat</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Nu ai permisiunea să accesezi această pagină. Doar administratorii pot modifica setările.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Înapoi
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Setări</h1>
          <p className="mt-1 text-muted-foreground">
            Configurează aplicația după preferințele tale
          </p>
        </div>

        {/* Order Type Production Days */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Tipuri de Comenzi</h2>
              <p className="text-sm text-muted-foreground">
                Gestionează tipurile de comenzi și zilele de producție implicite
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              disabled={isAdding}
            >
              <Plus className="mr-1 h-4 w-4" />
              Adaugă
            </Button>
          </div>
          <Separator className="my-4" />
          
          {isLoadingOrderTypes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Add new form */}
              {isAdding && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <Input
                    placeholder="Cod (ex: tiparire)"
                    className="flex-1"
                    value={newForm.order_type}
                    onChange={(e) => setNewForm(prev => ({ ...prev, order_type: e.target.value }))}
                  />
                  <Input
                    placeholder="Nume (ex: Tipărire)"
                    className="flex-1"
                    value={newForm.order_type_label}
                    onChange={(e) => setNewForm(prev => ({ ...prev, order_type_label: e.target.value }))}
                  />
                  <Input
                    type="number"
                    min={1}
                    className="w-20 text-center"
                    value={newForm.default_production_days}
                    onChange={(e) => setNewForm(prev => ({ ...prev, default_production_days: parseInt(e.target.value) || 1 }))}
                  />
                  <Button size="icon" variant="ghost" onClick={handleAdd} disabled={addOrderTypeMutation.isPending}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setIsAdding(false); setNewForm({ order_type: '', order_type_label: '', default_production_days: 7 }); }}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}

              {/* Existing items */}
              {orderTypeDefaults?.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
                  {editingId === item.id ? (
                    <>
                      <Input
                        className="flex-1"
                        value={editForm.order_type}
                        onChange={(e) => setEditForm(prev => ({ ...prev, order_type: e.target.value }))}
                      />
                      <Input
                        className="flex-1"
                        value={editForm.order_type_label}
                        onChange={(e) => setEditForm(prev => ({ ...prev, order_type_label: e.target.value }))}
                      />
                      <Input
                        type="number"
                        min={1}
                        className="w-20 text-center"
                        value={editForm.default_production_days}
                        onChange={(e) => setEditForm(prev => ({ ...prev, default_production_days: parseInt(e.target.value) || 1 }))}
                      />
                      <Button size="icon" variant="ghost" onClick={() => saveEdit(item.id)} disabled={updateOrderTypeMutation.isPending}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.order_type_label}</p>
                        <p className="text-sm text-muted-foreground">{item.order_type}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.default_production_days} zile</span>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => deleteOrderTypeMutation.mutate(item.id)}
                        disabled={deleteOrderTypeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Informații Companie</h2>
          <p className="text-sm text-muted-foreground">
            Datele companiei tale
          </p>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Numele Companiei</Label>
              <Input 
                id="company-name" 
                value={settings.companyName}
                onChange={(e) => updateSetting('companyName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">Email</Label>
              <Input 
                id="company-email" 
                type="email" 
                value={settings.companyEmail}
                onChange={(e) => updateSetting('companyEmail', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Telefon</Label>
              <Input 
                id="company-phone" 
                value={settings.companyPhone}
                onChange={(e) => updateSetting('companyPhone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Adresă</Label>
              <Input 
                id="company-address" 
                value={settings.companyAddress}
                onChange={(e) => updateSetting('companyAddress', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Notificări</h2>
          <p className="text-sm text-muted-foreground">
            Configurează notificările
          </p>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Notificări Email</p>
                <p className="text-sm text-muted-foreground">
                  Primește notificări pe email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Rapoarte Săptămânale</p>
                <p className="text-sm text-muted-foreground">
                  Primește un sumar săptămânal
                </p>
              </div>
              <Switch
                checked={settings.weeklyReports}
                onCheckedChange={(checked) => updateSetting('weeklyReports', checked)}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          {hasChanges && (
            <p className="self-center text-sm text-muted-foreground">
              Ai modificări nesalvate
            </p>
          )}
          <Button 
            onClick={handleSave} 
            className="px-8"
            disabled={!hasChanges}
          >
            Salvează Modificările
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
