import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, MapPin, Plus, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InventoryItem {
  product_id: string;
  product_name: string;
  location_id: string;
  location_name: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  last_restocked: string;
}

interface InventoryAlert {
  product_id: string;
  product_name: string;
  location_id: string;
  location_name: string;
  current_stock: number;
  minimum_stock: number;
  stock_shortage: number;
  alert_level: 'critical' | 'urgent' | 'warning' | 'normal';
}

interface InventoryManagementProps {
  businessId: string;
}

export function InventoryManagement({ businessId }: InventoryManagementProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockUpdate, setStockUpdate] = useState({
    current_stock: "",
    minimum_stock: "",
    maximum_stock: "",
  });

  useEffect(() => {
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    try {
      // Fetch inventory data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select(`
          product_id,
          location_id,
          current_stock,
          minimum_stock,
          maximum_stock,
          last_restocked,
          products!inner(name),
          locations!inner(name)
        `)
        .eq("locations.business_id", businessId)
        .order("current_stock", { ascending: true });

      if (inventoryError) throw inventoryError;

      const formattedInventory = inventoryData?.map(item => ({
        product_id: item.product_id,
        product_name: (item.products as any).name,
        location_id: item.location_id,
        location_name: (item.locations as any).name,
        current_stock: item.current_stock,
        minimum_stock: item.minimum_stock,
        maximum_stock: item.maximum_stock,
        last_restocked: item.last_restocked,
      })) || [];

      setInventory(formattedInventory);

      // Fetch alerts
      const { data: alertsData, error: alertsError } = await supabase.rpc("get_inventory_alerts", {
        business_uuid: businessId,
      });

      if (alertsError) throw alertsError;
      setAlerts((alertsData || []).map(alert => ({
        ...alert,
        alert_level: alert.alert_level as 'critical' | 'urgent' | 'warning' | 'normal'
      })));
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async () => {
    if (!selectedItem) return;

    try {
      const { error } = await supabase
        .from("inventory")
        .update({
          current_stock: parseInt(stockUpdate.current_stock),
          minimum_stock: parseInt(stockUpdate.minimum_stock),
          maximum_stock: parseInt(stockUpdate.maximum_stock),
          last_restocked: new Date().toISOString().split('T')[0],
        })
        .eq("product_id", selectedItem.product_id)
        .eq("location_id", selectedItem.location_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Inventory updated successfully",
      });

      setIsDialogOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error("Error updating inventory:", error);
      toast({
        title: "Error",
        description: "Failed to update inventory",
        variant: "destructive",
      });
    }
  };

  const openUpdateDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setStockUpdate({
      current_stock: item.current_stock.toString(),
      minimum_stock: item.minimum_stock.toString(),
      maximum_stock: item.maximum_stock.toString(),
    });
    setIsDialogOpen(true);
  };

  const getAlertBadge = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'warning':
        return <Badge variant="secondary">Low Stock</Badge>;
      default:
        return <Badge variant="default">Normal</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Inventory Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={`${alert.product_id}-${alert.location_id}`} 
                     className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getAlertBadge(alert.alert_level)}
                    <div>
                      <div className="font-medium">{alert.product_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {alert.location_name} • {alert.current_stock} / {alert.minimum_stock} min
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Need: {alert.stock_shortage} units
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {inventory.map((item) => {
          const isLowStock = item.current_stock <= item.minimum_stock;
          const isCritical = item.current_stock === 0;
          
          return (
            <Card key={`${item.product_id}-${item.location_id}`} 
                  className={isCritical ? 'border-red-200 bg-red-50' : 
                             isLowStock ? 'border-yellow-200 bg-yellow-50' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.product_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm text-muted-foreground">{item.location_name}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openUpdateDialog(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{item.current_stock}</div>
                    <div className="text-xs text-muted-foreground">Current</div>
                  </div>
                  <div>
                    <div className="text-lg">{item.minimum_stock}</div>
                    <div className="text-xs text-muted-foreground">Min</div>
                  </div>
                  <div>
                    <div className="text-lg">{item.maximum_stock}</div>
                    <div className="text-xs text-muted-foreground">Max</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {isCritical && (
                    <Badge variant="destructive" className="w-full justify-center">
                      Out of Stock
                    </Badge>
                  )}
                  {!isCritical && isLowStock && (
                    <Badge variant="secondary" className="w-full justify-center">
                      Low Stock
                    </Badge>
                  )}
                  
                  {item.last_restocked && (
                    <div className="text-sm text-muted-foreground text-center">
                      Last restocked: {new Date(item.last_restocked).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Update Stock Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Inventory</DialogTitle>
            <DialogDescription>
              Update stock levels for {selectedItem?.product_name} at {selectedItem?.location_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="current_stock">Current Stock</Label>
                <Input
                  id="current_stock"
                  type="number"
                  value={stockUpdate.current_stock}
                  onChange={(e) => setStockUpdate(prev => ({ ...prev, current_stock: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="minimum_stock">Minimum Stock</Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  value={stockUpdate.minimum_stock}
                  onChange={(e) => setStockUpdate(prev => ({ ...prev, minimum_stock: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="maximum_stock">Maximum Stock</Label>
                <Input
                  id="maximum_stock"
                  type="number"
                  value={stockUpdate.maximum_stock}
                  onChange={(e) => setStockUpdate(prev => ({ ...prev, maximum_stock: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStockUpdate}>
                Update Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}