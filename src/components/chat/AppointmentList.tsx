import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppointmentResult } from '@/types/chat';
import { Calendar, Clock, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentListProps {
  appointments: AppointmentResult[];
}

export const AppointmentList: React.FC<AppointmentListProps> = ({ appointments }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'no-show': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: format(date, 'MMM dd'),
      time: format(date, 'h:mm a'),
    };
  };

  if (appointments.length === 0) {
    return (
      <Card className="p-4 bg-background border text-center">
        <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No appointments found</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-background border">
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Appointments ({appointments.length})</h3>
        </div>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {appointments.slice(0, 10).map((appointment) => {
            const { date, time } = formatDateTime(appointment.start_time);
            
            return (
              <div
                key={appointment.appointment_id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="text-center min-w-[60px]">
                  <p className="text-xs font-medium text-primary">{date}</p>
                  <p className="text-xs text-muted-foreground">{time}</p>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {appointment.appointment_title}
                    </h4>
                    <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="truncate">{appointment.customer_name}</span>
                    </div>
                    {appointment.price > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${appointment.price.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {appointments.length > 10 && (
            <p className="text-xs text-muted-foreground text-center pt-2 border-t">
              ... and {appointments.length - 10} more appointments
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};