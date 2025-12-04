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
  company: z.string().min(1, 'Compania este obligatorie'),
  contact_name: z.string().min(1, 'Persoana de contact este obligatorie'),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Email invalid').optional().or(z.literal('')),
  delivery_address: z.string().optional(),
  other_contacts: z.array(contactPersonSchema).optional(),
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
      company: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      delivery_address: '',
      other_contacts: [],
      contact_methods: [],
      notes: '',
      status: 'active',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'other_contacts',
  });

  // Helper to parse contact_person JSON from DB
  const parseContactData = (value: string | null): { main: { name: string; email: string; phone: string } | null; others: ContactPerson[] } => {
    if (!value) return { main: null, others: [] };
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const [main, ...others] = parsed;
        return { main: main || null, others };
      }
      if (typeof parsed === 'string') return { main: { name: parsed, email: '', phone: '' }, others: [] };
      return { main: null, others: [] };
    } catch {
      if (value) return { main: { name: value, email: '', phone: '' }, others: [] };
      return { main: null, others: [] };
    }
  };

  useEffect(() => {
    if (client) {
      const contactData = parseContactData(client.contact_person);
      form.reset({
        cui: client.cui || '',
        company: client.company || client.name || '',
        contact_name: contactData.main?.name || '',
        contact_phone: contactData.main?.phone || client.phone || '',
        contact_email: contactData.main?.email || client.email || '',
        delivery_address: client.address || '',
        other_contacts: contactData.others,
        contact_methods: client.contact_method ? client.contact_method.split(',') : [],
        notes: client.notes || '',
        status: client.status as 'active' | 'inactive',
      });
    } else {
      form.reset({
        cui: '',
        company: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        delivery_address: '',
        other_contacts: [],
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

      form.setValue('company', data.name || form.getValues('company'));
      form.setValue('delivery_address', data.address || form.getValues('delivery_address'));
      if (data.phone) {
        form.setValue('contact_phone', data.phone);
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
      // Build all contacts array: main contact first, then others
      const allContacts = [
        { name: data.contact_name, email: data.contact_email || '', phone: data.contact_phone || '' },
        ...(data.other_contacts || [])
      ];
      
      const payload = {
        cui: data.cui || null,
        name: data.company,
        email: data.contact_email || null,
        phone: data.contact_phone || null,
        company: data.company || null,
        address: data.delivery_address || null,
        contact_person: allContacts.length ? JSON.stringify(allContacts) : null,
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
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Companie *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Numele companiei" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Main Contact Person Section */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
              <FormLabel className="text-base font-medium">Persoană de contact *</FormLabel>
              
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} placeholder="Nume persoană contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input {...field} placeholder="Telefon" className="pl-9" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type="email" placeholder="Email" className="pl-9" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="delivery_address"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea {...field} placeholder="Adresă de livrare" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Methods */}
              <FormField
                control={form.control}
                name="contact_methods"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Modalitate contact</FormLabel>
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
            </div>

            {/* Other Contact Persons Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Alte persoane de contact</FormLabel>
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
                <p className="text-sm text-muted-foreground">Nicio altă persoană de contact</p>
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
                        name={`other_contacts.${index}.name`}
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
                          name={`other_contacts.${index}.email`}
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
                          name={`other_contacts.${index}.phone`}
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
