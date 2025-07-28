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
import { User, Mail, Phone, DollarSign, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  business_id: string;
  location_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  hourly_rate: number | null;
  commission_rate: number | null;
  hire_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
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
    }
  }, [businessData]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedEmployee(null);
              setFormData({
                name: "",
                email: "",
                phone: "",
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
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {getLocationName(employee.location_id)}
                </div>
                {employee.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {employee.email}
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {employee.phone}
                  </div>
                )}
                {employee.hourly_rate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    ${employee.hourly_rate}/hr
                    {employee.commission_rate && ` • ${employee.commission_rate}% commission`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}