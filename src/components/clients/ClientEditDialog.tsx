import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const clientSchema = z.object({
  name: z.string().min(1, 'Numele este obligatoriu'),
  email: z.string().email('Email invalid').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  status: string;
}

interface ClientEditDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientEditDialog({ client, open, onOpenChange }: ClientEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      notes: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        company: client.company || '',
        address: client.address || '',
        notes: client.notes || '',
        status: client.status as 'active' | 'inactive',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        notes: '',
        status: 'active',
      });
    }
  }, [client, form]);

  const mutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const payload = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        address: data.address || null,
        notes: data.notes || null,
        status: data.status,
      };

      if (client) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', client.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: client ? 'Client actualizat' : 'Client adăugat' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Eroare la salvarea clientului', variant: 'destructive' });
    },
  });

  const onSubmit = (data: ClientFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? 'Editează Client' : 'Client Nou'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nume *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nume complet" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Companie</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Numele companiei" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@exemplu.ro" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0700 000 000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresă</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Adresa completă" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Note adiționale..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activ</SelectItem>
                      <SelectItem value="inactive">Inactiv</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Anulează
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="flex-1">
                {mutation.isPending ? 'Se salvează...' : 'Salvează'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
