import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessSetup } from "@/hooks/useBusinessSetup";
import { sanitizeText, isValidEmail, isValidPhone, logSecurityEvent } from "@/lib/security";

interface Business {
  id: string;
  name: string;
  owner_email: string;
  phone: string | null;
  address: string | null;
}

export default function Settings() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { refetch } = useBusinessSetup();

  useEffect(() => {
    fetchBusiness();
  }, []);

  const fetchBusiness = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user found");
        setLoading(false);
        return;
      }

      console.log("Fetching business for user:", user.id);
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching business:", error);
        if (error.code === 'PGRST116') {
          // No business found - this is expected for new users
          console.log("No business found for user, this is normal for new users");
          setBusiness(null);
          setName("");
          setOwnerEmail("");
          setPhone("");
          setAddress("");
        } else {
          toast({
            title: "Load Error",
            description: "Failed to load business information. Please try refreshing the page.",
            variant: "destructive",
          });
        }
      } else if (data) {
        console.log("Business data loaded:", data);
        setBusiness(data);
        setName(data.name);
        setOwnerEmail(data.owner_email);
        setPhone(data.phone || "");
        setAddress(data.address || "");
      }
    } catch (error) {
      console.error("Unexpected error fetching business:", error);
      toast({
        title: "Load Error",
        description: "An unexpected error occurred while loading business information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Security: Validate and sanitize inputs
    const sanitizedName = sanitizeText(name);
    const sanitizedEmail = sanitizeText(ownerEmail);
    
    if (!sanitizedName.trim() || !sanitizedEmail.trim()) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    // Security: Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Security: Validate phone if provided
    if (phone && !isValidPhone(phone)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Security: Sanitize all inputs
      const businessData = {
        name: sanitizedName,
        owner_email: sanitizedEmail,
        phone: phone ? sanitizeText(phone) : null,
        address: address ? sanitizeText(address) : null,
      };

      console.log("Saving business data:", businessData);
      console.log("Current business state:", business);

      let error;
      let result;
      
      if (business && business.id) {
        console.log("Updating existing business with ID:", business.id);
        ({ data: result, error } = await supabase
          .from("businesses")
          .update(businessData)
          .eq("id", business.id)
          .select()
          .single());
      } else {
        console.log("Creating new business");
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        ({ data: result, error } = await supabase
          .from("businesses")
          .insert([{ ...businessData, user_id: user.id }])
          .select()
          .single());
      }

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Save successful, result:", result);
      
      toast({
        title: "Success",
        description: "Business information saved successfully",
      });

      // Update local state with the saved data
      if (result) {
        setBusiness(result);
      }
      
      // Refresh the business setup hook state
      refetch();
    } catch (error) {
      console.error("Error saving business:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to save business information";
      if (error.code === '23505') {
        errorMessage = "A business profile already exists for this account";
      } else if (error.message?.includes('user_id')) {
        errorMessage = "Authentication error. Please sign out and sign back in.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      toast({
        title: "Save Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your business name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Owner Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, State 12345"
                  rows={3}
                />
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Management */}
      <Card>
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage your account settings and authentication.
            </p>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Information */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Simple CRM for Small Businesses
            </p>
            <p className="text-sm text-muted-foreground">
              Manage customers, appointments, and tasks all in one place.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}