import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logSecurityEvent } from '@/lib/security';

export type UserRole = 'owner' | 'admin' | 'manager' | 'employee';

interface UseUserRoleReturn {
  role: UserRole | null;
  loading: boolean;
  hasRole: (requiredRole: UserRole) => boolean;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  employee: 1
};

export function useUserRole(businessId?: string): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && businessId) {
      fetchUserRole();
    } else {
      setRole(null);
      setLoading(false);
    }
  }, [user, businessId]);

  const fetchUserRole = async () => {
    try {
      if (!user || !businessId) return;

      // First check if user is the business owner
      const { data: business } = await supabase
        .from('businesses')
        .select('user_id')
        .eq('id', businessId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (business) {
        setRole('owner');
        logSecurityEvent('Role check - Owner access', { businessId, userId: user.id });
        return;
      }

      // Check user roles table for other roles
      const { data: userRole, error } = await supabase
        .rpc('get_user_role', {
          _user_id: user.id,
          _business_id: businessId
        });

      if (error) {
        console.error('Error fetching user role:', error);
        logSecurityEvent('Role check failed', { 
          businessId, 
          userId: user.id, 
          error: error.message 
        });
        setRole(null);
        return;
      }

      setRole(userRole || null);
      
      if (userRole) {
        logSecurityEvent('Role check successful', { 
          businessId, 
          userId: user.id, 
          role: userRole 
        });
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      logSecurityEvent('Role check error', { 
        businessId, 
        userId: user?.id, 
        error: error.message 
      });
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!role) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
  };

  const hasPermission = (requiredRoles: UserRole[]): boolean => {
    if (!role) return false;
    return requiredRoles.some(requiredRole => hasRole(requiredRole));
  };

  return {
    role,
    loading,
    hasRole,
    hasPermission
  };
}