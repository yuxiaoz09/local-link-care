import React from 'react';
import { Card } from '@/components/ui/card';
import { RevenueResult } from '@/types/chat';
import { DollarSign, Users, Calendar, TrendingUp } from 'lucide-react';

interface RevenueCardProps {
  revenue: RevenueResult;
}

export const RevenueCard: React.FC<RevenueCardProps> = ({ revenue }) => {
  return (
    <Card className="p-4 bg-background border">
      <div className="space-y-4">
        {/* Main Revenue */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <span className="text-3xl font-bold text-primary">
              ${revenue.total_revenue.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Total Revenue</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-semibold text-lg">{revenue.appointment_count}</span>
            </div>
            <p className="text-xs text-muted-foreground">Appointments</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold text-lg">{revenue.unique_customers}</span>
            </div>
            <p className="text-xs text-muted-foreground">Customers</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-semibold text-lg">${revenue.avg_transaction_value.toFixed(0)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Avg Value</p>
          </div>
        </div>

        {/* Performance Indicators */}
        {revenue.appointment_count > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Revenue per appointment:</span>
              <span className="font-medium">
                ${(revenue.total_revenue / revenue.appointment_count).toFixed(2)}
              </span>
            </div>
            {revenue.unique_customers > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Revenue per customer:</span>
                <span className="font-medium">
                  ${(revenue.total_revenue / revenue.unique_customers).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};