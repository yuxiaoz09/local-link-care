import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessSetup } from "@/hooks/useBusinessSetup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Phone, DollarSign, Plus, Edit, Trash2, BarChart3, Users, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EmployeeAnalyticsCard } from "@/components/employees/EmployeeAnalyticsCard";
import { EmployeeServiceSpecializations } from "@/components/employees/EmployeeServiceSpecializations";

interface Employee {
  id: string;
  business_id: string;
  location_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: string | null;
  hourly_rate: number | null;
  commission_rate: number | null;
  hire_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WeeklyScheduleStatus {
  monday: 'off' | 'working' | 'cancelled';
  tuesday: 'off' | 'working' | 'cancelled';
  wednesday: 'off' | 'working' | 'cancelled';
  thursday: 'off' | 'working' | 'cancelled';
  friday: 'off' | 'working' | 'cancelled';
  saturday: 'off' | 'working' | 'cancelled';
  sunday: 'off' | 'working' | 'cancelled';
}

interface Location {
  id: string;
  name: string;
}

export default function Employees() {
  const { user } = useAuth();
  const { businessData } = useBusinessSetup();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profiles");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    role: "",
    location_id: "",
    hourly_rate: "",
    commission_rate: "",
    hire_date: "",
    is_active: true,
  });

  const roles = ["Manager", "Stylist", "Receptionist", "Assistant", "Barber", "Therapist"];

  useEffect(() => {
    if (businessData?.id) {
      fetchEmployees();
      fetchLocations();
      if (activeTab === "analytics") {
        fetchAnalytics();
      }
    }
  }, [businessData, activeTab]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("business_id", businessData?.id)
        .order("name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("business_id", businessData?.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchAnalytics = async () => {
    if (!businessData?.id) return;
    
    setAnalyticsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_employee_analytics", {
        business_uuid: businessData.id,
      });

      if (error) throw error;
      setAnalyticsData(data || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load employee analytics",
        variant: "destructive",
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return "All Locations";
    const location = locations.find(l => l.id === locationId);
    return location?.name || "Unknown Location";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessData?.id) return;

    try {
      const employeeData = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        role: formData.role || null,
        location_id: formData.location_id || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
        hire_date: formData.hire_date || null,
        is_active: formData.is_active,
      };

      if (selectedEmployee) {
        // Update existing employee
        const { error } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", selectedEmployee.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Employee updated successfully",
        });
      } else {
        // Create new employee
        const { error } = await supabase
          .from("employees")
          .insert([
            {
              ...employeeData,
              business_id: businessData.id,
            },
          ]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Employee created successfully",
        });
      }

      setIsDialogOpen(false);
      setSelectedEmployee(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        role: "",
        location_id: "",
        hourly_rate: "",
        commission_rate: "",
        hire_date: "",
        is_active: true,
      });
      fetchEmployees();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast({
        title: "Error",
        description: "Failed to save employee",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || "",
      phone: employee.phone || "",
      address: employee.address || "",
      role: employee.role || "",
      location_id: employee.location_id || "",
      hourly_rate: employee.hourly_rate?.toString() || "",
      commission_rate: employee.commission_rate?.toString() || "",
      hire_date: employee.hire_date || "",
      is_active: employee.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const maxRevenue = Math.max(...analyticsData.map(emp => emp.total_revenue), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">Manage your team members and track performance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedEmployee(null);
              setFormData({
                name: "",
                email: "",
                phone: "",
                address: "",
                role: "",
                location_id: "",
                hourly_rate: "",
                commission_rate: "",
                hire_date: "",
                is_active: true,
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedEmployee ? "Edit Employee" : "Add New Employee"}
              </DialogTitle>
              <DialogDescription>
                {selectedEmployee ? "Update employee information" : "Add a new team member"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Select value={formData.location_id} onValueChange={(value) => setFormData({ ...formData, location_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="commission_rate">Commission (%)</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.01"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <Button type="submit" className="w-full">
                {selectedEmployee ? "Update Employee" : "Create Employee"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Employee Profiles
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance Analytics
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-6">
          {employees.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No employees yet</h3>
                <p className="text-muted-foreground">Add your first team member to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((employee) => (
                <Card key={employee.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {employee.name}
                          {!employee.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </CardTitle>
                        {employee.role && (
                          <CardDescription>{employee.role}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(employee.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {getLocationName(employee.location_id)}
                      </div>
                      {employee.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{employee.email}</span>
                        </div>
                      )}
                      {employee.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{employee.phone}</span>
                        </div>
                      )}
                      {employee.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{employee.address}</span>
                        </div>
                      )}
                      {employee.hourly_rate && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          ${employee.hourly_rate}/hr
                          {employee.commission_rate && ` • ${employee.commission_rate}% commission`}
                        </div>
                      )}
                    </div>
                    
                    {/* Weekly Schedule */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Weekly Schedule</div>
                      <div className="flex items-center justify-between">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                          // Mock schedule data - in real app this would come from database
                          const scheduleStatus = ['working', 'working', 'off', 'working', 'working', 'cancelled', 'off'][index] as 'working' | 'off' | 'cancelled';
                          
                          return (
                            <div key={day} className="flex flex-col items-center gap-1">
                              <div className="text-xs text-muted-foreground">{day}</div>
                              <div 
                                className={`w-3 h-3 rounded-full border-2 ${
                                  scheduleStatus === 'working' 
                                    ? 'bg-green-500 border-green-500' 
                                    : scheduleStatus === 'cancelled'
                                    ? 'bg-red-500 border-red-500'
                                    : 'bg-transparent border-muted-foreground'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">Loading analytics...</div>
          ) : analyticsData.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No analytics data yet</h3>
                <p className="text-muted-foreground">Complete some appointments to see employee performance metrics</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">
                          ${analyticsData.reduce((sum, emp) => sum + emp.total_revenue, 0).toFixed(2)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Employees</p>
                        <p className="text-2xl font-bold">{employees.filter(emp => emp.is_active).length}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Appointments</p>
                        <p className="text-2xl font-bold">
                          {analyticsData.reduce((sum, emp) => sum + emp.completed_appointments, 0)}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Avg Commission</p>
                        <p className="text-2xl font-bold">
                          ${(analyticsData.reduce((sum, emp) => sum + emp.commission_earned, 0) / Math.max(analyticsData.length, 1)).toFixed(2)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Employee Performance Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {analyticsData.map((employee) => (
                  <EmployeeAnalyticsCard
                    key={employee.employee_id}
                    employee={employee}
                    maxRevenue={maxRevenue}
                  />
                ))}
              </div>

              {/* Rankings */}
              <Card>
                <CardHeader>
                  <CardTitle>Employee Rankings</CardTitle>
                  <CardDescription>Top performers by various metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3">
                    {/* Top Revenue */}
                    <div>
                      <h4 className="font-semibold mb-3">Top Revenue Generators</h4>
                      <div className="space-y-2">
                        {analyticsData
                          .sort((a, b) => b.total_revenue - a.total_revenue)
                          .slice(0, 3)
                          .map((emp, index) => (
                            <div key={emp.employee_id} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Badge variant={index === 0 ? "default" : "secondary"}>
                                  {index + 1}
                                </Badge>
                                <span className="text-sm">{emp.employee_name}</span>
                              </div>
                              <span className="text-sm font-medium">${emp.total_revenue.toFixed(2)}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Most Appointments */}
                    <div>
                      <h4 className="font-semibold mb-3">Most Appointments</h4>
                      <div className="space-y-2">
                        {analyticsData
                          .sort((a, b) => b.completed_appointments - a.completed_appointments)
                          .slice(0, 3)
                          .map((emp, index) => (
                            <div key={emp.employee_id} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Badge variant={index === 0 ? "default" : "secondary"}>
                                  {index + 1}
                                </Badge>
                                <span className="text-sm">{emp.employee_name}</span>
                              </div>
                              <span className="text-sm font-medium">{emp.completed_appointments}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Highest Avg Value */}
                    <div>
                      <h4 className="font-semibold mb-3">Highest Avg Value</h4>
                      <div className="space-y-2">
                        {analyticsData
                          .sort((a, b) => b.avg_appointment_value - a.avg_appointment_value)
                          .slice(0, 3)
                          .map((emp, index) => (
                            <div key={emp.employee_id} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Badge variant={index === 0 ? "default" : "secondary"}>
                                  {index + 1}
                                </Badge>
                                <span className="text-sm">{emp.employee_name}</span>
                              </div>
                              <span className="text-sm font-medium">${emp.avg_appointment_value.toFixed(2)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="management" className="mt-6">
          <div className="space-y-6">
            {employees.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No employees to manage</h3>
                  <p className="text-muted-foreground">Add employees to manage their service specializations</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {employees.map((employee) => (
                  <div key={employee.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {employee.role} • {getLocationName(employee.location_id)}
                        </p>
                      </div>
                      <Badge variant={employee.is_active ? "default" : "secondary"}>
                        {employee.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    {businessData?.id && (
                      <EmployeeServiceSpecializations
                        employeeId={employee.id}
                        employeeName={employee.name}
                        businessId={businessData.id}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}