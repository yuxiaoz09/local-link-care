import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBusinessSetup() {
  const [hasBusiness, setHasBusiness] = useState<boolean | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    console.log('🏢 useBusinessSetup: Effect triggered', { hasUser: !!user, userId: user?.id });
    if (user) {
      checkBusinessSetup();
    } else {
      console.log('🏢 useBusinessSetup: No user, setting loading to false');
      setLoading(false);
    }
  }, [user]);

  const checkBusinessSetup = async () => {
    console.log('🏢 useBusinessSetup: Starting business check for user', user?.id);
    try {
      if (!user) {
        console.log('🏢 useBusinessSetup: No user found, setting defaults');
        setHasBusiness(false);
        setLoading(false);
        return;
      }

      console.log('🏢 useBusinessSetup: Querying businesses table...');
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('🏢 useBusinessSetup: Query result', { data, error, hasData: !!data });

      if (error) {
        console.error("🏢 useBusinessSetup: Error checking business:", error);
        setHasBusiness(false);
        setBusinessData(null);
      } else {
        setHasBusiness(!!data);
        setBusinessData(data);
        console.log('🏢 useBusinessSetup: Business setup complete', { hasBusiness: !!data });
      }
    } catch (error) {
      console.error("🏢 useBusinessSetup: Catch block error:", error);
      setHasBusiness(false);
    } finally {
      console.log('🏢 useBusinessSetup: Setting loading to false');
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
    businessData,
    loading,
    createPlaceholderBusiness,
    refetch: checkBusinessSetup,
  };
}