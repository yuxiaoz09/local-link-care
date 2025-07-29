import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar } from 'lucide-react';
import { logSecurityEvent } from '@/lib/security';

interface RevenueData {
  month: string;
  revenue: number;
  customers: number;
  appointments: number;
  avgTransactionValue: number;
}

interface KPIData {
  totalRevenue: number;
  monthlyGrowth: number;
  avgRevenuePerCustomer: number;
  monthlyRecurringRevenue: number;
  customerAcquisitionRate: number;
}

interface SegmentRevenue {
  segment: string;
  revenue: number;
  percentage: number;
}

export const RevenueAnalytics = () => {
  const { user } = useAuth();
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [segmentRevenue, setSegmentRevenue] = useState<SegmentRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRevenueAnalytics();
    }
  }, [user]);

  const fetchRevenueAnalytics = async () => {
    try {
      // Get user's business
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!business) return;

      // Fetch revenue analytics using secure function
      const { data: revenueAnalyticsData, error: revenueError } = await supabase
        .rpc('get_revenue_period', { 
          business_uuid: business.id,
          start_date: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        });

      if (revenueError) {
        logSecurityEvent('Failed to load revenue analytics', { 
          businessId: business.id, 
          error: revenueError.message 
        });
        throw revenueError;
      }

      // Log successful analytics access for audit trail
      logSecurityEvent('Revenue analytics accessed', { 
        businessId: business.id, 
        recordCount: revenueAnalyticsData?.length || 0 
      });

      if (revenueAnalyticsData && Array.isArray(revenueAnalyticsData) && revenueAnalyticsData.length > 0) {
        const data = revenueAnalyticsData[0]; // Single result from function
        const formattedData = [{
          month: new Date().toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: Number(data.total_revenue || 0),
          customers: Number(data.unique_customers || 0),
          appointments: Number(data.appointment_count || 0),
          avgTransactionValue: Number(data.avg_transaction_value || 0)
        }];
        setRevenueData(formattedData);

        setKpiData({
          totalRevenue: Number(data.total_revenue || 0),
          monthlyGrowth: 0, // Can't calculate without historical data
          avgRevenuePerCustomer: Number(data.avg_transaction_value || 0),
          monthlyRecurringRevenue: Number(data.total_revenue || 0),
          customerAcquisitionRate: Number(data.unique_customers || 0)
        });
      }

      // Fetch customer analytics for segment revenue using secure function
      const { data: customersData } = await supabase
        .rpc('get_customer_analytics', { business_uuid: business.id });

      if (customersData) {
        const segments = customersData.reduce((acc, customer) => {
          const segment = getCustomerSegment(customer.recency_score, customer.frequency_score, customer.monetary_score);
          if (!acc[segment]) acc[segment] = 0;
          acc[segment] += Number(customer.total_spent || 0);
          return acc;
        }, {} as Record<string, number>);

        const totalSegmentRevenue = Object.values(segments).reduce((sum, revenue) => sum + revenue, 0);
        const segmentRevenueData = Object.entries(segments).map(([segment, revenue]) => ({
          segment,
          revenue,
          percentage: totalSegmentRevenue > 0 ? (revenue / totalSegmentRevenue) * 100 : 0
        }));

        setSegmentRevenue(segmentRevenueData);
      }
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

  if (loading) {
    return <div>Loading revenue analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData?.totalRevenue || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            {kpiData && kpiData.monthlyGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              kpiData && kpiData.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {kpiData?.monthlyGrowth.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue Per Customer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData?.avgRevenuePerCustomer || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData?.monthlyRecurringRevenue || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.customerAcquisitionRate || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Customer Segment */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Customer Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentRevenue}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ segment, percentage }) => `${segment}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {segmentRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Average Transaction Value Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Average Transaction Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Avg Transaction']} />
                  <Bar dataKey="avgTransactionValue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};