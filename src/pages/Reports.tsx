import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, Clock, DollarSign, TrendingUp, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface ReportData {
  totalCustomers: number;
  totalAppointments: number;
  thisWeekAppointments: number;
  thisMonthAppointments: number;
  lastMonthAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalRevenue: number;
  thisWeekRevenue: number;
  thisMonthRevenue: number;
  completedTasks: number;
  pendingTasks: number;
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData>({
    totalCustomers: 0,
    totalAppointments: 0,
    thisWeekAppointments: 0,
    thisMonthAppointments: 0,
    lastMonthAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    noShowAppointments: 0,
    totalRevenue: 0,
    thisWeekRevenue: 0,
    thisMonthRevenue: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .single();

      if (!business) return;

      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // Fetch customers
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", business.id);

      // Fetch all appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select("*")
        .eq("business_id", business.id);

      // Fetch tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("completed")
        .eq("business_id", business.id);

      if (appointments) {
        const thisWeekAppointments = appointments.filter(apt => 
          new Date(apt.start_time) >= weekStart && new Date(apt.start_time) <= weekEnd
        );

        const thisMonthAppointments = appointments.filter(apt => 
          new Date(apt.start_time) >= monthStart && new Date(apt.start_time) <= monthEnd
        );

        const lastMonthAppointments = appointments.filter(apt => 
          new Date(apt.start_time) >= lastMonthStart && new Date(apt.start_time) <= lastMonthEnd
        );

        const completedAppointments = appointments.filter(apt => apt.status === 'completed');
        const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled');
        const noShowAppointments = appointments.filter(apt => apt.status === 'no-show');

        const totalRevenue = completedAppointments.reduce((sum, apt) => sum + (parseFloat(apt.price?.toString() || '0') || 0), 0);
        const thisWeekRevenue = thisWeekAppointments
          .filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + (parseFloat(apt.price?.toString() || '0') || 0), 0);
        const thisMonthRevenue = thisMonthAppointments
          .filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + (parseFloat(apt.price?.toString() || '0') || 0), 0);

        setReportData({
          totalCustomers: customers?.length || 0,
          totalAppointments: appointments.length,
          thisWeekAppointments: thisWeekAppointments.length,
          thisMonthAppointments: thisMonthAppointments.length,
          lastMonthAppointments: lastMonthAppointments.length,
          completedAppointments: completedAppointments.length,
          cancelledAppointments: cancelledAppointments.length,
          noShowAppointments: noShowAppointments.length,
          totalRevenue,
          thisWeekRevenue,
          thisMonthRevenue,
          completedTasks: tasks?.filter(t => t.completed).length || 0,
          pendingTasks: tasks?.filter(t => !t.completed).length || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const appointmentCompletionRate = reportData.totalAppointments > 0 
    ? Math.round((reportData.completedAppointments / reportData.totalAppointments) * 100)
    : 0;

  const monthGrowth = reportData.lastMonthAppointments > 0
    ? Math.round(((reportData.thisMonthAppointments - reportData.lastMonthAppointments) / reportData.lastMonthAppointments) * 100)
    : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports & Analytics</h1>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${reportData.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentCompletionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* This Week/Month */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.thisWeekAppointments}</div>
            <p className="text-xs text-muted-foreground">
              appointments
            </p>
            <div className="text-lg font-semibold text-green-600 mt-2">
              ${reportData.thisWeekRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.thisMonthAppointments}</div>
            <p className="text-xs text-muted-foreground">
              appointments ({monthGrowth > 0 ? '+' : ''}{monthGrowth}% vs last month)
            </p>
            <div className="text-lg font-semibold text-green-600 mt-2">
              ${reportData.thisMonthRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              completed, {reportData.pendingTasks} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-600">{reportData.completedAppointments}</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {reportData.totalAppointments > 0 
                  ? Math.round((reportData.completedAppointments / reportData.totalAppointments) * 100)
                  : 0}%
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reportData.totalAppointments - reportData.completedAppointments - reportData.cancelledAppointments - reportData.noShowAppointments}
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {reportData.totalAppointments > 0 
                  ? Math.round(((reportData.totalAppointments - reportData.completedAppointments - reportData.cancelledAppointments - reportData.noShowAppointments) / reportData.totalAppointments) * 100)
                  : 0}%
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Cancelled</p>
                <p className="text-2xl font-bold text-orange-600">{reportData.cancelledAppointments}</p>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {reportData.totalAppointments > 0 
                  ? Math.round((reportData.cancelledAppointments / reportData.totalAppointments) * 100)
                  : 0}%
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">No-Show</p>
                <p className="text-2xl font-bold text-red-600">{reportData.noShowAppointments}</p>
              </div>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                {reportData.totalAppointments > 0 
                  ? Math.round((reportData.noShowAppointments / reportData.totalAppointments) * 100)
                  : 0}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}