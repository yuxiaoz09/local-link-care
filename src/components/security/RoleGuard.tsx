import { ReactNode } from 'react';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldX } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  requiredRoles: UserRole[];
  businessId?: string;
  fallback?: ReactNode;
  showUnauthorized?: boolean;
}

export function RoleGuard({ 
  children, 
  requiredRoles, 
  businessId, 
  fallback,
  showUnauthorized = true 
}: RoleGuardProps) {
  const { hasPermission, loading } = useUserRole(businessId);

  if (loading) {
    return <div className="flex items-center justify-center p-4">Loading permissions...</div>;
  }

  if (!hasPermission(requiredRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUnauthorized) {
      return (
        <Alert variant="destructive">
          <ShieldX className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature. Required roles: {requiredRoles.join(', ')}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
}