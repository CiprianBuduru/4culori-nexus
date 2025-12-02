import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { products } from '@/data/mockData';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredProducts = products.filter(
    (prod) =>
      prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (product: Product) => {
    toast({
      title: 'Editare produs',
      description: `Deschide formularul de editare pentru ${product.name}`,
    });
  };

  const handleDelete = (product: Product) => {
    toast({
      title: 'Ștergere produs',
      description: `${product.name} a fost șters`,
      variant: 'destructive',
    });
  };

  const totalValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produse</h1>
            <p className="mt-1 text-muted-foreground">
              {products.length} produse • Valoare totală stoc: {totalValue.toFixed(2)} RON
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Adaugă Produs
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Caută produse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Nu am găsit produse
            </p>
            <p className="text-sm text-muted-foreground">
              Încearcă să modifici criteriile de căutare
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Products;
