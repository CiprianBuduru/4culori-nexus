import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  queryKeys?: string[];
  onRefresh?: () => Promise<void> | void;
  className?: string;
  showLabel?: boolean;
}

export function RefreshButton({ 
  queryKeys, 
  onRefresh, 
  className,
  showLabel = false 
}: RefreshButtonProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      
      if (queryKeys && queryKeys.length > 0) {
        await Promise.all(
          queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
        );
      } else {
        // Refresh all queries if no specific keys provided
        await queryClient.invalidateQueries();
      }
      
      toast({
        title: 'Date actualizate',
        description: 'Datele au fost reîncărcate cu succes',
      });
    } catch (error) {
      toast({
        title: 'Eroare la actualizare',
        description: 'Nu s-au putut reîncărca datele. Încearcă din nou.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size={showLabel ? "default" : "icon"}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn("gap-2", className)}
      title="Reîncarcă datele"
    >
      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
      {showLabel && (isRefreshing ? 'Se încarcă...' : 'Actualizează')}
    </Button>
  );
}
