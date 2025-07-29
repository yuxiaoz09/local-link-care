import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  ArrowLeft, 
  Sparkles, 
  Users, 
  Wrench, 
  Calendar,
  DollarSign,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingData } from './OnboardingWizard';

interface OnboardingCompleteProps {
  businessId: string;
  onboardingData: OnboardingData;
  onComplete: () => void;
  onBack: () => void;
  loading: boolean;
}

export function OnboardingComplete({ 
  businessId, 
  onboardingData, 
  onComplete, 
  onBack, 
  loading 
}: OnboardingCompleteProps) {
  const [saving, setSaving] = useState(false);

  const totalServices = onboardingData.selectedServices.length + onboardingData.customServices.length;
  const totalStaff = onboardingData.staffMembers.length;

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save all services to the database
      const allServices = [...onboardingData.selectedServices, ...onboardingData.customServices];
      
      if (allServices.length > 0) {
        const servicesToInsert = allServices.map(service => ({
          business_id: businessId,
          type: 'service',
          name: service.name,
          category: service.category,
          description: service.description || null,
          base_price: service.base_price || 0,
          duration_minutes: service.duration_minutes || 60,
          requires_booking: true,
          allow_online_booking: true,
          is_active: true
        }));

        const { error: servicesError } = await supabase
          .from('offerings')
          .insert(servicesToInsert);

        if (servicesError) {
          console.error('Error saving services:', servicesError);
          throw servicesError;
        }
      }

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    {
      icon: Wrench,
      label: 'Services Added',
      value: totalServices,
      color: 'text-blue-600'
    },
    {
      icon: Users,
      label: 'Team Members',
      value: totalStaff,
      color: 'text-green-600'
    },
    {
      icon: Target,
      label: 'Business Type',
      value: onboardingData.businessType,
      color: 'text-purple-600'
    }
  ];

  const nextSteps = [
    {
      icon: Calendar,
      title: 'Create Your First Appointment',
      description: 'Start booking appointments with your new services',
      action: 'Go to Appointments'
    },
    {
      icon: Users,
      title: 'Add Your Customers',
      description: 'Import or manually add your customer database',
      action: 'Manage Customers'
    },
    {
      icon: DollarSign,
      title: 'Track Your Revenue',
      description: 'Monitor your business performance with analytics',
      action: 'View Analytics'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Congratulations! 🎉</CardTitle>
          <p className="text-muted-foreground">
            Your business setup is complete. You're ready to start managing your business with our platform.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Setup Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Setup Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <Card key={index} className="border-muted">
                    <CardContent className="p-4 text-center">
                      <IconComponent className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Services Overview */}
          {totalServices > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Your Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...onboardingData.selectedServices, ...onboardingData.customServices].map((service, index) => (
                  <Card key={index} className="border-muted">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{service.name}</h4>
                          <Badge variant="secondary" className="text-xs">{service.category}</Badge>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">${service.base_price}</div>
                          <div className="text-muted-foreground">{service.duration_minutes} min</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recommended Next Steps</h3>
            <div className="space-y-3">
              {nextSteps.map((step, index) => {
                const IconComponent = step.icon;
                return (
                  <Card key={index} className="border-muted hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{step.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                          <Button variant="outline" size="sm">
                            {step.action}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={loading || saving}
              size="lg"
              className="min-w-[150px]"
            >
              {saving ? 'Finalizing...' : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}