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
import { Loader2 } from 'lucide-react';

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
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [orderTypeEdits, setOrderTypeEdits] = useState<Record<string, number>>({});

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
  });

  // Mutation for updating order type defaults
  const updateOrderTypeMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const { error } = await supabase
        .from('order_type_defaults')
        .update({ default_production_days: days })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_type_defaults'] });
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

  const handleOrderTypeDaysChange = (id: string, days: number) => {
    setOrderTypeEdits(prev => ({ ...prev, [id]: days }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Save company settings to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    // Save order type defaults to database
    const updatePromises = Object.entries(orderTypeEdits).map(([id, days]) =>
      updateOrderTypeMutation.mutateAsync({ id, days })
    );
    
    try {
      await Promise.all(updatePromises);
      setOrderTypeEdits({});
      setHasChanges(false);
      toast({
        title: 'Setări salvate',
        description: 'Modificările au fost salvate cu succes',
      });
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut salva setările',
        variant: 'destructive',
      });
    }
  };

  const getDisplayDays = (item: OrderTypeDefault) => {
    return orderTypeEdits[item.id] ?? item.default_production_days;
  };

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
          <h2 className="text-lg font-semibold text-foreground">Zile Producție per Tip Comandă</h2>
          <p className="text-sm text-muted-foreground">
            Configurează numărul implicit de zile de producție pentru fiecare tip de comandă
          </p>
          <Separator className="my-4" />
          {isLoadingOrderTypes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {orderTypeDefaults?.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.order_type_label}</p>
                    <p className="text-sm text-muted-foreground">{item.order_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      className="w-20 text-center"
                      value={getDisplayDays(item)}
                      onChange={(e) => handleOrderTypeDaysChange(item.id, parseInt(e.target.value) || 1)}
                    />
                    <span className="text-sm text-muted-foreground">zile</span>
                  </div>
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
            disabled={!hasChanges || updateOrderTypeMutation.isPending}
          >
            {updateOrderTypeMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvează Modificările
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
