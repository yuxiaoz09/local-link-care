import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, Plus, User, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StaffSetupProps {
  businessId: string;
  services: any[];
  onNext: (data: any) => void;
  onBack: () => void;
  loading: boolean;
}

interface StaffMember {
  id?: string;
  name: string;
  email: string;
  role: string;
  assignedServices: string[];
}

export function StaffSetup({ businessId, services, onNext, onBack, loading }: StaffSetupProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: '',
    assignedServices: [] as string[]
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleAddStaff = async () => {
    if (!newStaff.name.trim()) return;

    setSaving(true);
    try {
      // Save staff member to database
      const { data: employee, error } = await supabase
        .from('employees')
        .insert({
          business_id: businessId,
          name: newStaff.name,
          email: newStaff.email || null,
          role: newStaff.role || 'Staff Member'
        })
        .select()
        .single();

      if (error) throw error;

      const staffMember: StaffMember = {
        id: employee.id,
        ...newStaff
      };

      setStaffMembers([...staffMembers, staffMember]);
      setNewStaff({
        name: '',
        email: '',
        role: '',
        assignedServices: []
      });
      setIsAddingStaff(false);

      toast({
        title: "Staff member added",
        description: `${newStaff.name} has been added to your team.`
      });
    } catch (error) {
      console.error('Error adding staff member:', error);
      toast({
        title: "Error",
        description: "Failed to add staff member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      if (staffId.startsWith('temp-')) {
        // Remove from local state only
        setStaffMembers(staffMembers.filter(s => s.id !== staffId));
      } else {
        // Delete from database
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', staffId);

        if (error) throw error;
        setStaffMembers(staffMembers.filter(s => s.id !== staffId));
      }
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member.",
        variant: "destructive"
      });
    }
  };

  const handleServiceAssignment = (staffIndex: number, serviceId: string) => {
    const updatedStaff = [...staffMembers];
    const currentServices = updatedStaff[staffIndex].assignedServices;
    
    if (currentServices.includes(serviceId)) {
      updatedStaff[staffIndex].assignedServices = currentServices.filter(id => id !== serviceId);
    } else {
      updatedStaff[staffIndex].assignedServices = [...currentServices, serviceId];
    }
    
    setStaffMembers(updatedStaff);
  };

  const handleNext = async () => {
    // Save service assignments to database
    try {
      for (const staff of staffMembers) {
        if (staff.id && staff.assignedServices.length > 0) {
          // Create service assignments for existing offerings
          const existingServiceIds = services
            .filter(s => staff.assignedServices.includes(s.id))
            .map(s => s.id);

          if (existingServiceIds.length > 0) {
            const assignments = existingServiceIds.map(serviceId => ({
              employee_id: staff.id,
              offering_id: serviceId
            }));

            await supabase
              .from('staff_assignments')
              .upsert(assignments);
          }
        }
      }

      onNext({ staffMembers });
    } catch (error) {
      console.error('Error saving staff assignments:', error);
      toast({
        title: "Error",
        description: "Failed to save staff assignments.",
        variant: "destructive"
      });
    }
  };

  const handleSkip = () => {
    onNext({ staffMembers: [] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Your Team (Optional)</CardTitle>
        <p className="text-muted-foreground">
          Add team members and assign them to specific services. You can skip this step and add staff later.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {staffMembers.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Team Members</h3>
            {staffMembers.map((staff, index) => (
              <Card key={staff.id || index} className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        {staff.name}
                      </h4>
                      {staff.email && (
                        <p className="text-sm text-muted-foreground">{staff.email}</p>
                      )}
                      {staff.role && (
                        <Badge variant="secondary" className="mt-1">{staff.role}</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => staff.id && handleDeleteStaff(staff.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {services.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Assign Services</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {services.map((service) => (
                          <div key={service.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={staff.assignedServices.includes(service.id)}
                              onCheckedChange={() => handleServiceAssignment(index, service.id)}
                            />
                            <span className="text-sm">{service.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Staff Dialog */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Add Team Member</h3>
          <Dialog open={isAddingStaff} onOpenChange={setIsAddingStaff}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="Enter staff member name..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <Input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    placeholder="Enter email address..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role (Optional)</Label>
                  <Input
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    placeholder="e.g. Stylist, Manager, Technician..."
                  />
                </div>
                <Button 
                  onClick={handleAddStaff} 
                  className="w-full"
                  disabled={!newStaff.name.trim() || saving}
                >
                  {saving ? 'Adding...' : 'Add Team Member'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip for Now
            </Button>
            <Button onClick={handleNext} disabled={loading}>
              {loading ? 'Saving...' : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}