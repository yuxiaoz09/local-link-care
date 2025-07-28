import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Calendar, CheckSquare, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QuickInsights } from '@/components/chat/QuickInsights';

interface DashboardStats {
  customerCount: number;
  todayAppointments: number;
  pendingTasks: number;
  weeklyRevenue: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    customerCount: 0,
    todayAppointments: 0,
    pendingTasks: 0,
    weeklyRevenue: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Get user's business
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!business) return;

      // Fetch stats
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      // Customer count
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id);

      // Today's appointments
      const { data: todayAppts, count: todayCount } = await supabase
        .from('appointments')
        .select('*, customers(name)', { count: 'exact' })
        .eq('business_id', business.id)
        .gte('start_time', today)
        .lt('start_time', `${today}T23:59:59`);

      // Pending tasks
      const { data: tasks, count: taskCount } = await supabase
        .from('tasks')
        .select('*, customers(name)', { count: 'exact' })
        .eq('business_id', business.id)
        .eq('completed', false);

      // Weekly revenue
      const { data: weeklyAppts } = await supabase
        .from('appointments')
        .select('price')
        .eq('business_id', business.id)
        .eq('status', 'completed')
        .gte('start_time', weekStart.toISOString());

      const weeklyRevenue = weeklyAppts?.reduce((sum, appt) => sum + (appt.price || 0), 0) || 0;

      setStats({
        customerCount: customerCount || 0,
        todayAppointments: todayCount || 0,
        pendingTasks: taskCount || 0,
        weeklyRevenue,
      });

      setTodayAppointments(todayAppts || []);
      setPendingTasks(tasks?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your business overview.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/customers?action=add">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/appointments?action=add">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Appointment
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customerCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.weeklyRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <QuickInsights
        onQuestionClick={(question) => {
          // This will trigger the chat interface to open and process the question
          window.dispatchEvent(new CustomEvent('openChatWithQuestion', { detail: question }));
        }}
      />

      {/* Today's Appointments and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-muted-foreground">No appointments scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                    <div>
                      <p className="font-medium">{appointment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.customers?.name} • {new Date(appointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="text-muted-foreground">No pending tasks.</p>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.customers?.name && `${task.customers.name} • `}
                        {task.due_date && `Due: ${new Date(task.due_date).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;