import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import AppointmentCalendar from '@/components/appointments/AppointmentCalendar';

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  price: number | null;
  customer_id: string;
  customers: {
    name: string;
  } | null;
}

const Appointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchBusinessAndAppointments();
    }
  }, [user, currentDate, calendarView]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      setIsDialogOpen(true);
      setEditingAppointment(null);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const fetchBusinessAndAppointments = async () => {
    try {
      // Get user's business
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!business) {
        toast({
          title: "Setup Required",
          description: "Please set up your business profile first.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/settings')}
              className="ml-2 text-black"
            >
              Setup Now
            </Button>
          ),
        });
        return;
      }

      setBusinessId(business.id);

      // Fetch appointments based on current view and date
      let startDate, endDate;
      
      switch (calendarView) {
        case 'day':
          startDate = new Date(currentDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(currentDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        
        case 'week':
          startDate = new Date(currentDate);
          startDate.setDate(currentDate.getDate() - currentDate.getDay());
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        
        case 'month':
        default:
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
      }

      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customers (
            name
          )
        `)
        .eq('business_id', business.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time');

      if (error) throw error;

      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(appointments.map(apt => 
        apt.id === appointmentId ? { ...apt, status } : apt
      ));

      toast({
        title: "Success",
        description: "Appointment status updated.",
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(appointments.filter(apt => apt.id !== appointmentId));
      toast({
        title: "Success",
        description: "Appointment deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: "Failed to delete appointment.",
        variant: "destructive",
      });
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      
      switch (calendarView) {
        case 'day':
          newDate.setDate(prev.getDate() + (direction === 'next' ? 1 : -1));
          break;
        case 'week':
          newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
          break;
        case 'month':
        default:
          newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
          break;
      }
      
      return newDate;
    });
  };

  const getDateRangeTitle = () => {
    switch (calendarView) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
        } else {
          return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${weekStart.getFullYear()}`;
        }
      
      case 'month':
      default:
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-64">Loading appointments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Manage your appointment schedule</p>
        </div>
        
        <div className="flex gap-2">
          <div className="flex rounded-lg border">
            <Button
              variant={view === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('calendar')}
              className="rounded-r-none"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Appointment
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigateDate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {getDateRangeTitle()}
        </h2>
        <Button variant="outline" onClick={() => navigateDate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {view === 'calendar' ? (
        <AppointmentCalendar
          appointments={appointments}
          currentDate={currentDate}
          view={calendarView}
          onViewChange={setCalendarView}
          onEditAppointment={(appointment) => {
            setEditingAppointment(appointment);
            setIsDialogOpen(true);
          }}
          onUpdateStatus={handleUpdateAppointmentStatus}
          onDeleteAppointment={handleDeleteAppointment}
          onAddAppointment={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by scheduling your first appointment
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{appointment.title}</h3>
                      <p className="text-muted-foreground">
                        {appointment.customers?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(appointment.start_time).toLocaleDateString()} at{' '}
                        {new Date(appointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(appointment.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {appointment.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {appointment.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={
                        appointment.status === 'completed' ? 'default' :
                        appointment.status === 'cancelled' ? 'destructive' :
                        appointment.status === 'no-show' ? 'secondary' : 'outline'
                      }>
                        {appointment.status}
                      </Badge>
                      {appointment.price && (
                        <span className="font-semibold">${appointment.price}</span>
                      )}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAppointment(appointment);
                            setIsDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        {appointment.status === 'scheduled' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateAppointmentStatus(appointment.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        appointment={editingAppointment}
        businessId={businessId}
        onSuccess={() => {
          fetchBusinessAndAppointments();
          setIsDialogOpen(false);
          setEditingAppointment(null);
        }}
      />
    </div>
  );
};

export default Appointments;