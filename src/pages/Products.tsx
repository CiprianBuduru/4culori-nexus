import { useState, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductEditDialog } from '@/components/products/ProductEditDialog';
import { StockAdjustmentDialog } from '@/components/products/StockAdjustmentDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, Download, Upload, Filter } from 'lucide-react';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const CATEGORIES = ['Papetărie', 'Hârtie', 'Artă', 'Textile', 'Ambalaje', 'Consumabile', 'Altele'];
const STATUSES = [
  { value: 'active', label: 'Activ' },
  { value: 'inactive', label: 'Inactiv' },
  { value: 'discontinued', label: 'Discontinuat' },
];

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stockAdjustDialogOpen, setStockAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { products, isLoading, addProduct, updateProduct, deleteProduct, refetch } = useProducts();

  // Get unique categories from products
  const availableCategories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || prod.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || prod.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleExport = () => {
    const exportData = products.map((p) => ({
      id: p.id,
      nume: p.name,
      sku: p.sku,
      descriere: p.description || '',
      pret: p.price,
      stoc: p.stock,
      categorie: p.category,
      status: p.status,
      imagine: p.image || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 36 }, // id
      { wch: 30 }, // nume
      { wch: 15 }, // sku
      { wch: 40 }, // descriere
      { wch: 10 }, // pret
      { wch: 10 }, // stoc
      { wch: 15 }, // categorie
      { wch: 12 }, // status
      { wch: 50 }, // imagine
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produse');
    XLSX.writeFile(wb, `produse_stoc_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Export reușit',
      description: `${products.length} produse exportate în Excel`,
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      let updated = 0;
      let added = 0;
      let errors = 0;

      for (const row of jsonData) {
        try {
          const productData = {
            name: row.nume || row.name || '',
            sku: row.sku || '',
            description: row.descriere || row.description || '',
            price: Number(row.pret || row.price || 0),
            stock: Number(row.stoc || row.stock || 0),
            category: row.categorie || row.category || 'Altele',
            status: (row.status || 'active') as Product['status'],
            image: row.imagine || row.image || undefined,
          };

          if (!productData.name || !productData.sku) {
            errors++;
            continue;
          }

          // Check if product exists by id or sku
          const existingById = row.id ? products.find((p) => p.id === row.id) : null;
          const existingBySku = products.find((p) => p.sku === productData.sku);

          if (existingById) {
            await updateProduct({ ...productData, id: row.id });
            updated++;
          } else if (existingBySku) {
            await updateProduct({ ...productData, id: existingBySku.id });
            updated++;
          } else {
            await addProduct(productData);
            added++;
          }
        } catch (err) {
          console.error('Error processing row:', err);
          errors++;
        }
      }

      await refetch();

      toast({
        title: 'Import finalizat',
        description: `${added} adăugate, ${updated} actualizate${errors > 0 ? `, ${errors} erori` : ''}`,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Eroare la import',
        description: error.message || 'Nu am putut importa fișierul',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

  const handleSave = async (product: Product) => {
    setIsSaving(true);
    try {
      if (selectedProduct) {
        await updateProduct(product);
        toast({
          title: 'Produs actualizat',
          description: `${product.name} a fost actualizat cu succes`,
        });
      } else {
        await addProduct(product);
        toast({
          title: 'Produs adăugat',
          description: `${product.name} a fost adăugat în stoc`,
        });
      }
      setEditDialogOpen(false);
      setSelectedProduct(null);
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: error.message || 'Nu am putut salva produsul',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (selectedProduct) {
      try {
        await deleteProduct(selectedProduct.id);
        toast({
          title: 'Produs șters',
          description: `${selectedProduct.name} a fost șters din stoc`,
          variant: 'destructive',
        });
        setDeleteDialogOpen(false);
        setSelectedProduct(null);
      } catch (error: any) {
        toast({
          title: 'Eroare',
          description: error.message || 'Nu am putut șterge produsul',
          variant: 'destructive',
        });
      }
    }
  };

  const totalValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produse stoc</h1>
            <p className="mt-1 text-muted-foreground">
              {products.length} produse • Valoare totală stoc: {totalValue.toFixed(2)} €
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={products.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button className="gap-2" onClick={handleAddNew}>
              <Plus className="h-4 w-4" />
              Adaugă Produs
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Caută produse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] bg-background">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Toate categoriile</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Toate</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filters indicator */}
        {(categoryFilter !== 'all' || statusFilter !== 'all') && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Filtre active:</span>
            {categoryFilter !== 'all' && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                {categoryFilter}
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                {STATUSES.find((s) => s.value === statusFilter)?.label}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
            >
              Resetează
            </Button>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStockAdjust={(p) => {
                setSelectedProduct(p);
                setStockAdjustDialogOpen(true);
              }}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              {products.length === 0 ? 'Nu există produse în stoc' : 'Nu am găsit produse'}
            </p>
            <p className="text-sm text-muted-foreground">
              {products.length === 0
                ? 'Adaugă primul produs folosind butonul de mai sus'
                : 'Încearcă să modifici criteriile de căutare'}
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
        isLoading={isSaving}
      />

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        product={selectedProduct}
        open={stockAdjustDialogOpen}
        onOpenChange={setStockAdjustDialogOpen}
        onStockUpdated={refetch}
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