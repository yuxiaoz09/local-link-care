/**
 * Security monitoring and audit component
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, Eye } from 'lucide-react';

interface SecurityAuditEntry {
  id: string;
  action: string;
  resource: string;
  risk_score: number;
  created_at: string;
  details?: any;
}

interface SecurityMonitorProps {
  businessId: string;
  className?: string;
}

export function SecurityMonitor({ businessId, className }: SecurityMonitorProps) {
  const [auditLogs, setAuditLogs] = React.useState<SecurityAuditEntry[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      // This would be implemented with proper RLS policies
      // For now, showing the structure for future implementation
      console.log('Loading audit logs for business:', businessId);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAuditLogs();
  }, [businessId]);

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 7) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />High Risk</Badge>;
    } else if (riskScore >= 4) {
      return <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" />Medium Risk</Badge>;
    } else {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Low Risk</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <div>
              <CardTitle>Security Monitor</CardTitle>
              <CardDescription>Recent security events and audit logs</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadAuditLogs} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent security events
            </p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{log.action}</span>
                    {getRiskBadge(log.risk_score)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.resource} • {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}