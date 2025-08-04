import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, DollarSign, Users, Package, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: string | null;
  hourly_rate: number | null;
  commission_rate: number | null;
  hire_date: string | null;
  is_active: boolean;
}

interface EmployeeStats {
  hoursWorked: number;
  totalRevenue: number;
  appointmentCount: number;
  commissionEarned: number;
}

interface RecentCustomer {
  customer_name: string;
  service_name: string;
  appointment_date: string;
  price: number;
}

interface EmployeeDetailDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
}

export function EmployeeDetailDialog({ employee, isOpen, onClose, businessId }: EmployeeDetailDialogProps) {
  const [stats, setStats] = useState<EmployeeStats>({
    hoursWorked: 0,
    totalRevenue: 0,
    appointmentCount: 0,
    commissionEarned: 0,
  });
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [payPeriodFrequency] = useState("biweekly"); // This could be fetched from business settings
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee && isOpen) {
      fetchEmployeeStats();
      fetchRecentCustomers();
    }
  }, [employee, isOpen]);

  const fetchEmployeeStats = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      // Get pay period start date (for biweekly, last 14 days)
      const payPeriodDays = payPeriodFrequency === "weekly" ? 7 : 14;
      const payPeriodStart = new Date();
      payPeriodStart.setDate(payPeriodStart.getDate() - payPeriodDays);

      // Fetch appointments for this employee in the current pay period
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("price, start_time, end_time")
        .eq("employee_id", employee.id)
        .eq("business_id", businessId)
        .eq("status", "completed")
        .gte("start_time", payPeriodStart.toISOString());

      if (appointmentsError) throw appointmentsError;

      // Calculate hours worked (assuming each appointment duration)
      const hoursWorked = appointments?.reduce((total, apt) => {
        const start = new Date(apt.start_time);
        const end = new Date(apt.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0) || 0;

      const totalRevenue = appointments?.reduce((total, apt) => total + (apt.price || 0), 0) || 0;
      const appointmentCount = appointments?.length || 0;
      const commissionEarned = employee.commission_rate 
        ? (totalRevenue * (employee.commission_rate / 100))
        : 0;

      setStats({
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        totalRevenue,
        appointmentCount,
        commissionEarned,
      });
    } catch (error) {
      console.error("Error fetching employee stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCustomers = async () => {
    if (!employee) return;

    try {
      // Fetch recent appointments with customer and service info
      const { data: recentAppointments, error } = await supabase
        .from("appointments")
        .select(`
          start_time,
          price,
          title,
          offering_id,
          customers!inner(name)
        `)
        .eq("employee_id", employee.id)
        .eq("business_id", businessId)
        .eq("status", "completed")
        .order("start_time", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get offering names for appointments that have offering_id
      const offeringIds = recentAppointments?.filter(apt => apt.offering_id).map(apt => apt.offering_id) || [];
      let offerings: any[] = [];
      
      if (offeringIds.length > 0) {
        const { data: offeringsData } = await supabase
          .from("offerings")
          .select("id, name")
          .in("id", offeringIds);
        offerings = offeringsData || [];
      }

      const formattedCustomers = recentAppointments?.map(apt => {
        const offering = offerings.find(o => o.id === apt.offering_id);
        return {
          customer_name: apt.customers?.name || "Unknown Customer",
          service_name: offering?.name || apt.title || "Service",
          appointment_date: apt.start_time,
          price: apt.price || 0,
        };
      }) || [];

      setRecentCustomers(formattedCustomers);
    } catch (error) {
      console.error("Error fetching recent customers:", error);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {employee.name}
              {!employee.is_active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <Badge variant="outline">{employee.role || "Employee"}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {employee.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{employee.email}</span>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee.address && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-right max-w-xs">{employee.address}</span>
                  </div>
                )}
                {employee.hire_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hire Date:</span>
                    <span>{format(new Date(employee.hire_date), "MMM dd, yyyy")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pay Period Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Current Pay Period
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Frequency: {payPeriodFrequency === "weekly" ? "Weekly" : "Bi-weekly"}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Hours Worked:</span>
                    <span className="font-semibold">{loading ? "..." : `${stats.hoursWorked}h`}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Appointments:</span>
                    <span className="font-semibold">{loading ? "..." : stats.appointmentCount}</span>
                  </div>
                  {employee.hourly_rate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Hourly Rate:</span>
                      <span className="font-semibold">${employee.hourly_rate}/hr</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue & Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Revenue Generated:</span>
                    <span className="font-semibold text-green-600">
                      {loading ? "..." : `$${stats.totalRevenue.toFixed(2)}`}
                    </span>
                  </div>
                  {employee.commission_rate && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Commission Rate:</span>
                        <span className="font-semibold">{employee.commission_rate}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Commission Earned:</span>
                        <span className="font-semibold text-blue-600">
                          {loading ? "..." : `$${stats.commissionEarned.toFixed(2)}`}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Recent Customers & Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Customer Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent customer activity
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentCustomers.map((customer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{customer.customer_name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {customer.service_name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            ${customer.price.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(customer.appointment_date), "MMM dd")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}