import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Widget {
  id: string;
  name: string;
}

interface WidgetAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: Widget | null;
}

interface AnalyticsData {
  totalViews: number;
  totalBookings: number;
  conversionRate: number;
  topDomains: Array<{ domain: string; count: number }>;
  dailyStats: Array<{ date: string; views: number; bookings: number }>;
}

export function WidgetAnalyticsDialog({ open, onOpenChange, widget }: WidgetAnalyticsDialogProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && widget) {
      fetchAnalytics();
    }
  }, [open, widget]);

  const fetchAnalytics = async () => {
    if (!widget) return;

    setLoading(true);
    try {
      // Fetch widget analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('widget_analytics')
        .select('*')
        .eq('widget_id', widget.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (analyticsError) {
        console.error('Error fetching analytics:', analyticsError);
        return;
      }

      // Fetch widget bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('widget_bookings')
        .select('*')
        .eq('widget_id', widget.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
      }

      // Process analytics data
      const views = analyticsData?.filter(a => a.event_type === 'view').length || 0;
      const bookings = bookingsData?.length || 0;
      const conversionRate = views > 0 ? (bookings / views) * 100 : 0;

      // Top domains
      const domainCounts: Record<string, number> = {};
      analyticsData?.forEach(a => {
        if (a.source_domain) {
          domainCounts[a.source_domain] = (domainCounts[a.source_domain] || 0) + 1;
        }
      });
      const topDomains = Object.entries(domainCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily stats for the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const dailyStats = last7Days.map(date => {
        const dayViews = analyticsData?.filter(a => 
          a.event_type === 'view' && 
          a.created_at.startsWith(date)
        ).length || 0;
        
        const dayBookings = bookingsData?.filter(b => 
          b.created_at.startsWith(date)
        ).length || 0;

        return {
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          views: dayViews,
          bookings: dayBookings
        };
      });

      setAnalytics({
        totalViews: views,
        totalBookings: bookings,
        conversionRate,
        topDomains,
        dailyStats
      });
    } catch (error) {
      console.error('Error processing analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!widget) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analytics - {widget.name}</DialogTitle>
          <DialogDescription>
            Widget performance metrics for the last 30 days
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalViews}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalBookings}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" fill="#3B82F6" name="Views" />
                    <Bar dataKey="bookings" fill="#10B981" name="Bookings" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {analytics.topDomains.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Domains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.topDomains.map((domain, index) => (
                      <div key={domain.domain} className="flex items-center justify-between">
                        <span className="text-sm">{domain.domain}</span>
                        <Badge variant="secondary">{domain.count} views</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No analytics data available yet</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}