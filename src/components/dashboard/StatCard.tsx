import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'teal' | 'orange' | 'green';
}

const colorClasses = {
  blue: 'bg-brand-blue/10 text-brand-blue',
  teal: 'bg-brand-teal/10 text-brand-teal',
  orange: 'bg-brand-orange/10 text-brand-orange',
  green: 'bg-brand-green/10 text-brand-green',
};

const borderColors = {
  blue: 'border-l-brand-blue',
  teal: 'border-l-brand-teal',
  orange: 'border-l-brand-orange',
  green: 'border-l-brand-green',
};

export function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  return (
    <div className={cn(
      'stat-card border-l-4 shadow-md',
      borderColors[color]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={cn(
              'mt-1 text-sm font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}% față de luna trecută
            </p>
          )}
        </div>
        <div className={cn('rounded-xl p-3', colorClasses[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
