import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Check, X } from 'lucide-react';
import AppointmentDayModal from './AppointmentDayModal';

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

interface AppointmentCalendarProps {
  appointments: Appointment[];
  currentDate: Date;
  onEditAppointment: (appointment: Appointment) => void;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onAddAppointment?: () => void;
}

const AppointmentCalendar = ({
  appointments,
  currentDate,
  onEditAppointment,
  onUpdateStatus,
  onDeleteAppointment,
  onAddAppointment,
}: AppointmentCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  // Get first day of month and number of days
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

  // Generate calendar days
  const calendarDays = [];
  const currentCalendarDate = new Date(startDate);
  
  for (let week = 0; week < 6; week++) {
    const weekDays = [];
    for (let day = 0; day < 7; day++) {
      weekDays.push(new Date(currentCalendarDate));
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }
    calendarDays.push(weekDays);
    
    // Stop if we've covered the current month
    if (currentCalendarDate.getMonth() !== currentDate.getMonth() && week >= 4) {
      break;
    }
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => 
      apt.start_time.startsWith(dateStr)
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

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

const handleDayClick = (date: Date) => {
  setSelectedDate(date);
  setIsDayModalOpen(true);
};

const getSelectedDayAppointments = () => {
  if (!selectedDate) return [];
  const dateStr = selectedDate.toISOString().split('T')[0];
  return appointments.filter(apt => 
    apt.start_time.startsWith(dateStr)
  );
};

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {calendarDays.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((date, dayIndex) => {
              const dayAppointments = getAppointmentsForDate(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDay = isToday(date);

              return (
                <Card 
                  key={dayIndex} 
                  className={`min-h-32 cursor-pointer hover:shadow-md transition-shadow ${
                    !isCurrentMonthDay ? 'opacity-40' : ''
                  } ${isTodayDay ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handleDayClick(date)}
                >
                  <CardContent className="p-2">
                    <div className={`text-sm font-medium mb-2 ${
                      isTodayDay ? 'text-primary' : 
                      isCurrentMonthDay ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm ${getStatusColor(appointment.status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="truncate flex-1">
                              <div className="font-medium truncate">
                                {new Date(appointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="truncate">{appointment.title}</div>
                              <div className="truncate text-xs opacity-75">
                                {appointment.customers?.name}
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditAppointment(appointment)}>
                                  <Edit className="h-3 w-3 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {appointment.status === 'scheduled' && (
                                  <DropdownMenuItem onClick={() => onUpdateStatus(appointment.id, 'completed')}>
                                    <Check className="h-3 w-3 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                {appointment.status === 'scheduled' && (
                                  <DropdownMenuItem onClick={() => onUpdateStatus(appointment.id, 'cancelled')}>
                                    <X className="h-3 w-3 mr-2" />
                                    Cancel
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => onDeleteAppointment(appointment.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                      
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      {/* Day Modal */}
      <AppointmentDayModal
        open={isDayModalOpen}
        onOpenChange={setIsDayModalOpen}
        date={selectedDate}
        appointments={getSelectedDayAppointments()}
        onEditAppointment={onEditAppointment}
        onUpdateStatus={onUpdateStatus}
        onDeleteAppointment={onDeleteAppointment}
        onAddAppointment={() => {
          setIsDayModalOpen(false);
          onAddAppointment?.();
        }}
      />
    </div>
  );
};

export default AppointmentCalendar;