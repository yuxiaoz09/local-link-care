import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar } from 'lucide-react';

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

      // Fetch revenue analytics data
      const { data: revenueAnalyticsData } = await supabase
        .from('revenue_analytics')
        .select('*')
        .eq('business_id', business.id)
        .order('month', { ascending: true })
        .limit(12);

      if (revenueAnalyticsData) {
        const formattedData = revenueAnalyticsData.map(item => ({
          month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: Number(item.total_revenue || 0),
          customers: item.unique_customers || 0,
          appointments: item.total_appointments || 0,
          avgTransactionValue: Number(item.avg_transaction_value || 0)
        }));
        setRevenueData(formattedData);

        // Calculate KPIs
        const currentMonth = formattedData[formattedData.length - 1];
        const previousMonth = formattedData[formattedData.length - 2];
        
        const totalRevenue = formattedData.reduce((sum, month) => sum + month.revenue, 0);
        const totalCustomers = Math.max(...formattedData.map(m => m.customers));
        const monthlyGrowth = previousMonth 
          ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100 
          : 0;

        setKpiData({
          totalRevenue,
          monthlyGrowth,
          avgRevenuePerCustomer: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
          monthlyRecurringRevenue: currentMonth?.revenue || 0,
          customerAcquisitionRate: currentMonth?.customers || 0
        });
      }

      // Fetch customer analytics for segment revenue
      const { data: customersData } = await supabase
        .from('customer_analytics')
        .select('*')
        .eq('business_id', business.id);

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