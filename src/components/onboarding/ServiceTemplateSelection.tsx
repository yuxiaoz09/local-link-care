import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingData } from './OnboardingWizard';

interface ServiceTemplateSelectionProps {
  industryCategory: string;
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  initialData: OnboardingData;
  loading: boolean;
}

interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  suggested_price: number;
  suggested_duration: number;
}

export function ServiceTemplateSelection({ 
  industryCategory, 
  onNext, 
  onBack, 
  initialData,
  loading 
}: ServiceTemplateSelectionProps) {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    initialData.selectedServices.map(s => s.id) || []
  );
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    fetchServiceTemplates();
  }, [industryCategory]);

  const fetchServiceTemplates = async () => {
    if (!industryCategory || industryCategory === 'other') {
      setTemplates([]);
      setTemplatesLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_templates')
        .select('*')
        .eq('industry_category', industryCategory)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching service templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleServiceToggle = (templateId: string) => {
    setSelectedServices(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedServices.length === templates.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(templates.map(t => t.id));
    }
  };

  const handleNext = () => {
    const selectedTemplates = templates.filter(t => selectedServices.includes(t.id));
    onNext({
      selectedServices: selectedTemplates.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        description: template.description,
        base_price: template.suggested_price,
        duration_minutes: template.suggested_duration,
        type: 'service'
      }))
    });
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((groups, template) => {
    const category = template.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {} as Record<string, ServiceTemplate[]>);

  if (templatesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading service templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!templates.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Setup</CardTitle>
          <p className="text-muted-foreground">
            No pre-built templates available for your business type. You can add custom services in the next step.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={loading}>
              Skip Templates
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Your Services</CardTitle>
        <p className="text-muted-foreground">
          Select the services you offer. You can customize prices and details in the next step.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-sm">{selectedServices.length} services selected</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectedServices.length === templates.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-lg font-medium">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryTemplates.map((template) => {
                const isSelected = selectedServices.includes(template.id);
                
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:shadow-md'
                    }`}
                    onClick={() => handleServiceToggle(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}} // Handled by card click
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>${template.suggested_price}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{template.suggested_duration} min</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={loading}>
            {loading ? 'Saving...' : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}