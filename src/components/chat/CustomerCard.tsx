import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomerResult } from '@/types/chat';
import { Phone, Mail, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface CustomerCardProps {
  customer: CustomerResult;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer }) => {
  const formatLastVisit = (date: string | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const getCustomerSegment = (totalSpent: number, appointmentCount: number) => {
    if (totalSpent > 1000 && appointmentCount > 10) return 'VIP';
    if (totalSpent > 500 && appointmentCount > 5) return 'Loyal';
    if (appointmentCount > 0) return 'Active';
    return 'New';
  };

  const segment = getCustomerSegment(customer.total_spent, customer.appointment_count);
  
  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'VIP': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Loyal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Active': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="p-4 bg-background border">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{customer.customer_name}</h3>
            <Badge className={`text-xs ${getSegmentColor(segment)}`}>
              {segment} Customer
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">${customer.total_spent.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Spent</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          {customer.customer_email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{customer.customer_email}</span>
            </div>
          )}
          {customer.customer_phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{customer.customer_phone}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-semibold">{customer.appointment_count}</span>
            </div>
            <p className="text-xs text-muted-foreground">Appointments</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-semibold">{formatLastVisit(customer.last_visit)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Last Visit</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Calendar className="h-3 w-3 mr-1" />
            Book
          </Button>
        </div>
      </div>
    </Card>
  );
};