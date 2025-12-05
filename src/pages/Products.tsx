import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductEditDialog } from '@/components/products/ProductEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { products as initialProducts } from '@/data/mockData';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const filteredProducts = productsList.filter(
    (prod) =>
      prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNew = () => {
    setSelectedProduct(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleSave = (product: Product) => {
    if (selectedProduct) {
      // Edit existing
      setProductsList((prev) =>
        prev.map((p) => (p.id === product.id ? product : p))
      );
      toast({
        title: 'Produs actualizat',
        description: `${product.name} a fost actualizat cu succes`,
      });
    } else {
      // Add new
      setProductsList((prev) => [...prev, product]);
      toast({
        title: 'Produs adăugat',
        description: `${product.name} a fost adăugat în stoc`,
      });
    }
    setEditDialogOpen(false);
    setSelectedProduct(null);
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      setProductsList((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      toast({
        title: 'Produs șters',
        description: `${selectedProduct.name} a fost șters din stoc`,
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const totalValue = productsList.reduce((acc, p) => acc + p.price * p.stock, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produse stoc</h1>
            <p className="mt-1 text-muted-foreground">
              {productsList.length} produse • Valoare totală stoc: {totalValue.toFixed(2)} RON
            </p>
          </div>
          <Button className="gap-2" onClick={handleAddNew}>
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

      {/* Edit/Add Dialog */}
      <ProductEditDialog
        product={selectedProduct}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare ștergere</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi produsul "{selectedProduct?.name}"? 
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Products;
