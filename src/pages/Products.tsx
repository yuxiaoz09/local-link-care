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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, TrendingUp, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  cost_price: number | null;
  retail_price: number | null;
  supplier: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface InventoryLevel {
  id: string;
  product_id: string;
  location_id: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  last_restocked: string | null;
}

interface Location {
  id: string;
  name: string;
}

export default function Products() {
  const { user } = useAuth();
  const { businessData } = useBusinessSetup();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryLevel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    cost_price: "",
    retail_price: "",
    supplier: "",
    is_active: true,
  });

  const categories = ["Hair Care", "Skin Care", "Styling", "Tools", "Equipment", "Supplements", "Other"];

  useEffect(() => {
    if (businessData?.id) {
      fetchProducts();
      fetchLocations();
      fetchInventory();
    }
  }, [businessData]);

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

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("business_id", businessData?.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .in("location_id", locations.map(l => l.id));

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const getInventoryForProduct = (productId: string) => {
    return inventory.filter(inv => inv.product_id === productId);
  };

  const getTotalStock = (productId: string) => {
    const productInventory = getInventoryForProduct(productId);
    return productInventory.reduce((total, inv) => total + inv.current_stock, 0);
  };

  const hasLowStock = (productId: string) => {
    const productInventory = getInventoryForProduct(productId);
    return productInventory.some(inv => inv.current_stock <= inv.minimum_stock);
  };

  const calculateProfitMargin = (product: Product) => {
    if (!product.cost_price || !product.retail_price) return null;
    return ((product.retail_price - product.cost_price) / product.retail_price * 100).toFixed(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessData?.id) return;

    try {
      const productData = {
        name: formData.name,
        sku: formData.sku || null,
        category: formData.category || null,
        description: formData.description || null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        supplier: formData.supplier || null,
        is_active: formData.is_active,
      };

      if (selectedProduct) {
        // Update existing product
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
        // Create new product
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert([
            {
              ...productData,
              business_id: businessData.id,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // Create inventory records for all locations
        if (newProduct && locations.length > 0) {
          const inventoryRecords = locations.map(location => ({
            product_id: newProduct.id,
            location_id: location.id,
            current_stock: 0,
            minimum_stock: 5,
            maximum_stock: 100,
          }));

          const { error: inventoryError } = await supabase
            .from("inventory")
            .insert(inventoryRecords);

          if (inventoryError) {
            console.error("Error creating inventory records:", inventoryError);
          }
        }

        toast({
          title: "Success",
          description: "Product created successfully",
        });
      }

      setIsDialogOpen(false);
      setSelectedProduct(null);
      setFormData({
        name: "",
        sku: "",
        category: "",
        description: "",
        cost_price: "",
        retail_price: "",
        supplier: "",
        is_active: true,
      });
      fetchProducts();
      fetchInventory();
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
      description: product.description || "",
      cost_price: product.cost_price?.toString() || "",
      retail_price: product.retail_price?.toString() || "",
      supplier: product.supplier || "",
      is_active: product.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This will also delete all inventory records.")) return;

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
      fetchInventory();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog and inventory</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedProduct(null);
              setFormData({
                name: "",
                sku: "",
                category: "",
                description: "",
                cost_price: "",
                retail_price: "",
                supplier: "",
                is_active: true,
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {selectedProduct ? "Update product information" : "Add a new product to your catalog"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
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
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
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
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
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
          {products.map((product) => {
            const totalStock = getTotalStock(product.id);
            const lowStock = hasLowStock(product.id);
            const profitMargin = calculateProfitMargin(product);

            return (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {product.name}
                        {!product.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {lowStock && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        {product.category} {product.sku && `• ${product.sku}`}
                      </CardDescription>
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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Stock:</span>
                    <span className={lowStock ? "text-orange-500 font-medium" : ""}>{totalStock}</span>
                  </div>
                  {product.retail_price && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      ${product.retail_price}
                      {product.cost_price && (
                        <span className="text-muted-foreground">
                          (cost: ${product.cost_price})
                        </span>
                      )}
                    </div>
                  )}
                  {profitMargin && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      {profitMargin}% margin
                    </div>
                  )}
                  {product.supplier && (
                    <div className="text-sm text-muted-foreground">
                      Supplier: {product.supplier}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}