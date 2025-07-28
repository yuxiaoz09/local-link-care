import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBusinessSetup() {
  const [hasBusiness, setHasBusiness] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkBusinessSetup();
    }
  }, [user]);

  const checkBusinessSetup = async () => {
    try {
      if (!user) {
        setHasBusiness(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("id")
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking business:", error);
        setHasBusiness(false);
      } else {
        setHasBusiness(!!data);
      }
    } catch (error) {
      console.error("Error checking business setup:", error);
      setHasBusiness(false);
    } finally {
      setLoading(false);
    }
  };

  const createPlaceholderBusiness = async () => {
    if (!user) return false;

    try {
      // First check if business already exists
      const { data: existingBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingBusiness) {
        setHasBusiness(true);
        return true;
      }

      const placeholderBusiness = {
        name: "My Business",
        owner_email: user.email || "owner@example.com",
        phone: "(555) 123-4567",
        address: "123 Main Street, City, State 12345",
        user_id: user.id,
      };

      const { error } = await supabase
        .from("businesses")
        .insert([placeholderBusiness]);

      if (error) throw error;

      setHasBusiness(true);
      return true;
    } catch (error) {
      console.error("Error creating placeholder business:", error);
      return false;
    }
  };

  return {
    hasBusiness,
    loading,
    createPlaceholderBusiness,
    refetch: checkBusinessSetup,
  };
}