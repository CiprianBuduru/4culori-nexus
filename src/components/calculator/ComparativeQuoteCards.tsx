import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Crown, Sparkles, ShieldCheck, ArrowRight, Layers } from 'lucide-react';
import { type ComparativeVariant, type ComparativeQuoteState, type VariantTier, VARIANT_META } from '@/types/comparativeQuote';
import { buildClientSpecs } from '@/lib/quoteItemSpecs';

interface ComparativeQuoteCardsProps {
  state: ComparativeQuoteState;
  onSelectVariant: (variant: ComparativeVariant) => void;
  onAddAllVariants: () => void;
}

const TIER_STYLES: Record<VariantTier, {
  border: string;
  badge: string;
  icon: React.ReactNode;
  highlight: boolean;
}> = {
  economica: {
    border: 'border-emerald-300 dark:border-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: <ShieldCheck className="h-4 w-4" />,
    highlight: false,
  },
  recomandata: {
    border: 'border-primary ring-2 ring-primary/20',
    badge: 'bg-primary/10 text-primary',
    icon: <Crown className="h-4 w-4" />,
    highlight: true,
  },
  premium: {
    border: 'border-amber-300 dark:border-amber-700',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: <Sparkles className="h-4 w-4" />,
    highlight: false,
  },
};

export function ComparativeQuoteCards({
  state,
  onSelectVariant,
  onAddAllVariants,
}: ComparativeQuoteCardsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Ofertă comparativă — {state.productName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {state.quantity} bucăți • 3 variante comerciale
          </p>
        </div>
        <Button onClick={onAddAllVariants} variant="outline" className="gap-2">
          <Layers className="h-4 w-4" />
          Generează ofertă comparativă completă
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {state.variants.map((variant) => (
          <VariantCard
            key={variant.tier}
            variant={variant}
            onSelect={() => onSelectVariant(variant)}
          />
        ))}
      </div>
    </div>
  );
}

function VariantCard({
  variant,
  onSelect,
}: {
  variant: ComparativeVariant;
  onSelect: () => void;
}) {
  const style = TIER_STYLES[variant.tier];
  const meta = VARIANT_META[variant.tier];
  const specs = buildClientSpecs(variant.configSnapshot);

  return (
    <Card className={`relative ${style.border} transition-shadow hover:shadow-md`}>
      {style.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground shadow-sm text-xs px-3">
            <Crown className="h-3 w-3 mr-1" />
            Recomandată
          </Badge>
        </div>
      )}

      <CardContent className={`pt-6 space-y-4 ${style.highlight ? 'pt-8' : ''}`}>
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-xs ${style.badge}`}>
              {style.icon}
              <span className="ml-1">{meta.label}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground italic">{meta.description}</p>
        </div>

        {/* Product name */}
        <div className="font-semibold text-sm">{variant.productName}</div>

        {/* Specs */}
        <div className="space-y-1.5">
          <SpecRow label="Tiraj" value={`${variant.quantity} buc`} />
          {specs.map((s) => (
            <SpecRow
              key={s.label}
              label={s.label}
              value={s.value}
              source={variant.sources[s.label.toLowerCase()] ?? undefined}
            />
          ))}
        </div>

        <Separator />

        {/* Pricing */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Preț / bucată</span>
            <span className="font-medium">{variant.unitPrice.toFixed(4)} €</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className={style.highlight ? 'text-primary' : ''}>
              {variant.totalPrice.toFixed(2)} € + TVA
            </span>
          </div>
        </div>

        {/* Action */}
        <Button
          onClick={onSelect}
          className="w-full gap-2"
          variant={style.highlight ? 'default' : 'outline'}
          size="sm"
        >
          <Check className="h-4 w-4" />
          Alege această variantă
        </Button>
      </CardContent>
    </Card>
  );
}

function SpecRow({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source?: 'brief' | 'default' | 'variant-rule';
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="font-medium">{value}</span>
        {source === 'variant-rule' && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">var</span>
        )}
        {source === 'default' && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">std</span>
        )}
      </div>
    </div>
  );
}
