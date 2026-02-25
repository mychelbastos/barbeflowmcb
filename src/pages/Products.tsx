import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  ImagePlus,
  Sparkles,
} from "lucide-react";
import { AiGenerateImageButton, AiTextButton } from "@/components/AiContentButtons";

interface Product {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  purchase_price_cents: number;
  sale_price_cents: number;
  active: boolean;
}

const Products = () => {
  usePageTitle("Produtos");
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    photo_url: '',
    purchase_price: '',
    sale_price: '',
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [enhancingProductId, setEnhancingProductId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  useEffect(() => {
    if (currentTenant) loadProducts();
  }, [currentTenant]);

  const loadProducts = async () => {
    if (!currentTenant) return;
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({ title: "Erro ao carregar produtos", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenant) return;
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTenant.id}/products/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('tenant-media').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('tenant-media').getPublicUrl(fileName);
      setProductForm(prev => ({ ...prev, photo_url: publicUrl }));
      toast({ title: "Imagem enviada com sucesso" });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        photo_url: product.photo_url || '',
        purchase_price: (product.purchase_price_cents / 100).toFixed(2),
        sale_price: (product.sale_price_cents / 100).toFixed(2),
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', description: '', photo_url: '', purchase_price: '', sale_price: '' });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!currentTenant || !productForm.name || !productForm.purchase_price || !productForm.sale_price) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      setSavingProduct(true);
      const purchaseCents = Math.round(parseFloat(productForm.purchase_price) * 100);
      const saleCents = Math.round(parseFloat(productForm.sale_price) * 100);
      if (purchaseCents < 0 || saleCents < 0) {
        toast({ title: "Valores não podem ser negativos", variant: "destructive" });
        return;
      }
      const productData = {
        tenant_id: currentTenant.id,
        name: productForm.name,
        description: productForm.description || null,
        photo_url: productForm.photo_url || null,
        purchase_price_cents: purchaseCents,
        sale_price_cents: saleCents,
      };
      if (editingProduct) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: "Produto atualizado" });
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
        toast({ title: "Produto cadastrado" });
      }
      setShowProductModal(false);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({ title: "Erro ao salvar produto", variant: "destructive" });
    } finally {
      setSavingProduct(false);
    }
  };

  const executeDeleteProduct = async (product: Product) => {
    try {
      const { error } = await supabase.from('products').update({ active: false }).eq('id', product.id);
      if (error) throw error;
      toast({ title: "Produto excluído" });
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ title: "Erro ao excluir produto", variant: "destructive" });
    }
  };

  const handleEnhanceImage = async (product: Product) => {
    if (!product.photo_url) {
      toast({ title: "Adicione uma foto primeiro", variant: "destructive" });
      return;
    }
    try {
      setEnhancingProductId(product.id);
      toast({ title: "✨ Melhorando imagem com IA...", description: "Isso pode levar alguns segundos" });
      const { data, error } = await supabase.functions.invoke('enhance-product-image', {
        body: { product_id: product.id, image_url: product.photo_url },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Imagem melhorada com sucesso! ✨" });
      loadProducts();
    } catch (err) {
      console.error('Enhance error:', err);
      toast({ title: "Erro ao melhorar imagem", variant: "destructive" });
    } finally {
      setEnhancingProductId(null);
    }
  };

  const calculateProfit = (purchaseCents: number, saleCents: number) => saleCents - purchaseCents;

  if (tenantLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus produtos. Vendas são registradas pelo Caixa.</p>
        </div>
        <Button onClick={() => openProductModal()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {loadingProducts ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 border border-border rounded-xl">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-foreground mb-2">Nenhum produto cadastrado</h3>
          <p className="text-sm text-muted-foreground">Cadastre produtos para começar a vender pelo Caixa.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const profit = calculateProfit(product.purchase_price_cents, product.sale_price_cents);
            return (
              <div key={product.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  {product.photo_url ? (
                    <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-foreground mb-2">{product.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Custo:</span>
                      <span>R$ {(product.purchase_price_cents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-foreground">
                      <span>Venda:</span>
                      <span className="font-medium">R$ {(product.sale_price_cents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-primary pt-1 border-t border-border">
                      <span>Lucro:</span>
                      <span className="font-semibold">R$ {(profit / 100).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <AiGenerateImageButton
                      table="products"
                      itemId={product.id}
                      hasImage={!!product.photo_url}
                      onGenerated={loadProducts}
                    />
                    {product.photo_url && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEnhanceImage(product)} 
                        disabled={enhancingProductId === product.id}
                        className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                        title="Melhorar imagem com IA"
                      >
                        {enhancingProductId === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openProductModal(product)} className="flex-1 text-muted-foreground hover:text-foreground">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(product)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Foto do Produto</label>
              <div className="flex items-center gap-4">
                {productForm.photo_url ? (
                  <img src={productForm.photo_url} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingImage} asChild>
                    <span>
                      {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                      {uploadingImage ? 'Enviando...' : 'Enviar Foto'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-muted-foreground">Nome do Produto *</label>
                <AiTextButton
                  table="products"
                  currentName={productForm.name}
                  currentDescription={productForm.description}
                  onResult={(title, desc) => setProductForm(prev => ({ ...prev, name: title, description: desc }))}
                />
              </div>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Pomada Modeladora"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Descrição</label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do produto para exibição na página de agendamento"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Valor de Compra *</label>
                <CurrencyInput
                  value={productForm.purchase_price}
                  onChange={(v) => setProductForm(prev => ({ ...prev, purchase_price: v }))}
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Valor de Venda *</label>
                <CurrencyInput
                  value={productForm.sale_price}
                  onChange={(v) => setProductForm(prev => ({ ...prev, sale_price: v }))}
                />
              </div>
            </div>
            {productForm.purchase_price && productForm.sale_price && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm text-primary">
                  <strong>Lucro por unidade:</strong> R$ {(parseFloat(productForm.sale_price || '0') - parseFloat(productForm.purchase_price || '0')).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowProductModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveProduct} disabled={savingProduct} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {savingProduct ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingProduct ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir o produto "{confirmDelete?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (confirmDelete) executeDeleteProduct(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
