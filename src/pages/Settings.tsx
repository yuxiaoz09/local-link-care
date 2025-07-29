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
import { validateBusinessInput, sanitizeErrorMessage, logSecurityEvent, rateLimiter } from "@/lib/security";
import { validateBusinessName, validateEmail, validatePhone, validateAddress } from "@/lib/formValidation";

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
    
    // Security: Check rate limiting
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive",
      });
      return;
    }

    if (!rateLimiter.checkLimit('CUSTOMER_CREATION', user.id)) {
      toast({
        title: "Error",
        description: "Too many attempts. Please wait before trying again.",
        variant: "destructive",
      });
      logSecurityEvent('Rate limit exceeded', { action: 'settings_save', userId: user.id });
      return;
    }

    // Enhanced validation using new validation functions
    const nameValidation = validateBusinessName(name);
    const emailValidation = validateEmail(ownerEmail);
    const phoneValidation = validatePhone(phone, false);
    const addressValidation = validateAddress(address);

    const allErrors = [
      ...nameValidation.errors,
      ...emailValidation.errors,
      ...phoneValidation.errors,
      ...addressValidation.errors
    ];

    if (allErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: allErrors[0],
        variant: "destructive",
      });
      logSecurityEvent('Form validation failed', { errors: allErrors });
      return;
    }

    setSaving(true);
    try {
      // Use validated and sanitized data
      const businessData = {
        name,
        owner_email: ownerEmail,
        phone: phone || null,
        address: address || null,
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
      
      // Use secure error sanitization
      const sanitizedError = sanitizeErrorMessage(error);
      logSecurityEvent('Business save failed', { 
        error: error.message,
        businessId: business?.id 
      });
      
      toast({
        title: "Save Error",
        description: sanitizedError,
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