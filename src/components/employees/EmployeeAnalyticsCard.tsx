import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Calendar, TrendingUp, Clock } from "lucide-react";

interface EmployeeAnalyticsData {
  employee_id: string;
  employee_name: string;
  employee_role: string;
  location_name: string;
  hire_date: string;
  hourly_rate: number;
  commission_rate: number;
  total_appointments: number;
  completed_appointments: number;
  total_revenue: number;
  commission_earned: number;
  avg_appointment_value: number;
  last_appointment_date: string;
  appointments_this_month: number;
  revenue_this_month: number;
}

interface EmployeeAnalyticsCardProps {
  employee: EmployeeAnalyticsData;
  maxRevenue: number;
}

export function EmployeeAnalyticsCard({ employee, maxRevenue }: EmployeeAnalyticsCardProps) {
  const completionRate = employee.total_appointments > 0 
    ? (employee.completed_appointments / employee.total_appointments) * 100 
    : 0;
  
  const revenuePercentage = maxRevenue > 0 ? (employee.total_revenue / maxRevenue) * 100 : 0;
  
  const daysSinceLastAppointment = employee.last_appointment_date 
    ? Math.floor((new Date().getTime() - new Date(employee.last_appointment_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{employee.employee_name}</CardTitle>
            <div className="flex gap-2 mt-1">
              {employee.employee_role && (
                <Badge variant="secondary">{employee.employee_role}</Badge>
              )}
              <Badge variant="outline">{employee.location_name}</Badge>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            {employee.hire_date && (
              <div>Hired: {new Date(employee.hire_date).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Metrics */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <span className="font-bold">${employee.total_revenue.toFixed(2)}</span>
          </div>
          <Progress value={revenuePercentage} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">This Month</div>
              <div className="font-medium">${employee.revenue_this_month.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Commission</div>
              <div className="font-medium">${employee.commission_earned.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Appointment Metrics */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Appointments</span>
            </div>
            <span className="font-bold">{employee.completed_appointments}/{employee.total_appointments}</span>
          </div>
          <Progress value={completionRate} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">This Month</div>
              <div className="font-medium">{employee.appointments_this_month}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Value</div>
              <div className="font-medium">${employee.avg_appointment_value.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <span className="text-sm">Performance</span>
          </div>
          <Badge variant={completionRate >= 90 ? "default" : completionRate >= 70 ? "secondary" : "destructive"}>
            {completionRate.toFixed(1)}% completion
          </Badge>
        </div>

        {daysSinceLastAppointment !== null && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm">Last appointment</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {daysSinceLastAppointment === 0 ? 'Today' : `${daysSinceLastAppointment} days ago`}
            </span>
          </div>
        )}

        {/* Rates */}
        {(employee.hourly_rate || employee.commission_rate) && (
          <div className="flex justify-between text-sm">
            {employee.hourly_rate && (
              <div>
                <span className="text-muted-foreground">Rate: </span>
                <span className="font-medium">${employee.hourly_rate}/hr</span>
              </div>
            )}
            {employee.commission_rate && (
              <div>
                <span className="text-muted-foreground">Commission: </span>
                <span className="font-medium">{employee.commission_rate}%</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}