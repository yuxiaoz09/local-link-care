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
  Package2,
  Scissors,
  Clock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ProductAnalyticsCard } from "@/components/products/ProductAnalyticsCard";
import { InventoryManagement } from "@/components/products/InventoryManagement";

interface Offering {
  id: string;
  business_id: string;
  name: string;
  type: 'service' | 'product';
  sku: string | null;
  category: string | null;
  supplier: string | null;
  cost_price: number | null;
  retail_price: number | null;
  base_price: number | null;
  description: string | null;
  duration_minutes: number | null;
  requires_booking: boolean;
  track_inventory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Products() {
  const { user } = useAuth();
  const { businessData } = useBusinessSetup();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");
  const [viewMode, setViewMode] = useState<'service' | 'product'>('service');
  const [formData, setFormData] = useState({
    name: "",
    type: "service" as 'service' | 'product',
    sku: "",
    category: "",
    supplier: "",
    cost_price: "",
    retail_price: "",
    base_price: "",
    duration_minutes: "",
    description: "",
    requires_booking: true,
    track_inventory: false,
    is_active: true,
  });

  const serviceCategories = ["Hair & Beauty", "Wellness & Spa", "Automotive", "Home Services", "Professional Services", "Health & Medical", "Fitness", "Education", "Other Services"];
  const productCategories = ["Electronics", "Clothing", "Beauty", "Health", "Home", "Sports", "Books", "Food", "Automotive Parts", "Other"];

  // Determine primary view based on business type
  useEffect(() => {
    if (businessData?.business_type) {
      const serviceBasedTypes = ['hair_salon', 'spa_wellness', 'auto_repair', 'fitness_gym', 'medical_practice'];
      if (serviceBasedTypes.includes(businessData.business_type)) {
        setViewMode('service');
      } else {
        setViewMode('product');
      }
    }
  }, [businessData?.business_type]);

  useEffect(() => {
    if (businessData?.id) {
      fetchOfferings();
      if (activeTab === "analytics") {
        fetchAnalytics();
      }
    }
  }, [businessData, activeTab]);

  const fetchOfferings = async () => {
    try {
      const { data, error } = await supabase
        .from("offerings")
        .select("*")
        .eq("business_id", businessData?.id)
        .order("name");

      if (error) throw error;
      setOfferings((data || []) as Offering[]);
    } catch (error) {
      console.error("Error fetching offerings:", error);
      toast({
        title: "Error",
        description: "Failed to load services and products",
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
      const offeringData = {
        name: formData.name,
        type: formData.type,
        sku: formData.sku || null,
        category: formData.category || null,
        supplier: formData.supplier || null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        base_price: formData.base_price ? parseFloat(formData.base_price) : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        description: formData.description || null,
        requires_booking: formData.requires_booking,
        track_inventory: formData.track_inventory,
        is_active: formData.is_active,
      };

      if (selectedOffering) {
        const { error } = await supabase
          .from("offerings")
          .update(offeringData)
          .eq("id", selectedOffering.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: `${formData.type === 'service' ? 'Service' : 'Product'} updated successfully`,
        });
      } else {
        const { error } = await supabase
          .from("offerings")
          .insert([
            {
              ...offeringData,
              business_id: businessData.id,
            },
          ]);

        if (error) throw error;
        toast({
          title: "Success",
          description: `${formData.type === 'service' ? 'Service' : 'Product'} created successfully`,
        });
      }

      setIsDialogOpen(false);
      setSelectedOffering(null);
      resetForm();
      fetchOfferings();
    } catch (error) {
      console.error("Error saving offering:", error);
      toast({
        title: "Error",
        description: `Failed to save ${formData.type}`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (offering: Offering) => {
    setSelectedOffering(offering);
    setFormData({
      name: offering.name,
      type: offering.type,
      sku: offering.sku || "",
      category: offering.category || "",
      supplier: offering.supplier || "",
      cost_price: offering.cost_price?.toString() || "",
      retail_price: offering.retail_price?.toString() || "",
      base_price: offering.base_price?.toString() || "",
      duration_minutes: offering.duration_minutes?.toString() || "",
      description: offering.description || "",
      requires_booking: offering.requires_booking,
      track_inventory: offering.track_inventory,
      is_active: offering.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (offeringId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from("offerings")
        .delete()
        .eq("id", offeringId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      fetchOfferings();
    } catch (error) {
      console.error("Error deleting offering:", error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: viewMode,
      sku: "",
      category: "",
      supplier: "",
      cost_price: "",
      retail_price: "",
      base_price: "",
      duration_minutes: "",
      description: "",
      requires_booking: true,
      track_inventory: false,
      is_active: true,
    });
  };

  const maxRevenue = Math.max(...analyticsData.map(product => product.total_sales_revenue), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const filteredOfferings = offerings.filter(offering => offering.type === viewMode);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Services & Products</h1>
          <p className="text-muted-foreground">Manage your services, products, inventory, and analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'service' | 'product')} className="bg-muted rounded-lg p-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="service" className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Services
              </TabsTrigger>
              <TabsTrigger value="product" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setSelectedOffering(null);
                resetForm();
                setFormData(prev => ({ ...prev, type: viewMode }));
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add {viewMode === 'service' ? 'Service' : 'Product'}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedOffering ? `Edit ${formData.type === 'service' ? 'Service' : 'Product'}` : `Add New ${formData.type === 'service' ? 'Service' : 'Product'}`}
              </DialogTitle>
              <DialogDescription>
                {selectedOffering ? `Update ${formData.type} information` : `Add a new ${formData.type} to your catalog`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">{formData.type === 'service' ? 'Service' : 'Product'} Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                {formData.type === 'product' && (
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                )}
                {formData.type === 'service' && (
                  <div>
                    <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                      placeholder="e.g., 30"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.type === 'service' ? serviceCategories : productCategories).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.type === 'product' && (
                  <div>
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {formData.type === 'product' && (
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
                )}
                <div>
                  <Label htmlFor={formData.type === 'service' ? 'base_price' : 'retail_price'}>
                    {formData.type === 'service' ? 'Base Price ($)' : 'Retail Price ($)'}
                  </Label>
                  <Input
                    id={formData.type === 'service' ? 'base_price' : 'retail_price'}
                    type="number"
                    step="0.01"
                    value={formData.type === 'service' ? formData.base_price : formData.retail_price}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      [formData.type === 'service' ? 'base_price' : 'retail_price']: e.target.value 
                    })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={`Optional ${formData.type} description`}
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                {formData.type === 'service' && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_booking"
                      checked={formData.requires_booking}
                      onCheckedChange={(checked) => setFormData({ ...formData, requires_booking: checked })}
                    />
                    <Label htmlFor="requires_booking">Requires Booking</Label>
                  </div>
                )}
                {formData.type === 'product' && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="track_inventory"
                      checked={formData.track_inventory}
                      onCheckedChange={(checked) => setFormData({ ...formData, track_inventory: checked })}
                    />
                    <Label htmlFor="track_inventory">Track Inventory</Label>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full">
                {selectedOffering ? `Update ${formData.type === 'service' ? 'Service' : 'Product'}` : `Create ${formData.type === 'service' ? 'Service' : 'Product'}`}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            {viewMode === 'service' ? <Scissors className="h-4 w-4" /> : <Package className="h-4 w-4" />}
            {viewMode === 'service' ? 'Service' : 'Product'} Catalog
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
          {filteredOfferings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                {viewMode === 'service' ? <Scissors className="mx-auto h-12 w-12 text-muted-foreground mb-4" /> : <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />}
                <h3 className="text-lg font-semibold mb-2">No {viewMode}s yet</h3>
                <p className="text-muted-foreground">Add your first {viewMode} to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOfferings.map((offering) => (
                <Card key={offering.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {offering.name}
                          {!offering.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          <Badge variant="outline">
                            {offering.type === 'service' ? 'Service' : 'Product'}
                          </Badge>
                        </CardTitle>
                        {offering.category && (
                          <CardDescription>{offering.category}</CardDescription>
                        )}
                        {offering.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {offering.sku}</p>
                        )}
                        {offering.duration_minutes && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {offering.duration_minutes} min
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(offering)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(offering.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {offering.supplier && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Supplier: </span>
                        <span>{offering.supplier}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {offering.cost_price && (
                        <div>
                          <span className="text-muted-foreground">Cost: </span>
                          <span className="font-medium">${offering.cost_price}</span>
                        </div>
                      )}
                      {(offering.retail_price || offering.base_price) && (
                        <div>
                          <span className="text-muted-foreground">Price: </span>
                          <span className="font-medium">${offering.retail_price || offering.base_price}</span>
                        </div>
                      )}
                    </div>
                    {offering.description && (
                      <p className="text-sm text-muted-foreground">{offering.description}</p>
                    )}
                    {offering.type === 'service' && (
                      <div className="flex gap-2 flex-wrap">
                        {offering.requires_booking && (
                          <Badge variant="secondary" className="text-xs">Booking Required</Badge>
                        )}
                      </div>
                    )}
                    {offering.type === 'product' && offering.track_inventory && (
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">Inventory Tracked</Badge>
                      </div>
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
                        <p className="text-sm font-medium text-muted-foreground">Active Items</p>
                        <p className="text-2xl font-bold">{offerings.filter(p => p.is_active).length}</p>
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