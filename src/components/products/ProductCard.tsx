import { Product } from '@/types';
import { Package, MoreVertical, TrendingUp, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const isLowStock = product.stock < 100;

  return (
    <div className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            <Package className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{product.name}</h3>
            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(product)}>
              Editează
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete?.(product)}
              className="text-destructive"
            >
              Șterge
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
        {product.description}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-2xl font-bold text-primary">
          {product.price.toFixed(2)} <span className="text-sm font-normal">RON</span>
        </div>
        <Badge variant="secondary">{product.category}</Badge>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div className={cn(
          'flex items-center gap-1 text-sm font-medium',
          isLowStock ? 'text-accent' : 'text-success'
        )}>
          {isLowStock ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          <span>{product.stock} în stoc</span>
        </div>
        <Badge 
          variant={product.status === 'active' ? 'default' : 'outline'}
          className={product.status === 'active' ? 'bg-success text-success-foreground' : ''}
        >
          {product.status === 'active' ? 'Activ' : product.status === 'inactive' ? 'Inactiv' : 'Discontinuat'}
        </Badge>
      </div>
    </div>
  );
}
