import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Check, X, Plus } from 'lucide-react';

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

interface AppointmentDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  appointments: Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onAddAppointment: () => void;
}

const AppointmentDayModal = ({
  open,
  onOpenChange,
  date,
  appointments,
  onEditAppointment,
  onUpdateStatus,
  onDeleteAppointment,
  onAddAppointment,
}: AppointmentDayModalProps) => {
  if (!date) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no-show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const sortedAppointments = appointments.sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              Appointments for {date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            <Button size="sm" onClick={onAddAppointment}>
              <Plus className="h-4 w-4 mr-2" />
              Add Appointment
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {sortedAppointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">No appointments scheduled</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first appointment for this day
                  </p>
                  <Button onClick={onAddAppointment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            sortedAppointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{appointment.title}</h3>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                      
                      <p className="text-muted-foreground font-medium">
                        {appointment.customers?.name}
                      </p>
                      
                      <p className="text-sm text-muted-foreground">
                        {new Date(appointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(appointment.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      
                      {appointment.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {appointment.description}
                        </p>
                      )}
                      
                      {appointment.price && (
                        <p className="text-sm font-semibold text-green-600 mt-2">
                          ${appointment.price}
                        </p>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditAppointment(appointment)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {appointment.status === 'scheduled' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus(appointment.id, 'completed')}>
                            <Check className="h-4 w-4 mr-2" />
                            Mark Complete
                          </DropdownMenuItem>
                        )}
                        {appointment.status === 'scheduled' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus(appointment.id, 'cancelled')}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => onDeleteAppointment(appointment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDayModal;