import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessSetup } from "@/hooks/useBusinessSetup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  BarChart3, 
  AlertTriangle, 
  TrendingUp,
  DollarSign,
  Award,
  Package2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ProductAnalyticsCard } from "@/components/products/ProductAnalyticsCard";
import { InventoryManagement } from "@/components/products/InventoryManagement";

interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  supplier: string | null;
  cost_price: number | null;
  retail_price: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Products() {
  const { user } = useAuth();
  const { businessData } = useBusinessSetup();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    supplier: "",
    cost_price: "",
    retail_price: "",
    description: "",
    is_active: true,
  });

  const categories = ["Electronics", "Clothing", "Beauty", "Health", "Home", "Sports", "Books", "Food", "Other"];

  useEffect(() => {
    if (businessData?.id) {
      fetchProducts();
      if (activeTab === "analytics") {
        fetchAnalytics();
      }
    }
  }, [businessData, activeTab]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", businessData?.id)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!businessData?.id) return;
    
    setAnalyticsLoading(true);
    try {
      // Get product analytics
      const { data: analyticsData, error: analyticsError } = await supabase.rpc("get_product_analytics", {
        business_uuid: businessData.id,
      });

      if (analyticsError) throw analyticsError;
      setAnalyticsData(analyticsData || []);

      // Get top products by revenue
      const { data: topProductsData, error: topProductsError } = await supabase.rpc("get_top_products", {
        business_uuid: businessData.id,
        metric: 'revenue',
        limit_count: 5,
      });

      if (topProductsError) throw topProductsError;
      setTopProducts(topProductsData || []);

      // Get inventory alerts
      const { data: alertsData, error: alertsError } = await supabase.rpc("get_inventory_alerts", {
        business_uuid: businessData.id,
      });

      if (alertsError) throw alertsError;
      setInventoryAlerts(alertsData || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load product analytics",
        variant: "destructive",
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessData?.id) return;

    try {
      const productData = {
        name: formData.name,
        sku: formData.sku || null,
        category: formData.category || null,
        supplier: formData.supplier || null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (selectedProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", selectedProduct.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("products")
          .insert([
            {
              ...productData,
              business_id: businessData.id,
            },
          ]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Product created successfully",
        });
      }

      setIsDialogOpen(false);
      setSelectedProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      category: product.category || "",
      supplier: product.supplier || "",
      cost_price: product.cost_price?.toString() || "",
      retail_price: product.retail_price?.toString() || "",
      description: product.description || "",
      is_active: product.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      category: "",
      supplier: "",
      cost_price: "",
      retail_price: "",
      description: "",
      is_active: true,
    });
  };

  const maxRevenue = Math.max(...analyticsData.map(product => product.total_sales_revenue), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Inventory & Management</h1>
          <p className="text-muted-foreground">Manage your product catalog, inventory, and analytics</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedProduct(null);
              resetForm();
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {selectedProduct ? "Update product information" : "Add a new product to your catalog"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost_price">Cost Price ($)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="retail_price">Retail Price ($)</Label>
                  <Input
                    id="retail_price"
                    type="number"
                    step="0.01"
                    value={formData.retail_price}
                    onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional product description"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <Button type="submit" className="w-full">
                {selectedProduct ? "Update Product" : "Create Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Catalog
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            Inventory Management
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-6">
          {products.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground">Add your first product to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {product.name}
                          {!product.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </CardTitle>
                        {product.category && (
                          <CardDescription>{product.category}</CardDescription>
                        )}
                        {product.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {product.supplier && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Supplier: </span>
                        <span>{product.supplier}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {product.cost_price && (
                        <div>
                          <span className="text-muted-foreground">Cost: </span>
                          <span className="font-medium">${product.cost_price}</span>
                        </div>
                      )}
                      {product.retail_price && (
                        <div>
                          <span className="text-muted-foreground">Price: </span>
                          <span className="font-medium">${product.retail_price}</span>
                        </div>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          {businessData?.id ? (
            <InventoryManagement businessId={businessData.id} />
          ) : (
            <div>Loading business data...</div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">Loading analytics...</div>
          ) : analyticsData.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No analytics data yet</h3>
                <p className="text-muted-foreground">Make some sales to see product performance metrics</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">
                          ${analyticsData.reduce((sum, product) => sum + product.total_sales_revenue, 0).toFixed(2)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Products</p>
                        <p className="text-2xl font-bold">{products.filter(p => p.is_active).length}</p>
                      </div>
                      <Package className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Low Stock Alerts</p>
                        <p className="text-2xl font-bold">{inventoryAlerts.length}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Avg Profit Margin</p>
                        <p className="text-2xl font-bold">
                          {(analyticsData.reduce((sum, p) => sum + p.profit_margin, 0) / 
                            Math.max(analyticsData.length, 1)).toFixed(1)}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Product Performance Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {analyticsData.map((product) => (
                  <ProductAnalyticsCard
                    key={product.product_id}
                    product={product}
                    maxRevenue={maxRevenue}
                  />
                ))}
              </div>

              {/* Top Products */}
              {topProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Top Performing Products
                    </CardTitle>
                    <CardDescription>Ranked by total revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topProducts.map((product, index) => (
                        <div key={product.product_id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              #{product.rank_position}
                            </Badge>
                            <div>
                              <div className="font-medium">{product.product_name}</div>
                              {product.product_category && (
                                <div className="text-sm text-muted-foreground">{product.product_category}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${product.metric_value.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">Revenue</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}