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
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

// Production operations list
const PRODUCTION_OPERATIONS = [
  { id: 'print-3d', name: 'Print 3D' },
  { id: 'gravura', name: 'Gravură' },
  { id: 'dtf-uv', name: 'DTF-UV' },
  { id: 'broderie', name: 'Broderie' },
  { id: 'tipografie', name: 'Tipografie' },
];

const orderSchema = z.object({
  order_number: z.string().min(1, 'Numărul comenzii este obligatoriu'),
  client_id: z.string().optional(),
  status: z.enum(['pending', 'dtp', 'waiting_bt', 'in_progress', 'completed', 'cancelled']),
  total_amount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  due_date: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface Order {
  id: string;
  order_number: string;
  client_id: string | null;
  status: string;
  total_amount: number | null;
  notes: string | null;
  due_date: string | null;
  attachment_url?: string | null;
  production_operations?: string[] | null;
}

interface OrderEditDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderEditDialog({ order, open, onOpenChange }: OrderEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);

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

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      order_number: '',
      client_id: '',
      status: 'pending',
      total_amount: 0,
      notes: '',
      due_date: '',
    },
  });

  useEffect(() => {
    if (order) {
      form.reset({
        order_number: order.order_number,
        client_id: order.client_id || '',
        status: order.status as 'pending' | 'dtp' | 'waiting_bt' | 'in_progress' | 'completed' | 'cancelled',
        total_amount: order.total_amount || 0,
        notes: order.notes || '',
        due_date: order.due_date || '',
      });
      setExistingAttachment(order.attachment_url || null);
      setSelectedOperations(order.production_operations || []);
    } else {
      const nextOrderNumber = `CMD-${Date.now().toString().slice(-6)}`;
      form.reset({
        order_number: nextOrderNumber,
        client_id: '',
        status: 'pending',
        total_amount: 0,
        notes: '',
        due_date: '',
      });
      setExistingAttachment(null);
      setSelectedOperations([]);
    }
    setAttachmentFile(null);
    setAttachmentPreview(null);
  }, [order, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Tip de fișier invalid. Acceptăm PDF sau imagini.', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Fișierul este prea mare. Maxim 10MB.', variant: 'destructive' });
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

  const mutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const payload = {
        order_number: data.order_number,
        client_id: data.client_id || null,
        status: data.status,
        total_amount: data.total_amount || 0,
        notes: data.notes || null,
        due_date: data.due_date || null,
        production_operations: selectedOperations,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: order ? 'Comandă actualizată' : 'Comandă adăugată' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Eroare la salvarea comenzii', variant: 'destructive' });
    },
  });

  const onSubmit = (data: OrderFormData) => {
    mutation.mutate(data);
  };

  const isPdf = (url: string) => url.toLowerCase().endsWith('.pdf');

  const getOperationName = (id: string) => PRODUCTION_OPERATIONS.find(op => op.id === id)?.name || id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Editează Comandă' : 'Comandă Nouă'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Număr Comandă *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="CMD-001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="pending">În așteptare</SelectItem>
                        <SelectItem value="dtp">DTP</SelectItem>
                        <SelectItem value="waiting_bt">În așteptare BT</SelectItem>
                        <SelectItem value="in_progress">În lucru</SelectItem>
                        <SelectItem value="completed">Finalizată</SelectItem>
                        <SelectItem value="cancelled">Anulată</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valoare (RON)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* Production Operations Section */}
            <div className="space-y-3">
              <FormLabel>Operațiuni Producție</FormLabel>
              
              {/* Available operations to select */}
              <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <p className="text-xs text-muted-foreground mb-2">Selectează operațiunile necesare:</p>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTION_OPERATIONS.map((op) => (
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
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click pentru a încărca PDF sau imagine
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Max 10MB</p>
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
