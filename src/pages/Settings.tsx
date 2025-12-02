import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Setări salvate',
      description: 'Modificările au fost salvate cu succes',
    });
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
              <Input id="company-name" defaultValue="4culori SRL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">Email</Label>
              <Input id="company-email" type="email" defaultValue="contact@4culori.ro" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Telefon</Label>
              <Input id="company-phone" defaultValue="+40 21 123 4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Adresă</Label>
              <Input id="company-address" defaultValue="Str. Culorilor nr. 4, București" />
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
              <Button variant="outline" size="sm">
                Activează
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Rapoarte Săptămânale</p>
                <p className="text-sm text-muted-foreground">
                  Primește un sumar săptămânal
                </p>
              </div>
              <Button variant="outline" size="sm">
                Activează
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="px-8">
            Salvează Modificările
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
