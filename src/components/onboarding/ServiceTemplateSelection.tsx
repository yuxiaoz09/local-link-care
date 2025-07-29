import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowRight, ArrowLeft, Clock, DollarSign, CheckCircle, Plus, Edit2, Trash2 } from 'lucide-react';
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

interface CustomService {
  id: string;
  name: string;
  category: string;
  description?: string;
  base_price: number;
  duration_minutes: number;
  type: 'service';
}

const SERVICE_CATEGORIES = [
  'Haircuts',
  'Coloring',
  'Styling',
  'Treatments',
  'Grooming',
  'Skincare',
  'Massage',
  'Nails',
  'Body Treatments',
  'Maintenance',
  'Repairs',
  'Diagnostics',
  'Tires',
  'Other'
];

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
  const [customServices, setCustomServices] = useState<CustomService[]>(
    initialData.customServices || []
  );
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    category: '',
    description: '',
    base_price: '',
    duration_minutes: ''
  });

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

  const handleAddCustomService = () => {
    if (!newService.name || !newService.category || !newService.base_price || !newService.duration_minutes) {
      return;
    }

    const customService: CustomService = {
      id: `custom-${Date.now()}`,
      name: newService.name,
      category: newService.category,
      description: newService.description,
      base_price: parseFloat(newService.base_price),
      duration_minutes: parseInt(newService.duration_minutes),
      type: 'service'
    };

    setCustomServices(prev => [...prev, customService]);
    setNewService({
      name: '',
      category: '',
      description: '',
      base_price: '',
      duration_minutes: ''
    });
    setIsDialogOpen(false);
  };

  const handleDeleteCustomService = (serviceId: string) => {
    setCustomServices(prev => prev.filter(s => s.id !== serviceId));
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
      })),
      customServices: customServices
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
            No pre-built templates available for your business type. Add your custom services below.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Custom Services Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Your Custom Services</h3>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Service</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Service Name</Label>
                      <Input
                        id="name"
                        value={newService.name}
                        onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter service name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newService.category}
                        onValueChange={(value) => setNewService(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={newService.description}
                        onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your service"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          value={newService.base_price}
                          onChange={(e) => setNewService(prev => ({ ...prev, base_price: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={newService.duration_minutes}
                          onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: e.target.value }))}
                          placeholder="30"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddCustomService} className="w-full">
                      Add Service
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {customServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customServices.map((service) => (
                  <Card key={service.id} className="border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{service.name}</h4>
                          <Badge variant="secondary" className="text-xs mb-2">{service.category}</Badge>
                          {service.description && (
                            <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>${service.base_price}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{service.duration_minutes} min</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomService(service.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No custom services added yet.</p>
                <p className="text-sm">Click "Add Service" to create your first service.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={loading || customServices.length === 0}>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose & Customize Your Services</CardTitle>
        <p className="text-muted-foreground">
          Add your own services or select from our pre-built templates below.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-sm">{selectedServices.length + customServices.length} services total</span>
          </div>
          {templates.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedServices.length === templates.length ? 'Deselect All Templates' : 'Select All Templates'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Custom Services Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Your Custom Services</h3>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Service</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Service Name</Label>
                    <Input
                      id="name"
                      value={newService.name}
                      onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter service name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newService.category}
                      onValueChange={(value) => setNewService(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newService.description}
                      onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your service"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={newService.base_price}
                        onChange={(e) => setNewService(prev => ({ ...prev, base_price: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newService.duration_minutes}
                        onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: e.target.value }))}
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddCustomService} className="w-full">
                    Add Service
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {customServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customServices.map((service) => (
                <Card key={service.id} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{service.name}</h4>
                        <Badge variant="secondary" className="text-xs mb-2">{service.category}</Badge>
                        {service.description && (
                          <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${service.base_price}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{service.duration_minutes} min</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCustomService(service.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>No custom services added yet.</p>
              <p className="text-sm">Click "Add Custom Service" to create your own.</p>
            </div>
          )}
        </div>

        {/* Pre-built Templates Section */}
        {templates.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Pre-built Service Templates</h3>
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-md font-medium">{category}</h4>
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
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={loading || (selectedServices.length === 0 && customServices.length === 0)}>
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