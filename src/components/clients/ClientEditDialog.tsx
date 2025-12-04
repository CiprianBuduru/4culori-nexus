import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { ToastAction } from '@/components/ui/toast';
import { Search, Loader2, Plus, Trash2, Phone, Mail, MessageCircle, Globe, Users, MapPin, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const contactMethods = [
  { value: 'telefon', label: 'Telefon', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'recomandare', label: 'Recomandare', icon: Users },
  { value: 'vizita', label: 'Vizită directă', icon: MapPin },
  { value: 'altul', label: 'Altul', icon: HelpCircle },
];

const contactPersonSchema = z.object({
  name: z.string().min(1, 'Numele este obligatoriu'),
  email: z.string().email('Email invalid').optional().or(z.literal('')),
  phone: z.string().optional(),
});

const clientSchema = z.object({
  cui: z.string().optional(),
  name: z.string().min(1, 'Numele este obligatoriu'),
  email: z.string().email('Email invalid').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  contact_persons: z.array(contactPersonSchema).optional(),
  contact_methods: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

type ClientFormData = z.infer<typeof clientSchema>;
type ContactPerson = z.infer<typeof contactPersonSchema>;

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
}

interface ClientEditDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientEditDialog({ client, open, onOpenChange }: ClientEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLookingUp, setIsLookingUp] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      cui: '',
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      contact_persons: [],
      contact_methods: [],
      notes: '',
      status: 'active',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'contact_persons',
  });

  // Helper to parse contact_person JSON from DB
  const parseContactPersons = (value: string | null): ContactPerson[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      // Legacy: single string name
      if (typeof parsed === 'string') return [{ name: parsed, email: '', phone: '' }];
      return [];
    } catch {
      // Legacy: plain string
      if (value) return [{ name: value, email: '', phone: '' }];
      return [];
    }
  };

  useEffect(() => {
    if (client) {
      form.reset({
        cui: client.cui || '',
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        company: client.company || '',
        address: client.address || '',
        contact_persons: parseContactPersons(client.contact_person),
        contact_methods: client.contact_method ? client.contact_method.split(',') : [],
        notes: client.notes || '',
        status: client.status as 'active' | 'inactive',
      });
    } else {
      form.reset({
        cui: '',
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        contact_persons: [],
        contact_methods: [],
        notes: '',
        status: 'active',
      });
    }
  }, [client, form]);

  const lookupCompany = async () => {
    const cui = form.getValues('cui');
    if (!cui) {
      toast({ title: 'Introduceți CUI-ul', variant: 'destructive' });
      return;
    }

    const cleanCui = cui.replace(/^RO/i, '').replace(/\s/g, '').trim();

    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-company', {
        body: { cui: cleanCui }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        // ANAF unavailable - show toast with link to check manually
        toast({ 
          title: 'Serviciul ANAF nu este disponibil',
          description: 'Verificați manual și completați datele.',
          variant: 'destructive',
          action: (
            <ToastAction 
              altText="Verifică pe MFinanțe"
              onClick={() => window.open(data.suggestion || 'https://mfinante.gov.ro/infocodfiscal', '_blank')}
            >
              Verifică manual
            </ToastAction>
          ),
        });
        return;
      }

      form.setValue('name', data.name || form.getValues('name'));
      form.setValue('company', data.name || form.getValues('company'));
      form.setValue('address', data.address || form.getValues('address'));
      if (data.phone) {
        form.setValue('phone', data.phone);
      }

      toast({ 
        title: 'Date preluate cu succes',
        description: data.platitorTva ? 'Plătitor TVA' : 'Neplătitor TVA'
      });
    } catch (error) {
      console.error('Lookup error:', error);
      toast({ 
        title: 'Eroare la preluarea datelor', 
        description: 'Verificați CUI-ul și încercați din nou',
        variant: 'destructive',
        action: (
          <ToastAction 
            altText="Verifică pe MFinanțe"
            onClick={() => window.open('https://mfinante.gov.ro/infocodfiscal', '_blank')}
          >
            Verifică manual
          </ToastAction>
        ),
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const payload = {
        cui: data.cui || null,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        address: data.address || null,
        contact_person: data.contact_persons?.length ? JSON.stringify(data.contact_persons) : null,
        contact_method: data.contact_methods?.length ? data.contact_methods.join(',') : null,
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
    onError: (error: any) => {
      if (error.code === '23505' && error.message?.includes('cui')) {
        toast({ title: 'CUI-ul există deja în baza de date', variant: 'destructive' });
      } else {
        toast({ title: 'Eroare la salvarea clientului', variant: 'destructive' });
      }
    },
  });

  const onSubmit = (data: ClientFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Editează Client' : 'Client Nou'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cui"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CUI / Cod Fiscal</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} placeholder="RO12345678 sau 12345678" />
                    </FormControl>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={lookupCompany}
                      disabled={isLookingUp}
                    >
                      {isLookingUp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nume / Denumire *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nume complet sau denumire firmă" />
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
                    <Textarea {...field} placeholder="Adresa completă" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Persons Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Persoane de contact</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', email: '', phone: '' })}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Adaugă
                </Button>
              </div>
              
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nicio persoană de contact adăugată</p>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Contact {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormField
                        control={form.control}
                        name={`contact_persons.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Nume" className="h-8" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`contact_persons.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} type="email" placeholder="Email" className="h-8" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`contact_persons.${index}.phone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="Telefon" className="h-8" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Methods */}
            <FormField
              control={form.control}
              name="contact_methods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modalitate contact</FormLabel>
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-2">
                      {contactMethods.map(method => {
                        const isSelected = field.value?.includes(method.value);
                        const Icon = method.icon;
                        return (
                          <Tooltip key={method.value}>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant={isSelected ? 'default' : 'outline'}
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => {
                                  const current = field.value || [];
                                  if (isSelected) {
                                    field.onChange(current.filter(v => v !== method.value));
                                  } else {
                                    field.onChange([...current, method.value]);
                                  }
                                }}
                              >
                                <Icon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{method.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
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
                    <Textarea {...field} placeholder="Note adiționale..." rows={2} />
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
