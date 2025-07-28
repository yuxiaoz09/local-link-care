import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessSetup } from "@/hooks/useBusinessSetup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MapPin, Phone, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Location {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  manager_id: string | null;
  operating_hours: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Locations() {
  const { user } = useAuth();
  const { businessData } = useBusinessSetup();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    is_active: true,
  });

  useEffect(() => {
    if (businessData?.id) {
      fetchLocations();
    }
  }, [businessData]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("business_id", businessData?.id)
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessData?.id) return;

    try {
      if (selectedLocation) {
        // Update existing location
        const { error } = await supabase
          .from("locations")
          .update(formData)
          .eq("id", selectedLocation.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Location updated successfully",
        });
      } else {
        // Create new location
        const { error } = await supabase
          .from("locations")
          .insert([
            {
              ...formData,
              business_id: businessData.id,
            },
          ]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Location created successfully",
        });
      }

      setIsDialogOpen(false);
      setSelectedLocation(null);
      setFormData({ name: "", address: "", phone: "", is_active: true });
      fetchLocations();
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Error",
        description: "Failed to save location",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name,
      address: location.address || "",
      phone: location.phone || "",
      is_active: location.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", locationId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
      fetchLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast({
        title: "Error",
        description: "Failed to delete location",
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
          <h1 className="text-3xl font-bold">Locations</h1>
          <p className="text-muted-foreground">Manage your business locations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedLocation(null);
              setFormData({ name: "", address: "", phone: "", is_active: true });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedLocation ? "Edit Location" : "Add New Location"}
              </DialogTitle>
              <DialogDescription>
                {selectedLocation ? "Update location information" : "Create a new business location"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Location Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <Button type="submit" className="w-full">
                {selectedLocation ? "Update Location" : "Create Location"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
            <p className="text-muted-foreground">Add your first business location to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {location.name}
                      {!location.is_active && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                      )}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(location)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(location.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {location.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {location.address}
                  </div>
                )}
                {location.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {location.phone}
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