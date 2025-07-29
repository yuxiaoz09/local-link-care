import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3,
  MapPin
} from "lucide-react";

interface ProductAnalyticsData {
  product_id: string;
  product_name: string;
  product_sku: string;
  product_category: string;
  supplier: string;
  cost_price: number;
  retail_price: number;
  total_stock: number;
  total_sales_quantity: number;
  total_sales_revenue: number;
  profit_margin: number;
  inventory_turnover: number;
  days_since_last_sale: number;
  locations_in_stock: number;
  average_sale_price: number;
  total_profit: number;
}

interface ProductAnalyticsCardProps {
  product: ProductAnalyticsData;
  maxRevenue: number;
}

export function ProductAnalyticsCard({ product, maxRevenue }: ProductAnalyticsCardProps) {
  const revenuePercentage = maxRevenue > 0 ? (product.total_sales_revenue / maxRevenue) * 100 : 0;
  
  const getStockStatus = () => {
    if (product.total_stock === 0) return { status: 'out-of-stock', color: 'destructive' };
    if (product.total_stock < 10) return { status: 'low-stock', color: 'secondary' };
    return { status: 'in-stock', color: 'default' };
  };

  const stockStatus = getStockStatus();

  const getPerformanceLevel = () => {
    if (product.total_sales_revenue === 0) return 'No Sales';
    if (product.total_sales_revenue > maxRevenue * 0.7) return 'Top Performer';
    if (product.total_sales_revenue > maxRevenue * 0.3) return 'Good';
    return 'Needs Attention';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{product.product_name}</CardTitle>
            <div className="flex gap-2 mt-1 flex-wrap">
              {product.product_category && (
                <Badge variant="outline">{product.product_category}</Badge>
              )}
              <Badge variant={stockStatus.color as any}>
                {stockStatus.status.replace('-', ' ')}
              </Badge>
            </div>
            {product.product_sku && (
              <p className="text-sm text-muted-foreground mt-1">SKU: {product.product_sku}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue & Profit */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Revenue</span>
            </div>
            <span className="font-bold">${product.total_sales_revenue.toFixed(2)}</span>
          </div>
          <Progress value={revenuePercentage} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Profit</div>
              <div className="font-medium text-green-600">${product.total_profit.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Margin</div>
              <div className="font-medium">{product.profit_margin.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Inventory & Sales */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Stock & Sales</span>
            </div>
            <span className="font-bold">{product.total_stock} units</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Sold</div>
              <div className="font-medium">{product.total_sales_quantity}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Locations</div>
              <div className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {product.locations_in_stock}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Cost Price</div>
              <div className="font-medium">${product.cost_price?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Retail Price</div>
              <div className="font-medium">${product.retail_price?.toFixed(2) || 'N/A'}</div>
            </div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">Avg Sale Price</div>
            <div className="font-medium">${product.average_sale_price.toFixed(2)}</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <span className="text-sm">Performance</span>
          </div>
          <Badge variant={getPerformanceLevel() === 'Top Performer' ? 'default' : 
                          getPerformanceLevel() === 'Good' ? 'secondary' : 'destructive'}>
            {getPerformanceLevel()}
          </Badge>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Turnover</div>
            <div className="font-medium">{product.inventory_turnover.toFixed(2)}x</div>
          </div>
          <div>
            <div className="text-muted-foreground">Last Sale</div>
            <div className="font-medium">
              {product.days_since_last_sale ? `${product.days_since_last_sale}d ago` : 'Never'}
            </div>
          </div>
        </div>

        {product.supplier && (
          <div className="text-sm">
            <div className="text-muted-foreground">Supplier</div>
            <div className="font-medium">{product.supplier}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}