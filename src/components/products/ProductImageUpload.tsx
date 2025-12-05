import { useState, useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductImageUploadProps {
  currentImage?: string;
  onImageChange: (url: string | undefined) => void;
}

export function ProductImageUpload({ currentImage, onImageChange }: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Eroare',
        description: 'Te rog selectează un fișier imagine',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Eroare',
        description: 'Imaginea trebuie să fie mai mică de 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      onImageChange(publicUrl);
      toast({
        title: 'Succes',
        description: 'Imaginea a fost încărcată',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Eroare la încărcare',
        description: error.message || 'Nu am putut încărca imaginea',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    onImageChange(undefined);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-32 w-32 rounded-lg border-2 border-dashed border-border bg-muted/50 overflow-hidden">
        {currentImage ? (
          <>
            <img
              src={currentImage}
              alt="Product"
              className="h-full w-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
              onClick={handleRemoveImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
            <Camera className="h-8 w-8 mb-1" />
            <span className="text-xs">Adaugă imagine</span>
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Se încarcă...
          </>
        ) : (
          <>
            <Camera className="mr-2 h-3 w-3" />
            {currentImage ? 'Schimbă imaginea' : 'Încarcă imagine'}
          </>
        )}
      </Button>
    </div>
  );
}