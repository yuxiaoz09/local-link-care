import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerAnalytics from "@/components/analytics/CustomerAnalytics";

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive business insights and customer analytics.
        </p>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Customer Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="services">Service Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="customers" className="space-y-4">
          <CustomerAnalytics />
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Revenue analytics coming soon...</p>
          </div>
        </TabsContent>
        
        <TabsContent value="services" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Service performance analytics coming soon...</p>
          </div>
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">AI insights coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;