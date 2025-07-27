import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface CustomerAnalytics {
  totalCustomers: number;
  avgClv: number;
  segmentDistribution: Array<{
    segment: string;
    count: number;
    percentage: number;
  }>;
  topCustomersByClv: Array<{
    id: string;
    name: string;
    clv: number;
    segment: string;
  }>;
}

const COLORS = {
  Champions: '#10b981',
  Loyal: '#3b82f6',
  'At-Risk': '#f59e0b',
  Lost: '#ef4444',
  New: '#8b5cf6',
  Potential: '#6b7280'
};

export const CustomerAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCustomerAnalytics();
    }
  }, [user]);

  const fetchCustomerAnalytics = async () => {
    try {
      // Get user's business
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!business) return;

      // Fetch customer analytics data
      const { data: customersData } = await supabase
        .from('customer_analytics')
        .select('*')
        .eq('business_id', business.id);

      if (!customersData) return;

      // Calculate segments for each customer
      const customersWithSegments = customersData.map(customer => {
        const segment = getCustomerSegment(
          customer.recency_score,
          customer.frequency_score,
          customer.monetary_score
        );
        return { ...customer, segment };
      });

      // Calculate segment distribution
      const segmentCounts = customersWithSegments.reduce((acc, customer) => {
        acc[customer.segment] = (acc[customer.segment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalCustomers = customersWithSegments.length;
      const segmentDistribution = Object.entries(segmentCounts).map(([segment, count]) => ({
        segment,
        count,
        percentage: Math.round((count / totalCustomers) * 100)
      }));

      // Get top customers by CLV
      const topCustomersByClv = customersWithSegments
        .sort((a, b) => b.customer_lifetime_value - a.customer_lifetime_value)
        .slice(0, 10)
        .map(customer => ({
          id: customer.id,
          name: customer.name,
          clv: customer.customer_lifetime_value,
          segment: customer.segment
        }));

      // Calculate average CLV
      const avgClv = customersWithSegments.reduce((sum, customer) => 
        sum + customer.customer_lifetime_value, 0) / totalCustomers;

      setAnalytics({
        totalCustomers,
        avgClv,
        segmentDistribution,
        topCustomersByClv
      });
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

  if (loading) {
    return <div>Loading customer analytics...</div>;
  }

  if (!analytics) {
    return <div>No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average CLV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.avgClv.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.segmentDistribution[0]?.segment || 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segment Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Segmentation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.segmentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ segment, percentage }) => `${segment}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.segmentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.segment as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers by CLV */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers by CLV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topCustomersByClv.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ 
                        backgroundColor: `${COLORS[customer.segment as keyof typeof COLORS]}20`,
                        borderColor: COLORS[customer.segment as keyof typeof COLORS],
                        color: COLORS[customer.segment as keyof typeof COLORS]
                      }}
                    >
                      {customer.segment}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold">${customer.clv.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segment Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Segment Distribution Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.segmentDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="segment" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Customer Count">
                  {analytics.segmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.segment as keyof typeof COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};