import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { BusinessTypeSelection } from './BusinessTypeSelection';
import { ServiceTemplateSelection } from './ServiceTemplateSelection';
import { ServiceCustomization } from './ServiceCustomization';
import { StaffSetup } from './StaffSetup';
import { OnboardingComplete } from './OnboardingComplete';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingWizardProps {
  businessId: string;
  onComplete: () => void;
}

export interface OnboardingData {
  businessType: string;
  industryCategory: string;
  selectedServices: any[];
  customServices: any[];
  staffMembers: any[];
}

const STEPS = [
  { id: 1, title: 'Business Type', description: 'Select your business type' },
  { id: 2, title: 'Services', description: 'Choose & customize services' },
  { id: 3, title: 'Staff', description: 'Add team members' },
  { id: 4, title: 'Complete', description: 'Finish setup' }
];

export function OnboardingWizard({ businessId, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    businessType: '',
    industryCategory: '',
    selectedServices: [],
    customServices: [],
    staffMembers: []
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const progress = (currentStep / STEPS.length) * 100;

  // Load existing onboarding progress
  useEffect(() => {
    loadOnboardingProgress();
  }, [businessId]);

  const loadOnboardingProgress = async () => {
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('business_type, industry_category, onboarding_step')
        .eq('id', businessId)
        .single();

      if (business) {
        setOnboardingData(prev => ({
          ...prev,
          businessType: business.business_type || '',
          industryCategory: business.industry_category || ''
        }));
        setCurrentStep(business.onboarding_step || 1);
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
    }
  };

  const updateOnboardingStep = async (step: number, data?: Partial<OnboardingData>) => {
    try {
      await supabase
        .from('businesses')
        .update({ onboarding_step: step })
        .eq('id', businessId);

      if (data) {
        setOnboardingData(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  };

  const handleNext = async (stepData?: any) => {
    setLoading(true);
    try {
      if (stepData) {
        const updatedData = { ...onboardingData, ...stepData };
        setOnboardingData(updatedData);

        // Save business type and industry on step 1
        if (currentStep === 1) {
          await supabase
            .from('businesses')
            .update({
              business_type: stepData.businessType,
              industry_category: stepData.industryCategory
            })
            .eq('id', businessId);
        }
      }

      const nextStep = currentStep + 1;
      await updateOnboardingStep(nextStep);
      setCurrentStep(nextStep);
    } catch (error) {
      console.error('Error proceeding to next step:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateOnboardingStep(prevStep);
    }
  };

  const handleComplete = async (finalData?: any) => {
    setLoading(true);
    try {
      // Mark onboarding as completed
      await supabase
        .from('businesses')
        .update({ 
          onboarding_completed: true,
          onboarding_step: 5 
        })
        .eq('id', businessId);

      // Update onboarding progress
      await supabase
        .from('onboarding_progress')
        .upsert({
          business_id: businessId,
          business_type_selected: true,
          services_added_count: onboardingData.selectedServices.length + onboardingData.customServices.length,
          staff_added_count: onboardingData.staffMembers.length,
          completed_at: new Date().toISOString()
        });

      toast({
        title: "Onboarding Complete!",
        description: "Your business setup is now complete.",
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessTypeSelection
            onNext={handleNext}
            initialData={onboardingData}
            loading={loading}
          />
        );
      case 2:
        return (
          <ServiceTemplateSelection
            industryCategory={onboardingData.industryCategory}
            onNext={handleNext}
            onBack={handleBack}
            initialData={onboardingData}
            loading={loading}
          />
        );
      case 3:
        return (
          <StaffSetup
            businessId={businessId}
            services={[...onboardingData.selectedServices, ...onboardingData.customServices]}
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
          />
        );
      case 4:
        return (
          <OnboardingComplete
            businessId={businessId}
            onboardingData={onboardingData}
            onComplete={handleComplete}
            onBack={handleBack}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Your Business Setup</h1>
          <p className="text-muted-foreground">Let's get your business up and running in just a few steps</p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="mb-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Step {currentStep} of {STEPS.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="mb-4" />
            </div>
            
            <div className="flex justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center text-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors ${
                    currentStep > step.id
                      ? 'bg-primary text-primary-foreground'
                      : currentStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">{step.id}</span>
                    )}
                  </div>
                  <div className="text-xs">
                    <div className="font-medium">{step.title}</div>
                    <div className="text-muted-foreground">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        {renderCurrentStep()}
      </div>
    </div>
  );
}