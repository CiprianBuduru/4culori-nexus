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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Search, Loader2, Plus, Trash2, Phone, Mail, MessageCircle, Globe, Users, MapPin, HelpCircle, FileText, Upload, X, ExternalLink } from 'lucide-react';
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
  is_comercial: z.boolean().default(false),
  is_unitate_protejata: z.boolean().default(false),
  contract_number: z.string().optional(),
  contract_company: z.enum(['LMG', 'EQS']).optional(),
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
  is_comercial?: boolean | null;
  is_unitate_protejata?: boolean | null;
  contract_number?: string | null;
  contract_url?: string | null;
  contract_company?: string | null;
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
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [existingContractUrl, setExistingContractUrl] = useState<string | null>(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      cui: '',
      company: '',
      is_comercial: false,
      is_unitate_protejata: false,
      contract_number: '',
      contract_company: undefined,
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
        is_comercial: client.is_comercial || false,
        is_unitate_protejata: client.is_unitate_protejata || false,
        contract_number: client.contract_number || '',
        contract_company: (client.contract_company as 'LMG' | 'EQS') || undefined,
        contact_name: contactData.main?.name || '',
        contact_phone: contactData.main?.phone || client.phone || '',
        contact_email: contactData.main?.email || client.email || '',
        delivery_address: client.address || '',
        other_contacts: contactData.others,
        contact_methods: client.contact_method ? client.contact_method.split(',') : [],
        notes: client.notes || '',
        status: client.status as 'active' | 'inactive',
      });
      setExistingContractUrl(client.contract_url || null);
      setContractFile(null);
    } else {
      form.reset({
        cui: '',
        company: '',
        is_comercial: false,
        is_unitate_protejata: false,
        contract_number: '',
        contract_company: undefined,
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        delivery_address: '',
        other_contacts: [],
        contact_methods: [],
        notes: '',
        status: 'active',
      });
      setExistingContractUrl(null);
      setContractFile(null);
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

  const uploadContract = async (file: File, clientId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}/contract-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('client-contracts')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('client-contracts')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const mutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      // Build all contacts array: main contact first, then others
      const allContacts = [
        { name: data.contact_name, email: data.contact_email || '', phone: data.contact_phone || '' },
        ...(data.other_contacts || [])
      ];
      
      let contractUrl = existingContractUrl;
      
      const payload: any = {
        cui: data.cui || null,
        name: data.company,
        email: data.contact_email || null,
        phone: data.contact_phone || null,
        company: data.company || null,
        is_comercial: data.is_comercial || false,
        is_unitate_protejata: data.is_unitate_protejata || false,
        contract_number: data.contract_number || null,
        contract_company: data.contract_company || null,
        address: data.delivery_address || null,
        contact_person: allContacts.length ? JSON.stringify(allContacts) : null,
        contact_method: data.contact_methods?.length ? data.contact_methods.join(',') : null,
        notes: data.notes || null,
        status: data.status,
      };

      if (client) {
        // Upload new contract if provided
        if (contractFile) {
          setIsUploadingContract(true);
          contractUrl = await uploadContract(contractFile, client.id);
          setIsUploadingContract(false);
        }
        payload.contract_url = contractUrl;
        
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', client.id);
        if (error) throw error;
      } else {
        // Insert client first to get the ID
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        
        // Upload contract if provided
        if (contractFile && newClient) {
          setIsUploadingContract(true);
          contractUrl = await uploadContract(contractFile, newClient.id);
          setIsUploadingContract(false);
          
          // Update with contract URL
          await supabase
            .from('clients')
            .update({ contract_url: contractUrl })
            .eq('id', newClient.id);
        }
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

  const handleContractFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({ title: 'Doar fișiere PDF sunt acceptate', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Fișierul nu poate depăși 10MB', variant: 'destructive' });
        return;
      }
      setContractFile(file);
    }
  };

  const removeContract = () => {
    setContractFile(null);
    setExistingContractUrl(null);
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

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_comercial"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Comercial</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_unitate_protejata"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Unitate Protejată</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Contract Section */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
              <FormLabel className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Contract
              </FormLabel>
              
              <FormField
                control={form.control}
                name="contract_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Număr contract</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ex: CTR-2024-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contract Company - auto LMG for Unitate Protejată, choice for Comercial */}
              {(form.watch('is_comercial') || form.watch('is_unitate_protejata')) && (
                <FormField
                  control={form.control}
                  name="contract_company"
                  render={({ field }) => {
                    const isUnitateProtejata = form.watch('is_unitate_protejata');
                    
                    // Auto-set LMG for Unitate Protejată
                    if (isUnitateProtejata && field.value !== 'LMG') {
                      field.onChange('LMG');
                    }
                    
                    return (
                      <FormItem>
                        <FormLabel className="text-sm">Companie contract</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-4"
                            disabled={isUnitateProtejata}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="LMG" id="contract-lmg" className="border-blue-500 text-blue-500" />
                              <label htmlFor="contract-lmg" className={`text-sm cursor-pointer ${isUnitateProtejata ? 'text-muted-foreground' : ''}`}>
                                LMG
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value="EQS" 
                                id="contract-eqs" 
                                className="border-red-500 text-red-500"
                                disabled={isUnitateProtejata}
                              />
                              <label htmlFor="contract-eqs" className={`text-sm cursor-pointer ${isUnitateProtejata ? 'text-muted-foreground' : ''}`}>
                                EQS
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        {isUnitateProtejata && (
                          <p className="text-xs text-muted-foreground">Unitate Protejată - contract exclusiv LMG</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

              <div>
                <FormLabel className="text-sm">Atașament contract (PDF)</FormLabel>
                <div className="mt-1.5">
                  {contractFile ? (
                    <div className="flex items-center gap-2 p-2 border rounded-lg bg-background">
                      <FileText className="h-4 w-4 text-red-500" />
                      <span className="text-sm flex-1 truncate">{contractFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setContractFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : existingContractUrl ? (
                    <div className="flex items-center gap-2 p-2 border rounded-lg bg-background">
                      <FileText className="h-4 w-4 text-red-500" />
                      <span className="text-sm flex-1">Contract existent</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => window.open(existingContractUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={removeContract}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Încarcă PDF</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleContractFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isUploadingContract}>
                Anulează
              </Button>
              <Button type="submit" disabled={mutation.isPending || isUploadingContract} className="flex-1">
                {isUploadingContract ? 'Se încarcă...' : mutation.isPending ? 'Se salvează...' : 'Salvează'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
