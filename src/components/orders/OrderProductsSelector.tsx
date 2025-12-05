import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Plus, Minus, Trash2, Search, AlertTriangle } from 'lucide-react';

export interface OrderProduct {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  available_stock: number;
}

interface OrderProductsSelectorProps {
  selectedProducts: OrderProduct[];
  onChange: (products: OrderProduct[]) => void;
}

export function OrderProductsSelector({ selectedProducts, onChange }: OrderProductsSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      setProducts(
        (data || []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          description: p.description || '',
          price: Number(p.price),
          stock: p.stock,
          category: p.category,
          status: p.status as Product['status'],
          image: p.image || undefined,
        }))
      );
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addProduct = (product: Product) => {
    const existing = selectedProducts.find((sp) => sp.product_id === product.id);
    if (existing) {
      // Increase quantity if already selected
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      onChange([
        ...selectedProducts,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          available_stock: product.stock,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeProduct(productId);
      return;
    }
    onChange(
      selectedProducts.map((sp) =>
        sp.product_id === productId ? { ...sp, quantity: newQuantity } : sp
      )
    );
  };

  const removeProduct = (productId: string) => {
    onChange(selectedProducts.filter((sp) => sp.product_id !== productId));
  };

  const totalValue = selectedProducts.reduce((sum, sp) => sum + sp.quantity * sp.unit_price, 0);

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Produse din stoc</Label>

      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-muted-foreground">Produse selectate:</p>
          {selectedProducts.map((sp) => {
            const isOverStock = sp.quantity > sp.available_stock;
            return (
              <div
                key={sp.product_id}
                className={`flex items-center justify-between rounded-md p-2 ${
                  isOverStock ? 'bg-destructive/10' : 'bg-muted'
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{sp.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sp.unit_price.toFixed(2)} € × {sp.quantity} = {(sp.quantity * sp.unit_price).toFixed(2)} €
                  </p>
                  {isOverStock && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      Stoc insuficient (disponibil: {sp.available_stock})
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(sp.product_id, sp.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={sp.quantity}
                    onChange={(e) => updateQuantity(sp.product_id, parseInt(e.target.value) || 1)}
                    className="h-7 w-14 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(sp.product_id, sp.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeProduct(sp.product_id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          <div className="flex justify-between pt-2 border-t border-border mt-2">
            <span className="font-medium">Total produse:</span>
            <span className="font-bold text-primary">{totalValue.toFixed(2)} €</span>
          </div>
        </div>
      )}

      {/* Product Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Caută produse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[200px] rounded-md border border-border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Se încarcă...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Nu există produse</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.some((sp) => sp.product_id === product.id);
                const isLowStock = product.stock < 10;
                return (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between rounded-md p-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    onClick={() => addProduct(product)}
                  >
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary">
                          <Package className="h-4 w-4 text-secondary-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isLowStock ? 'destructive' : 'secondary'} className="text-xs">
                        {product.stock} buc
                      </Badge>
                      <span className="text-sm font-medium">{product.price.toFixed(2)} €</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}