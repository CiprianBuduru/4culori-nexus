import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2 } from 'lucide-react';
import { ProductImageUpload } from './ProductImageUpload';

const productSchema = z.object({
  name: z.string().min(1, 'Numele este obligatoriu'),
  sku: z.string().min(1, 'SKU este obligatoriu'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Prețul trebuie să fie pozitiv'),
  stock: z.coerce.number().min(0, 'Stocul trebuie să fie pozitiv'),
  category: z.string().min(1, 'Categoria este obligatorie'),
  status: z.enum(['active', 'inactive', 'discontinued']),
  image: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductEditDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: Product) => void;
  isLoading?: boolean;
}

const categories = ['Papetărie', 'Hârtie', 'Artă', 'Textile', 'Ambalaje', 'Consumabile', 'Altele'];

export function ProductEditDialog({
  product,
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: ProductEditDialogProps) {
  const isEditing = !!product;
  const [productImage, setProductImage] = useState<string | undefined>(undefined);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      status: 'active',
      image: '',
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        price: product.price,
        stock: product.stock,
        category: product.category,
        status: product.status,
        image: product.image || '',
      });
      setProductImage(product.image);
    } else {
      form.reset({
        name: '',
        sku: '',
        description: '',
        price: 0,
        stock: 0,
        category: '',
        status: 'active',
        image: '',
      });
      setProductImage(undefined);
    }
  }, [product, form]);

  const handleSubmit = (data: ProductFormData) => {
    const updatedProduct: Product = {
      id: product?.id || crypto.randomUUID(),
      name: data.name,
      sku: data.sku,
      description: data.description || '',
      price: data.price,
      stock: data.stock,
      category: data.category,
      status: data.status,
      image: productImage,
    };
    onSave(updatedProduct);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editează Produs' : 'Adaugă Produs Nou'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="flex gap-6">
              {/* Image Upload */}
              <ProductImageUpload
                currentImage={productImage}
                onImageChange={setProductImage}
              />
              
              {/* Name and SKU */}
              <div className="flex-1 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume produs</FormLabel>
                      <FormControl>
                        <Input placeholder="Introdu numele produsului" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="COD-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorie</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descriere</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descriere produs..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preț (RON)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stoc</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
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
                        <SelectItem value="discontinued">Discontinuat</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Anulează
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvează' : 'Adaugă'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
