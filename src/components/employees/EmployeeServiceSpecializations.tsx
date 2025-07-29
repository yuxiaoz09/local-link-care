import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  base_price: number;
}

interface EmployeeService {
  service_id: string;
  service_name: string;
}

interface EmployeeServiceSpecializationsProps {
  employeeId: string;
  employeeName: string;
  businessId: string;
}

export function EmployeeServiceSpecializations({ 
  employeeId, 
  employeeName, 
  businessId 
}: EmployeeServiceSpecializationsProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [employeeServices, setEmployeeServices] = useState<EmployeeService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [employeeId, businessId]);

  const fetchData = async () => {
    try {
      // Fetch all services for the business
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, base_price")
        .eq("business_id", businessId)
        .order("name");

      if (servicesError) throw servicesError;

      // Fetch employee's current service specializations
      const { data: employeeServicesData, error: employeeServicesError } = await supabase
        .from("employee_services")
        .select(`
          service_id,
          services!inner(name)
        `)
        .eq("employee_id", employeeId);

      if (employeeServicesError) throw employeeServicesError;

      setServices(servicesData || []);
      
      const formattedEmployeeServices = employeeServicesData?.map(es => ({
        service_id: es.service_id,
        service_name: (es.services as any).name
      })) || [];
      
      setEmployeeServices(formattedEmployeeServices);
      setSelectedServices(formattedEmployeeServices.map(es => es.service_id));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load service data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, serviceId]);
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    }
  };

  const handleSave = async () => {
    try {
      // Remove all existing service assignments
      const { error: deleteError } = await supabase
        .from("employee_services")
        .delete()
        .eq("employee_id", employeeId);

      if (deleteError) throw deleteError;

      // Add new service assignments
      if (selectedServices.length > 0) {
        const { error: insertError } = await supabase
          .from("employee_services")
          .insert(
            selectedServices.map(serviceId => ({
              employee_id: employeeId,
              service_id: serviceId
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Service specializations updated successfully",
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving specializations:", error);
      toast({
        title: "Error",
        description: "Failed to update service specializations",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Service Specializations
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Service Specializations</DialogTitle>
                <DialogDescription>
                  Select services that {employeeName} can perform
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={service.id}
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={(checked) => 
                        handleServiceToggle(service.id, checked as boolean)
                      }
                    />
                    <label htmlFor={service.id} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span>{service.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ${service.base_price}
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {employeeServices.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No service specializations assigned
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {employeeServices.map((es) => (
              <Badge key={es.service_id} variant="secondary">
                {es.service_name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}