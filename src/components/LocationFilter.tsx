import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessSetup } from "@/hooks/useBusinessSetup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface LocationFilterProps {
  selectedLocationId: string | null;
  onLocationChange: (locationId: string | null) => void;
  showAllOption?: boolean;
}

export function LocationFilter({ 
  selectedLocationId, 
  onLocationChange, 
  showAllOption = true 
}: LocationFilterProps) {
  const { businessData } = useBusinessSetup();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessData?.id) {
      fetchLocations();
    }
  }, [businessData]);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading || locations.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedLocationId || "all"}
        onValueChange={(value) => onLocationChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">All Locations</SelectItem>
          )}
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}