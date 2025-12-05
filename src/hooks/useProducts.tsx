import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      const mapped: Product[] = (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description || '',
        price: Number(p.price),
        stock: p.stock,
        category: p.category,
        status: p.status as Product['status'],
        image: p.image || undefined,
      }));

      setProducts(mapped);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca produsele',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          sku: product.sku,
          description: product.description || null,
          price: product.price,
          stock: product.stock,
          category: product.category,
          status: product.status,
          image: product.image || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newProduct: Product = {
        id: data.id,
        name: data.name,
        sku: data.sku,
        description: data.description || '',
        price: Number(data.price),
        stock: data.stock,
        category: data.category,
        status: data.status as Product['status'],
        image: data.image || undefined,
      };

      setProducts((prev) => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
      return newProduct;
    } catch (error: any) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: product.name,
          sku: product.sku,
          description: product.description || null,
          price: product.price,
          stock: product.stock,
          category: product.category,
          status: product.status,
          image: product.image || null,
        })
        .eq('id', product.id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? product : p))
      );
      return product;
    } catch (error: any) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error: any) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  return {
    products,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts,
  };
}