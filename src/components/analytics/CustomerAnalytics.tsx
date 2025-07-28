import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CustomerSegmentBadge from './CustomerSegmentBadge';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';

interface CustomerAnalyticsData {
  id: string;
  name: string;
  email: string;
  customer_lifetime_value: number;
  total_spent: number;
  total_appointments: number;
  days_since_last_visit: number;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
}

interface SegmentSummary {
  segment: string;
  count: number;
  totalValue: number;
}

const CustomerAnalytics = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<CustomerAnalyticsData[]>([]);
  const [segmentSummary, setSegmentSummary] = useState<SegmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCustomerAnalytics();
    }
  }, [user]);

  const fetchCustomerAnalytics = async () => {
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!business) return;

      const { data, error } = await supabase
        .from('customer_analytics')
        .select('*')
        .eq('business_id', business.id);

      if (error) throw error;

      if (data) {
        const analyticsWithSegments = data.map(customer => ({
          ...customer,
          segment: getCustomerSegment(
            customer.recency_score,
            customer.frequency_score, 
            customer.monetary_score
          )
        }));

        setAnalyticsData(analyticsWithSegments);

        // Calculate segment summary
        const segments = analyticsWithSegments.reduce((acc: Record<string, SegmentSummary>, customer) => {
          const segment = customer.segment;
          if (!acc[segment]) {
            acc[segment] = { segment, count: 0, totalValue: 0 };
          }
          acc[segment].count++;
          acc[segment].totalValue += customer.customer_lifetime_value;
          return acc;
        }, {});

        setSegmentSummary(Object.values(segments));
      }
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerSegment = (recency: number, frequency: number, monetary: number): string => {
    if (recency >= 4 && frequency >= 4 && monetary >= 4) return 'Champions';
    if (recency >= 3 && frequency >= 3 && monetary >= 3) return 'Loyal';
    if (recency >= 3 && frequency <= 2) return 'At-Risk';
    if (recency <= 2 && frequency <= 2) return 'Lost';
    if (recency >= 4 && frequency <= 1) return 'New';
    return 'Potential';
  };

  const highValueCustomers = analyticsData
    .sort((a, b) => b.customer_lifetime_value - a.customer_lifetime_value)
    .slice(0, Math.ceil(analyticsData.length * 0.2)); // Top 20%

  const totalCLV = analyticsData.reduce((sum, customer) => sum + customer.customer_lifetime_value, 0);
  const avgCLV = analyticsData.length > 0 ? totalCLV / analyticsData.length : 0;

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total CLV</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCLV.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average CLV</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgCLV.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High-Value Customers</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highValueCustomers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {segmentSummary.map((segment) => (
              <div key={segment.segment} className="text-center">
                <CustomerSegmentBadge segment={segment.segment} className="mb-2" />
                <div className="text-lg font-semibold">{segment.count}</div>
                <div className="text-sm text-muted-foreground">
                  ${segment.totalValue.toFixed(0)} CLV
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* High-Value Customers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>High-Value Customers (Top 20%)</CardTitle>
          <Button asChild variant="outline">
            <Link to="/customers">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {highValueCustomers.slice(0, 10).map((customer) => (
              <div key={customer.id} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.email} • {customer.total_appointments} appointments
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${customer.customer_lifetime_value.toFixed(0)}</div>
                  <CustomerSegmentBadge 
                    segment={getCustomerSegment(
                      customer.recency_score,
                      customer.frequency_score,
                      customer.monetary_score
                    )} 
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerAnalytics;