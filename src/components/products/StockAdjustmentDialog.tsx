import { useState } from 'react';
import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Minus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StockAdjustmentDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStockUpdated: () => void;
}

export function StockAdjustmentDialog({
  product,
  open,
  onOpenChange,
  onStockUpdated,
}: StockAdjustmentDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const { toast } = useToast();

  const handleAdjust = async () => {
    if (!product || quantity <= 0) return;

    const adjustmentQty = activeTab === 'add' ? quantity : -quantity;
    const newStock = product.stock + adjustmentQty;

    if (newStock < 0) {
      toast({
        title: 'Eroare',
        description: 'Stocul nu poate fi negativ',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', product.id);

      if (updateError) throw updateError;

      // Record stock movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: product.id,
          quantity: adjustmentQty,
          movement_type: activeTab === 'add' ? 'manual_add' : 'manual_remove',
          reason: reason || (activeTab === 'add' ? 'Adăugare manuală în stoc' : 'Scoatere manuală din stoc'),
        });

      if (movementError) throw movementError;

      toast({
        title: activeTab === 'add' ? 'Stoc adăugat' : 'Stoc scăzut',
        description: `${quantity} buc. ${activeTab === 'add' ? 'adăugate în' : 'scoase din'} stoc pentru ${product.name}`,
      });

      onStockUpdated();
      onOpenChange(false);
      setQuantity(1);
      setReason('');
    } catch (error: any) {
      console.error('Stock adjustment error:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu am putut actualiza stocul',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Ajustare stoc: {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-sm text-muted-foreground">Stoc curent</p>
            <p className="text-3xl font-bold text-foreground">{product.stock}</p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'add' | 'remove')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add" className="gap-2">
                <Plus className="h-4 w-4" />
                Adaugă în stoc
              </TabsTrigger>
              <TabsTrigger value="remove" className="gap-2">
                <Minus className="h-4 w-4" />
                Scoate din stoc
              </TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Cantitate de adăugat</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </TabsContent>

            <TabsContent value="remove" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Cantitate de scos</Label>
                <Input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                />
                {quantity > product.stock && (
                  <p className="text-sm text-destructive">Cantitatea depășește stocul disponibil</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Motiv / Explicație {activeTab === 'remove' && <span className="text-destructive">*</span>}</Label>
            <Textarea
              placeholder={activeTab === 'add' 
                ? 'Ex: Aprovizionare furnizor, Retur client...' 
                : 'Ex: Folosit pentru proiect intern, Produs deteriorat...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-sm text-muted-foreground">Stoc după ajustare</p>
            <p className={`text-2xl font-bold ${activeTab === 'add' ? 'text-green-600' : 'text-orange-600'}`}>
              {product.stock + (activeTab === 'add' ? quantity : -quantity)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button 
            onClick={handleAdjust} 
            disabled={isLoading || (activeTab === 'remove' && !reason.trim())}
            className={activeTab === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {activeTab === 'add' ? 'Adaugă' : 'Scoate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}