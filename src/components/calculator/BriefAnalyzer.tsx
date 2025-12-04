import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Plus, AlertCircle, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecipeSuggestion {
  recipeId: string;
  recipeName: string;
  quantity: number;
  confidence: number;
  reasoning: string;
  recipe: {
    id: string;
    name: string;
    description: string;
    base_price: number;
    price_per_unit: number;
    materials: any;
    services: any;
  };
}

interface BriefAnalyzerProps {
  onAddSuggestion: (suggestion: RecipeSuggestion) => void;
}

export function BriefAnalyzer({ onAddSuggestion }: BriefAnalyzerProps) {
  const [brief, setBrief] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [notes, setNotes] = useState('');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const analyzeBrief = async () => {
    if (!brief.trim()) {
      toast.error('Introduceți un brief pentru analiză');
      return;
    }

    setIsAnalyzing(true);
    setSuggestions([]);
    setNotes('');

    try {
      const { data, error } = await supabase.functions.invoke('analyze-brief', {
        body: { brief }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSuggestions(data.suggestions || []);
      setNotes(data.notes || '');
      setHasAnalyzed(true);

      if (data.suggestions?.length === 0) {
        toast.info(data.message || 'Nu am găsit rețete potrivite pentru acest brief');
      } else {
        toast.success(`Am găsit ${data.suggestions.length} rețete potrivite`);
      }
    } catch (error) {
      console.error('Error analyzing brief:', error);
      toast.error('Eroare la analiza brief-ului');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500/20 text-green-700 border-green-500/30';
    if (confidence >= 60) return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
  };

  return (
    <Card className="border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-brand-blue" />
          Analiză AI Brief
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Introduceți brief-ul comenzii aici... (ex: 500 flyere A5 color față-verso, 100 cărți de vizită cu folio auriu, banner 3x1m pentru exterior)"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            className="min-h-[100px] resize-none"
          />
          <Button 
            onClick={analyzeBrief} 
            disabled={isAnalyzing || !brief.trim()}
            className="w-full gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizez...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analizează Brief
              </>
            )}
          </Button>
        </div>

        {/* AI Notes */}
        {notes && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <Lightbulb className="h-4 w-4 mt-0.5 text-brand-orange flex-shrink-0" />
            <p className="text-sm text-muted-foreground">{notes}</p>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Rețete sugerate:</h4>
            {suggestions.map((suggestion, index) => (
              <div 
                key={`${suggestion.recipeId}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{suggestion.recipeName}</span>
                    <Badge variant="outline" className={getConfidenceColor(suggestion.confidence)}>
                      {suggestion.confidence}% potrivire
                    </Badge>
                    <Badge variant="secondary">
                      {suggestion.quantity} buc
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {suggestion.reasoning}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-2 flex-shrink-0"
                  onClick={() => onAddSuggestion(suggestion)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {hasAnalyzed && suggestions.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-muted-foreground">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">
              Nu am găsit rețete potrivite. Verificați dacă aveți rețete definite în Setări sau selectați manual din lista de mai jos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
