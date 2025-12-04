import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Building2, Mail, Phone, MapPin, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClientEditDialog } from '@/components/clients/ClientEditDialog';

interface Client {
  id: string;
  cui?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  contact_person: string | null;
  contact_method: string | null;
  notes: string | null;
  status: string;
  is_comercial: boolean | null;
  is_unitate_protejata: boolean | null;
  created_at: string;
}

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Client[];
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Client șters cu succes' });
    },
    onError: () => {
      toast({ title: 'Eroare la ștergerea clientului', variant: 'destructive' });
    },
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    setEditingClient(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clienți</h1>
            <p className="text-muted-foreground mt-1">
              Gestionează baza de clienți
            </p>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Client Nou
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Caută clienți..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-20 bg-muted/50" />
                <CardContent className="h-32 bg-muted/30" />
              </Card>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Niciun client găsit</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery ? 'Încearcă o altă căutare' : 'Adaugă primul client'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      {client.company && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          {client.company}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {client.is_comercial && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                          Comercial
                        </Badge>
                      )}
                      {client.is_unitate_protejata && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                          Unitate Protejată
                        </Badge>
                      )}
                      <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                        {client.status === 'active' ? 'Activ' : 'Inactiv'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.email && (
                    <p className="text-sm flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {client.email}
                    </p>
                  )}
                  {client.phone && (
                    <p className="text-sm flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {client.phone}
                    </p>
                  )}
                  {client.address && (
                    <p className="text-sm flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {client.address}
                    </p>
                  )}
                  <div className="flex gap-2 pt-3 border-t mt-3">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editează
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteClient.mutate(client.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Șterge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ClientEditDialog
        client={editingClient}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </MainLayout>
  );
}
