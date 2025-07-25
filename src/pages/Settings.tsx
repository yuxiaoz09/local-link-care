import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

  useEffect(() => {
    fetchBusiness();
  }, []);

  const fetchBusiness = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setBusiness(data);
        setName(data.name);
        setOwnerEmail(data.owner_email);
        setPhone(data.phone || "");
        setAddress(data.address || "");
      }
    } catch (error) {
      console.error("Error fetching business:", error);
      toast({
        title: "Error",
        description: "Failed to load business information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerEmail.trim()) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const businessData = {
        name: name.trim(),
        owner_email: ownerEmail.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      };

      let error;
      if (business) {
        ({ error } = await supabase
          .from("businesses")
          .update(businessData)
          .eq("id", business.id));
      } else {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        ({ error } = await supabase
          .from("businesses")
          .insert([{ ...businessData, user_id: user.id }]));
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: "Business information saved successfully",
      });

      // Refresh the business data
      fetchBusiness();
    } catch (error) {
      console.error("Error saving business:", error);
      toast({
        title: "Error",
        description: "Failed to save business information",
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