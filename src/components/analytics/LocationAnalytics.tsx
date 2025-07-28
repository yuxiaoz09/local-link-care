import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessSetup } from "@/hooks/useBusinessSetup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { LocationFilter } from "@/components/LocationFilter";

interface LocationMetrics {
  location_id: string;
  location_name: string;
  total_appointments: number;
  completed_appointments: number;
  total_revenue: number;
  unique_customers: number;
  avg_transaction_value: number;
}

export function LocationAnalytics() {
  const { businessData } = useBusinessSetup();
  const [metrics, setMetrics] = useState<LocationMetrics[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessData?.id) {
      fetchLocationMetrics();
    }
  }, [businessData]);

  const fetchLocationMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select(`
          id,
          name,
          appointments!left (
            id,
            price,
            status,
            customer_id
          )
        `)
        .eq("business_id", businessData?.id)
        .eq("is_active", true);

      if (error) throw error;

      const locationMetrics: LocationMetrics[] = (data || []).map((location: any) => {
        const appointments = location.appointments || [];
        const completedAppointments = appointments.filter((a: any) => a.status === 'completed');
        const uniqueCustomers = new Set(appointments.map((a: any) => a.customer_id)).size;
        const totalRevenue = completedAppointments.reduce((sum: number, a: any) => sum + (a.price || 0), 0);

        return {
          location_id: location.id,
          location_name: location.name,
          total_appointments: appointments.length,
          completed_appointments: completedAppointments.length,
          total_revenue: totalRevenue,
          unique_customers: uniqueCustomers,
          avg_transaction_value: completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0,
        };
      });

      setMetrics(locationMetrics);
    } catch (error) {
      console.error("Error fetching location metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMetrics = selectedLocationId 
    ? metrics.filter(m => m.location_id === selectedLocationId)
    : metrics;

  const totalMetrics = metrics.reduce((acc, metric) => ({
    total_appointments: acc.total_appointments + metric.total_appointments,
    completed_appointments: acc.completed_appointments + metric.completed_appointments,
    total_revenue: acc.total_revenue + metric.total_revenue,
    unique_customers: acc.unique_customers + metric.unique_customers,
  }), {
    total_appointments: 0,
    completed_appointments: 0,
    total_revenue: 0,
    unique_customers: 0,
  });

  const getRankingBadge = (value: number, allValues: number[], higher_is_better = true) => {
    const sorted = [...allValues].sort((a, b) => higher_is_better ? b - a : a - b);
    const rank = sorted.indexOf(value) + 1;
    
    if (rank === 1) return <Badge className="bg-green-500">Best</Badge>;
    if (rank === allValues.length) return <Badge variant="destructive">Needs Attention</Badge>;
    return <Badge variant="secondary">#{rank}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32">Loading location analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Location Performance</h3>
          <p className="text-sm text-muted-foreground">Compare performance across all locations</p>
        </div>
        <LocationFilter
          selectedLocationId={selectedLocationId}
          onLocationChange={setSelectedLocationId}
        />
      </div>

      {/* Summary Cards */}
      {!selectedLocationId && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMetrics.total_revenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.total_appointments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.unique_customers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Location Comparison Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMetrics.map((metric) => (
          <Card key={metric.location_id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {metric.location_name}
                  </CardTitle>
                </div>
                <div className="flex gap-1">
                  {getRankingBadge(metric.total_revenue, metrics.map(m => m.total_revenue))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    ${metric.total_revenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {metric.completed_appointments}
                  </div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-semibold">
                    {metric.unique_customers}
                  </div>
                  <p className="text-xs text-muted-foreground">Customers</p>
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    ${metric.avg_transaction_value.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Avg. Transaction</p>
                </div>
              </div>

              {/* Completion Rate */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Completion Rate</span>
                  <span>
                    {metric.total_appointments > 0 
                      ? ((metric.completed_appointments / metric.total_appointments) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: metric.total_appointments > 0 
                        ? `${(metric.completed_appointments / metric.total_appointments) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMetrics.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No location data</h3>
            <p className="text-muted-foreground">
              {selectedLocationId 
                ? "No data available for the selected location" 
                : "Create locations and start booking appointments to see analytics"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}