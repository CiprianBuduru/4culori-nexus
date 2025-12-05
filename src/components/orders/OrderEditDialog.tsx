import { useEffect, useState, useRef } from 'react';
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
  FormDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, X, ChevronUp, ChevronDown, GripVertical, ArrowRight, Sparkles, Loader2, Calculator } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { OrderProductsSelector, OrderProduct } from './OrderProductsSelector';

interface RecipeSuggestion {
  recipeId: string;
  recipeName: string;
  quantity: number;
  confidence: number;
  reasoning: string;
  recipe: {
    id: string;
    name: string;
    description: string;
    base_price: number;
    price_per_unit: number;
  };
}

// Order workflow statuses in order
const ORDER_STATUSES = [
  { value: 'pending', label: 'Comandă Nouă', description: 'Comanda a fost creată' },
  { value: 'dtp', label: 'La DTP', description: 'În lucru la DTP' },
  { value: 'waiting_bt', label: 'Așteptare BT', description: 'Așteaptă Bun de Tipar de la client' },
  { value: 'bt_approved', label: 'BT Aprobat', description: 'Clientul a aprobat, gata pentru producție' },
  { value: 'production', label: 'În Producție', description: 'În lucru în producție' },
  { value: 'ready_for_delivery', label: 'Gata de Livrare', description: 'Producția finalizată' },
  { value: 'delivered', label: 'Livrată', description: 'Predată clientului' },
  { value: 'completed', label: 'Finalizată', description: 'Comandă închisă' },
  { value: 'cancelled', label: 'Anulată', description: 'Comandă anulată' },
] as const;

type OrderStatus = typeof ORDER_STATUSES[number]['value'];

const orderSchema = z.object({
  order_number: z.string().min(1, 'Numărul comenzii este obligatoriu'),
  name: z.string().optional(),
  order_type: z.string().optional(),
  brief: z.string().optional(),
  client_id: z.string().optional(),
  status: z.enum(['pending', 'dtp', 'waiting_bt', 'bt_approved', 'production', 'ready_for_delivery', 'delivered', 'completed', 'cancelled']),
  total_amount: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  due_date: z.string().optional(),
  needs_dtp: z.boolean().optional(),
  production_days: z.coerce.number().min(0).optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface Order {
  id: string;
  order_number: string;
  name?: string | null;
  order_type?: string | null;
  brief?: string | null;
  client_id: string | null;
  status: string;
  total_amount: number | null;
  quantity?: number | null;
  notes: string | null;
  due_date: string | null;
  attachment_url?: string | null;
  production_operations?: string[] | null;
  needs_dtp?: boolean | null;
  production_days?: number | null;
  document_type?: 'oferta' | 'comanda';
}

interface OrderEditDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType?: 'oferta' | 'comanda';
}

export function OrderEditDialog({ order, open, onOpenChange, documentType = 'comanda' }: OrderEditDialogProps) {
  const { productionOperations } = useDepartments();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<OrderProduct[]>([]);
  
  // AI Brief Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: orderTypeDefaults = [] } = useQuery({
    queryKey: ['order-type-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_type_defaults')
        .select('order_type, order_type_label, default_production_days, default_brief')
        .order('order_type_label');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      order_number: '',
      name: '',
      order_type: '',
      brief: '',
      client_id: '',
      status: 'pending',
      total_amount: 0,
      quantity: 0,
      notes: '',
      due_date: '',
      needs_dtp: false,
      production_days: 7,
    },
  });

  const currentStatus = form.watch('status');
  const needsDtp = form.watch('needs_dtp');
  const watchedOrderType = form.watch('order_type');

  // Auto-update production_days and brief when order_type changes (only for new orders)
  useEffect(() => {
    if (!order && watchedOrderType && orderTypeDefaults.length > 0) {
      const typeDefault = orderTypeDefaults.find(t => t.order_type === watchedOrderType);
      if (typeDefault) {
        form.setValue('production_days', typeDefault.default_production_days);
        // Only set brief if it's empty or was auto-filled before
        const currentBrief = form.getValues('brief');
        if (!currentBrief || currentBrief === '') {
          form.setValue('brief', typeDefault.default_brief || '');
        }
      }
    }
  }, [watchedOrderType, orderTypeDefaults, order, form]);

  useEffect(() => {
    if (order) {
      form.reset({
        order_number: order.order_number,
        name: order.name || '',
        order_type: order.order_type || '',
        brief: order.brief || '',
        client_id: order.client_id || '',
        status: order.status as OrderStatus,
        total_amount: order.total_amount || 0,
        quantity: order.quantity || 0,
        notes: order.notes || '',
        due_date: order.due_date || '',
        needs_dtp: order.needs_dtp || false,
        production_days: order.production_days || 0,
      });
      setExistingAttachment(order.attachment_url || null);
      setSelectedOperations(order.production_operations || []);
      setSelectedProducts([]);
    } else {
      const prefix = documentType === 'oferta' ? 'OFR' : 'CMD';
      const nextOrderNumber = `${prefix}-${Date.now().toString().slice(-6)}`;
      form.reset({
        order_number: nextOrderNumber,
        name: '',
        order_type: '',
        brief: '',
        client_id: '',
        status: 'pending',
        total_amount: 0,
        quantity: 0,
        notes: '',
        due_date: '',
        needs_dtp: false,
        production_days: 7,
      });
      setExistingAttachment(null);
      setSelectedOperations([]);
      setSelectedProducts([]);
    }
    setAttachmentFile(null);
    setAttachmentPreview(null);
    // Reset AI analysis state
    setSuggestions([]);
    setCalculatedPrice(null);
  }, [order, form, documentType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tip de fișier invalid. Acceptăm PDF sau imagini.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fișierul este prea mare. Maxim 10MB.');
      return;
    }

    setAttachmentFile(file);
    if (file.type.startsWith('image/')) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setExistingAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadAttachment = async (orderId: string): Promise<string | null> => {
    if (!attachmentFile) return existingAttachment;

    const fileExt = attachmentFile.name.split('.').pop();
    const fileName = `${orderId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('order-attachments')
      .upload(fileName, attachmentFile);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('order-attachments')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // Operation handling
  const toggleOperation = (opId: string) => {
    setSelectedOperations(prev => {
      if (prev.includes(opId)) {
        return prev.filter(id => id !== opId);
      } else {
        return [...prev, opId];
      }
    });
  };

  const moveOperation = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedOperations.length) return;
    
    const newOps = [...selectedOperations];
    [newOps[index], newOps[newIndex]] = [newOps[newIndex], newOps[index]];
    setSelectedOperations(newOps);
  };

  const isOffer = (order?.document_type || documentType) === 'oferta';
  const docLabel = isOffer ? 'Ofertă' : 'Comandă';
  const docLabelLower = isOffer ? 'ofertă' : 'comandă';

  // Analyze brief function for AI price calculation
  const analyzeBrief = async () => {
    const briefValue = form.getValues('brief');
    if (!briefValue?.trim()) {
      toast.error('Introduceți un brief pentru analiză');
      return;
    }

    setIsAnalyzing(true);
    setSuggestions([]);
    setCalculatedPrice(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-brief', {
        body: { brief: briefValue }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const newSuggestions = data.suggestions || [];
      setSuggestions(newSuggestions);

      // Calculate total price from suggestions
      if (newSuggestions.length > 0) {
        const totalPrice = newSuggestions.reduce((sum: number, s: RecipeSuggestion) => {
          const basePrice = s.recipe?.base_price || 0;
          const pricePerUnit = s.recipe?.price_per_unit || 0;
          return sum + basePrice + (pricePerUnit * s.quantity);
        }, 0);
        setCalculatedPrice(totalPrice);
        form.setValue('total_amount', totalPrice);
        toast.success(`Am calculat prețul estimat: ${totalPrice.toFixed(2)} €`);
      } else {
        toast.info(data.message || 'Nu am găsit rețete potrivite pentru acest brief');
      }
    } catch (error) {
      console.error('Error analyzing brief:', error);
      toast.error('Eroare la analiza brief-ului');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const payload = {
        order_number: data.order_number,
        name: data.name || null,
        order_type: data.order_type || null,
        brief: data.brief || null,
        client_id: data.client_id || null,
        status: data.status,
        total_amount: data.total_amount || 0,
        quantity: data.quantity || null,
        notes: data.notes || null,
        due_date: data.due_date || null,
        production_operations: selectedOperations,
        needs_dtp: data.needs_dtp || false,
        production_days: data.production_days || 0,
        document_type: order?.document_type || documentType,
      };

      let orderId: string;

      if (order) {
        orderId = order.id;
        const attachmentUrl = await uploadAttachment(orderId);
        const { error } = await supabase
          .from('orders')
          .update({ ...payload, attachment_url: attachmentUrl })
          .eq('id', order.id);
        if (error) throw error;
      } else {
        const { data: newOrder, error } = await supabase
          .from('orders')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        orderId = newOrder.id;

        if (attachmentFile) {
          const attachmentUrl = await uploadAttachment(orderId);
          await supabase
            .from('orders')
            .update({ attachment_url: attachmentUrl })
            .eq('id', orderId);
        }
      }

      // Handle order products and stock deduction
      if (selectedProducts.length > 0) {
        // Delete existing order products if editing
        if (order) {
          await supabase.from('order_products').delete().eq('order_id', orderId);
        }

        // Insert new order products
        const orderProductsData = selectedProducts.map((sp) => ({
          order_id: orderId,
          product_id: sp.product_id,
          quantity: sp.quantity,
          unit_price: sp.unit_price,
        }));

        const { error: productsError } = await supabase
          .from('order_products')
          .insert(orderProductsData);

        if (productsError) throw productsError;

        // Deduct stock and record movements (only for new orders or when not editing)
        if (!order) {
          for (const sp of selectedProducts) {
            // Get current stock
            const { data: productData } = await supabase
              .from('products')
              .select('stock')
              .eq('id', sp.product_id)
              .single();

            const currentStock = productData?.stock || 0;

            // Update product stock
            await supabase
              .from('products')
              .update({ stock: currentStock - sp.quantity })
              .eq('id', sp.product_id);

            // Record stock movement
            await supabase.from('stock_movements').insert({
              product_id: sp.product_id,
              quantity: -sp.quantity,
              movement_type: 'order',
              reason: `Comandă ${data.order_number}`,
              order_id: orderId,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(order ? `${docLabel} actualizată` : `${docLabel} adăugată`);
      onOpenChange(false);
    },
    onError: () => {
      toast.error(`Eroare la salvarea ${docLabelLower}`);
    },
  });

  const onSubmit = (data: OrderFormData) => {
    mutation.mutate(data);
  };

  const isPdf = (url: string) => url.toLowerCase().endsWith('.pdf');

  const getOperationName = (id: string) => productionOperations.find(op => op.id === id)?.name || id;

  // Show production operations only when in production phase or later
  const showProductionOperations = ['bt_approved', 'production', 'ready_for_delivery', 'delivered', 'completed'].includes(currentStatus);

  // Get current status index for workflow display
  const getCurrentStatusIndex = () => ORDER_STATUSES.findIndex(s => s.value === currentStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? `Editează ${docLabel}` : `${docLabel} Nouă`}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Workflow Progress Indicator */}
            {order && !isOffer && (
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-2">Progres comandă:</p>
                <div className="flex flex-wrap items-center gap-1">
                  {ORDER_STATUSES.filter(s => s.value !== 'cancelled').slice(0, -1).map((status, index) => {
                    const currentIndex = getCurrentStatusIndex();
                    const isActive = status.value === currentStatus;
                    const isPast = index < currentIndex;
                    const isCancelled = currentStatus === 'cancelled';
                    
                    return (
                      <div key={status.value} className="flex items-center">
                        <Badge 
                          variant={isActive ? 'default' : isPast ? 'secondary' : 'outline'}
                          className={`text-xs ${isActive ? '' : isPast ? 'opacity-70' : 'opacity-40'} ${isCancelled ? 'opacity-30' : ''}`}
                        >
                          {status.label}
                        </Badge>
                        {index < 7 && (
                          <ArrowRight className={`h-3 w-3 mx-0.5 ${isPast ? 'text-muted-foreground' : 'text-muted-foreground/30'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Număr {docLabel} *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={isOffer ? "OFR-001" : "CMD-001"} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Denumire {docLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ex: Cărți de vizită, Flyere A5..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip {docLabel}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează tipul" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orderTypeDefaults.map((type) => (
                        <SelectItem key={type.order_type} value={type.order_type}>
                          {type.order_type_label} ({type.default_production_days} zile)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brief"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brief {docLabel}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Descrierea detaliată a comenzii..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* AI Price Calculator - only for offers */}
            {isOffer && (
              <div className="space-y-3 p-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-blue" />
                    <span className="text-sm font-medium">Calcul Preț AI</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={analyzeBrief}
                    disabled={isAnalyzing || !form.watch('brief')?.trim()}
                    className="gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analizez...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-3 w-3" />
                        Calculează Preț
                      </>
                    )}
                  </Button>
                </div>

                {/* Show suggestions if any */}
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Rețete identificate:</p>
                    {suggestions.map((suggestion, index) => (
                      <div 
                        key={`${suggestion.recipeId}-${index}`}
                        className="flex items-center justify-between p-2 rounded bg-background/80 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span>{suggestion.recipeName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.quantity} buc
                          </Badge>
                        </div>
                        <span className="font-medium">
                          {((suggestion.recipe?.base_price || 0) + (suggestion.recipe?.price_per_unit || 0) * suggestion.quantity).toFixed(2)} €
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show calculated price */}
                {calculatedPrice !== null && (
                  <div className="flex items-center justify-between pt-2 border-t border-brand-blue/20">
                    <span className="text-sm font-medium">Preț Estimat Total:</span>
                    <span className="text-lg font-bold text-brand-blue">{calculatedPrice.toFixed(2)} €</span>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Produse din stoc */}
            {!isOffer && (
              <OrderProductsSelector
                selectedProducts={selectedProducts}
                onChange={setSelectedProducts}
              />
            )}

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bucăți</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valoare (€)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termen Livrare</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Needs DTP Checkbox - only for new orders or early statuses */}
            {['pending', 'dtp', 'waiting_bt'].includes(currentStatus) && (
              <FormField
                control={form.control}
                name="needs_dtp"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Necesită DTP</FormLabel>
                      <FormDescription>
                        Bifează dacă comanda trebuie să treacă prin departamentul DTP înainte de producție
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

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
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex flex-col">
                            <span>{status.label}</span>
                            <span className="text-xs text-muted-foreground">{status.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Production Days - always visible */}
            <FormField
              control={form.control}
              name="production_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zile necesare producție</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" placeholder="0" />
                  </FormControl>
                  <FormDescription>
                    Numărul de zile necesare pentru producție. Calendarul va afișa alertă de începere cu acest număr de zile înainte de termenul de livrare.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Production Operations Section - only shown after BT approved */}
            {showProductionOperations && (
              <div className="space-y-3">
                <FormLabel>Operațiuni Producție</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Directorul de producție selectează operațiunile necesare după aprobarea BT
                </p>
                
                {/* Available operations to select */}
                <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2">Selectează operațiunile necesare:</p>
                  <div className="flex flex-wrap gap-2">
                    {productionOperations.map((op) => (
                      <label
                        key={op.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors text-sm ${
                          selectedOperations.includes(op.id)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                      >
                        <Checkbox
                          checked={selectedOperations.includes(op.id)}
                          onCheckedChange={() => toggleOperation(op.id)}
                          className="hidden"
                        />
                        {op.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Selected operations with ordering */}
                {selectedOperations.length > 0 && (
                  <div className="border rounded-lg p-3 space-y-1 bg-background">
                    <p className="text-xs text-muted-foreground mb-2">Ordinea operațiunilor:</p>
                    {selectedOperations.map((opId, index) => (
                      <div
                        key={opId}
                        className="flex items-center gap-2 p-2 rounded bg-muted/30 border"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium">
                          {index + 1}. {getOperationName(opId)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveOperation(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveOperation(index, 'down')}
                            disabled={index === selectedOperations.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => toggleOperation(opId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Detalii comandă..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachment Section */}
            <div className="space-y-2">
              <FormLabel>Atașament (PDF sau imagine)</FormLabel>
              
              {(attachmentFile || existingAttachment) ? (
                <div className="relative border rounded-lg p-3 bg-muted/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={removeAttachment}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  {attachmentPreview ? (
                    <img src={attachmentPreview} alt="Preview" className="max-h-32 rounded object-contain mx-auto" />
                  ) : existingAttachment && !isPdf(existingAttachment) ? (
                    <img src={existingAttachment} alt="Atașament" className="max-h-32 rounded object-contain mx-auto" />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-8 w-8" />
                      <span>{attachmentFile?.name || 'Document PDF'}</span>
                    </div>
                  )}
                  
                  {existingAttachment && !attachmentFile && (
                    <a 
                      href={existingAttachment} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 block"
                    >
                      Deschide fișierul
                    </a>
                  )}
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Click pentru a încărca
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF sau imagine (max 10MB)
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Anulează
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Se salvează...' : order ? 'Salvează' : 'Adaugă'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
