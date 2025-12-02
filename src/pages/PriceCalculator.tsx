import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Calculator, Package, Wrench } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface OperationItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface CustomProductItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function PriceCalculator() {
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [customProducts, setCustomProducts] = useState<CustomProductItem[]>([]);
  const [discount, setDiscount] = useState(0);

  // Operation handlers
  const addOperation = () => {
    setOperations([
      ...operations,
      { id: crypto.randomUUID(), name: '', quantity: 1, unitPrice: 0 }
    ]);
  };

  const updateOperation = (id: string, field: keyof OperationItem, value: string | number) => {
    setOperations(operations.map(op => 
      op.id === id ? { ...op, [field]: value } : op
    ));
  };

  const removeOperation = (id: string) => {
    setOperations(operations.filter(op => op.id !== id));
  };

  // Custom product handlers
  const addCustomProduct = () => {
    setCustomProducts([
      ...customProducts,
      { id: crypto.randomUUID(), name: '', description: '', quantity: 1, unitPrice: 0 }
    ]);
  };

  const updateCustomProduct = (id: string, field: keyof CustomProductItem, value: string | number) => {
    setCustomProducts(customProducts.map(prod => 
      prod.id === id ? { ...prod, [field]: value } : prod
    ));
  };

  const removeCustomProduct = (id: string) => {
    setCustomProducts(customProducts.filter(prod => prod.id !== id));
  };

  // Calculations
  const operationsTotal = operations.reduce((sum, op) => sum + (op.quantity * op.unitPrice), 0);
  const productsTotal = customProducts.reduce((sum, prod) => sum + (prod.quantity * prod.unitPrice), 0);
  const subtotal = operationsTotal + productsTotal;
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  const clearAll = () => {
    setOperations([]);
    setCustomProducts([]);
    setDiscount(0);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calculator Prețuri</h1>
            <p className="text-muted-foreground">
              Calculează prețuri pentru operațiuni și produse customizate
            </p>
          </div>
          <Button variant="outline" onClick={clearAll}>
            Resetează
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Operations Section */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-brand-teal" />
                Operațiuni
              </CardTitle>
              <Button onClick={addOperation} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Adaugă
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {operations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există operațiuni. Adaugă una folosind butonul de mai sus.
                </p>
              ) : (
                operations.map((op, index) => (
                  <div key={op.id} className="flex gap-3 items-end p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <Label className="text-xs">Denumire operațiune</Label>
                      <Input
                        placeholder="Ex: Tăiere, Gravare, Imprimare..."
                        value={op.name}
                        onChange={(e) => updateOperation(op.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Cantitate</Label>
                      <Input
                        type="number"
                        min="1"
                        value={op.quantity}
                        onChange={(e) => updateOperation(op.id, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Preț unitar (RON)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={op.unitPrice}
                        onChange={(e) => updateOperation(op.id, 'unitPrice', Number(e.target.value))}
                      />
                    </div>
                    <div className="w-28 text-right">
                      <Label className="text-xs">Subtotal</Label>
                      <p className="h-10 flex items-center justify-end font-semibold text-brand-teal">
                        {(op.quantity * op.unitPrice).toFixed(2)} RON
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOperation(op.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
              {operations.length > 0 && (
                <div className="flex justify-end pt-2 border-t">
                  <p className="font-semibold">
                    Total Operațiuni: <span className="text-brand-teal">{operationsTotal.toFixed(2)} RON</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="h-fit sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-brand-orange" />
                Sumar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Operațiuni</span>
                  <span>{operationsTotal.toFixed(2)} RON</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Produse customizate</span>
                  <span>{productsTotal.toFixed(2)} RON</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)} RON</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
                {discount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Reducere: -{discountAmount.toFixed(2)} RON
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-brand-green">{total.toFixed(2)} RON</span>
              </div>

              <Button className="w-full gradient-brand text-white" size="lg">
                Generează Ofertă
              </Button>
            </CardContent>
          </Card>

          {/* Custom Products Section */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-brand-blue" />
                Produse Customizate
              </CardTitle>
              <Button onClick={addCustomProduct} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Adaugă
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {customProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există produse customizate. Adaugă unul folosind butonul de mai sus.
                </p>
              ) : (
                customProducts.map((prod) => (
                  <div key={prod.id} className="p-3 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Denumire produs</Label>
                        <Input
                          placeholder="Ex: Banner personalizat, Tricou imprimat..."
                          value={prod.name}
                          onChange={(e) => updateCustomProduct(prod.id, 'name', e.target.value)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomProduct(prod.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs">Descriere / Specificații</Label>
                      <Input
                        placeholder="Dimensiuni, materiale, culori..."
                        value={prod.description}
                        onChange={(e) => updateCustomProduct(prod.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="w-24">
                        <Label className="text-xs">Cantitate</Label>
                        <Input
                          type="number"
                          min="1"
                          value={prod.quantity}
                          onChange={(e) => updateCustomProduct(prod.id, 'quantity', Number(e.target.value))}
                        />
                      </div>
                      <div className="w-32">
                        <Label className="text-xs">Preț unitar (RON)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={prod.unitPrice}
                          onChange={(e) => updateCustomProduct(prod.id, 'unitPrice', Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1 text-right">
                        <Label className="text-xs">Subtotal</Label>
                        <p className="h-10 flex items-center justify-end font-semibold text-brand-blue">
                          {(prod.quantity * prod.unitPrice).toFixed(2)} RON
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {customProducts.length > 0 && (
                <div className="flex justify-end pt-2 border-t">
                  <p className="font-semibold">
                    Total Produse: <span className="text-brand-blue">{productsTotal.toFixed(2)} RON</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
