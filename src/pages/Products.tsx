import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Package, 
  Plus, 
  ShoppingCart, 
  Edit, 
  Trash2, 
  Loader2,
  ImagePlus,
  TrendingUp,
  DollarSign
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  photo_url: string | null;
  purchase_price_cents: number;
  sale_price_cents: number;
  active: boolean;
}

interface ProductSale {
  id: string;
  product_id: string;
  quantity: number;
  sale_date: string;
  sale_price_snapshot_cents: number;
  purchase_price_snapshot_cents: number;
  product?: Product;
}

const Products = () => {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    photo_url: '',
    purchase_price: '',
    sale_price: '',
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Sales state
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [editingSale, setEditingSale] = useState<ProductSale | null>(null);
  const [saleForm, setSaleForm] = useState({
    product_id: '',
    quantity: '1',
    sale_date: new Date().toISOString().split('T')[0],
    staff_id: '',
  });
  const [savingSale, setSavingSale] = useState(false);

  // Staff state
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    if (currentTenant) {
      loadProducts();
      loadStaff();
    }
  }, [currentTenant]);

  useEffect(() => {
    if (currentTenant) {
      loadSales();
    }
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

  const loadStaff = async () => {
    if (!currentTenant) return;
    const { data } = await supabase
      .from('staff')
      .select('id, name')
      .eq('tenant_id', currentTenant.id)
      .eq('active', true)
      .order('name');
    setStaffList(data || []);
  };

  const loadSales = async () => {
    if (!currentTenant) return;
    try {
      setLoadingSales(true);
      const { data, error } = await supabase
        .from('product_sales')
        .select('*, product:products(*), staff:staff(name)')
        .eq('tenant_id', currentTenant.id)
        .order('sale_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast({ title: "Erro ao carregar vendas", variant: "destructive" });
    } finally {
      setLoadingSales(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenant) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTenant.id}/products/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-media')
        .getPublicUrl(fileName);

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
        photo_url: product.photo_url || '',
        purchase_price: (product.purchase_price_cents / 100).toFixed(2),
        sale_price: (product.sale_price_cents / 100).toFixed(2),
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', photo_url: '', purchase_price: '', sale_price: '' });
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
        photo_url: productForm.photo_url || null,
        purchase_price_cents: purchaseCents,
        sale_price_cents: saleCents,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: "Produto atualizado" });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
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

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Excluir o produto "${product.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', product.id);

      if (error) throw error;
      toast({ title: "Produto excluído" });
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ title: "Erro ao excluir produto", variant: "destructive" });
    }
  };

  const openSaleModal = (sale?: ProductSale) => {
    if (sale) {
      setEditingSale(sale);
      setSaleForm({
        product_id: sale.product_id,
        quantity: sale.quantity.toString(),
        sale_date: sale.sale_date.split('T')[0],
        staff_id: (sale as any).staff_id || '',
      });
    } else {
      setEditingSale(null);
      setSaleForm({
        product_id: '',
        quantity: '1',
        sale_date: new Date().toISOString().split('T')[0],
        staff_id: '',
      });
    }
    setShowSaleModal(true);
  };

  const handleSaveSale = async () => {
    if (!currentTenant || !saleForm.product_id || !saleForm.quantity || !saleForm.sale_date) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const selectedProduct = products.find(p => p.id === saleForm.product_id);
    if (!selectedProduct) {
      toast({ title: "Produto não encontrado", variant: "destructive" });
      return;
    }

    try {
      setSavingSale(true);
      const quantity = parseInt(saleForm.quantity);

      if (quantity <= 0) {
        toast({ title: "Quantidade deve ser maior que zero", variant: "destructive" });
        return;
      }

      const saleData = {
        tenant_id: currentTenant.id,
        product_id: saleForm.product_id,
        quantity,
        sale_date: new Date(saleForm.sale_date + 'T12:00:00').toISOString(),
        sale_price_snapshot_cents: selectedProduct.sale_price_cents,
        purchase_price_snapshot_cents: selectedProduct.purchase_price_cents,
        staff_id: saleForm.staff_id || null,
      };

      if (editingSale) {
        const { error } = await supabase
          .from('product_sales')
          .update(saleData)
          .eq('id', editingSale.id);
        if (error) throw error;
        toast({ title: "Venda atualizada" });
      } else {
        const { error } = await supabase
          .from('product_sales')
          .insert(saleData);
        if (error) throw error;
        toast({ title: "Venda registrada" });
      }

      setShowSaleModal(false);
      loadSales();
    } catch (error) {
      console.error('Error saving sale:', error);
      toast({ title: "Erro ao salvar venda", variant: "destructive" });
    } finally {
      setSavingSale(false);
    }
  };

  const handleDeleteSale = async (sale: ProductSale) => {
    if (!window.confirm('Excluir esta venda?')) return;

    try {
      const { error } = await supabase
        .from('product_sales')
        .delete()
        .eq('id', sale.id);

      if (error) throw error;
      toast({ title: "Venda excluída" });
      loadSales();
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({ title: "Erro ao excluir venda", variant: "destructive" });
    }
  };

  const calculateProfit = (purchaseCents: number, saleCents: number) => {
    return saleCents - purchaseCents;
  };

  const totalSalesRevenue = sales.reduce((sum, sale) => 
    sum + (sale.sale_price_snapshot_cents * sale.quantity), 0);
  
  const totalSalesProfit = sales.reduce((sum, sale) => 
    sum + ((sale.sale_price_snapshot_cents - sale.purchase_price_snapshot_cents) * sale.quantity), 0);

  if (tenantLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Produtos</h1>
        <p className="text-sm text-muted-foreground">Gerencie produtos e vendas</p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/50">
          <TabsTrigger value="products" className="data-[state=active]:bg-zinc-800">
            <Package className="h-4 w-4 mr-2" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-zinc-800">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Vendas
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => openProductModal()} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950">
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>

          {loadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
              <Package className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
              <h3 className="font-medium text-zinc-300 mb-2">Nenhum produto cadastrado</h3>
              <p className="text-sm text-zinc-500">Cadastre produtos para começar a vender.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const profit = calculateProfit(product.purchase_price_cents, product.sale_price_cents);
                return (
                  <div key={product.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
                    <div className="aspect-video bg-zinc-800 relative">
                      {product.photo_url ? (
                        <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-zinc-100 mb-2">{product.name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-zinc-400">
                          <span>Custo:</span>
                          <span>R$ {(product.purchase_price_cents / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Venda:</span>
                          <span className="font-medium">R$ {(product.sale_price_cents / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 pt-1 border-t border-zinc-800">
                          <span>Lucro:</span>
                          <span className="font-semibold">R$ {(profit / 100).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="ghost" size="sm" onClick={() => openProductModal(product)} className="flex-1 text-zinc-400 hover:text-zinc-100">
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Receita de Produtos</p>
                  <p className="text-xl font-bold text-zinc-100">R$ {(totalSalesRevenue / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Lucro de Produtos</p>
                  <p className="text-xl font-bold text-emerald-400">R$ {(totalSalesProfit / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => openSaleModal()} disabled={products.length === 0} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Venda
            </Button>
          </div>

          {loadingSales ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
              <ShoppingCart className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
              <h3 className="font-medium text-zinc-300 mb-2">Nenhuma venda no período</h3>
              <p className="text-sm text-zinc-500">Registre vendas para ver o histórico aqui.</p>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-800/50 border-b border-zinc-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Produto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Profissional</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400">Qtd</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Lucro</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {sales.map((sale) => {
                      const total = sale.sale_price_snapshot_cents * sale.quantity;
                      const profit = (sale.sale_price_snapshot_cents - sale.purchase_price_snapshot_cents) * sale.quantity;
                      const saleDate = new Date(sale.sale_date);
                      return (
                        <tr key={sale.id} className="hover:bg-zinc-800/30">
                          <td className="px-4 py-3 text-sm text-zinc-300">
                            {saleDate.toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-100 font-medium">
                            {sale.product?.name || 'Produto'}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-300">
                            {(sale as any).staff?.name || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-300 text-center">
                            {sale.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-100 text-right font-medium">
                            R$ {(total / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-emerald-400 text-right font-medium">
                            R$ {(profit / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openSaleModal(sale)} className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteSale(sale)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Foto do Produto</label>
              <div className="flex items-center gap-4">
                {productForm.photo_url ? (
                  <img src={productForm.photo_url} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-20 h-20 bg-zinc-800 rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-zinc-600" />
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
              <label className="block text-sm text-zinc-400 mb-2">Nome do Produto *</label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Pomada Modeladora"
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Valor de Compra *</label>
                <CurrencyInput
                  value={productForm.purchase_price}
                  onChange={(v) => setProductForm(prev => ({ ...prev, purchase_price: v }))}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Valor de Venda *</label>
                <CurrencyInput
                  value={productForm.sale_price}
                  onChange={(v) => setProductForm(prev => ({ ...prev, sale_price: v }))}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            </div>

            {productForm.purchase_price && productForm.sale_price && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm text-emerald-400">
                  <strong>Lucro por unidade:</strong> R$ {(parseFloat(productForm.sale_price || '0') - parseFloat(productForm.purchase_price || '0')).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowProductModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveProduct} disabled={savingProduct} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950">
              {savingProduct ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingProduct ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Modal */}
      <Dialog open={showSaleModal} onOpenChange={setShowSaleModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {editingSale ? 'Editar Venda' : 'Registrar Venda'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Produto *</label>
              <Select
                value={saleForm.product_id}
                onValueChange={(value) => setSaleForm(prev => ({ ...prev, product_id: value }))}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - R$ {(product.sale_price_cents / 100).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Profissional que vendeu</label>
              <Select
                value={saleForm.staff_id}
                onValueChange={(value) => setSaleForm(prev => ({ ...prev, staff_id: value }))}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Quantidade *</label>
                <Input
                  type="number"
                  min="1"
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Data da Venda *</label>
                <Input
                  type="date"
                  value={saleForm.sale_date}
                  onChange={(e) => setSaleForm(prev => ({ ...prev, sale_date: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            </div>

            {saleForm.product_id && saleForm.quantity && (
              <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-1">
                {(() => {
                  const product = products.find(p => p.id === saleForm.product_id);
                  if (!product) return null;
                  const qty = parseInt(saleForm.quantity) || 0;
                  const total = (product.sale_price_cents * qty) / 100;
                  const profit = ((product.sale_price_cents - product.purchase_price_cents) * qty) / 100;
                  return (
                    <>
                      <p className="text-sm text-zinc-300">
                        <strong>Total:</strong> R$ {total.toFixed(2)}
                      </p>
                      <p className="text-sm text-emerald-400">
                        <strong>Lucro:</strong> R$ {profit.toFixed(2)}
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaleModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveSale} disabled={savingSale} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950">
              {savingSale ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingSale ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
