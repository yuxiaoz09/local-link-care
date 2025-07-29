import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Plus, Edit3, Trash2, DollarSign, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ServiceCustomizationProps {
  selectedServices: any[];
  onNext: (data: any) => void;
  onBack: () => void;
  loading: boolean;
}

interface CustomService {
  id: string;
  name: string;
  category: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  type: 'service';
}

const SERVICE_CATEGORIES = [
  'Haircuts', 'Coloring', 'Styling', 'Grooming', 'Treatments',
  'Massage', 'Skincare', 'Body Treatments', 'Wellness',
  'Maintenance', 'Repairs', 'Diagnostics', 'Tires',
  'Dining', 'Events', 'Catering',
  'Training', 'Classes', 'Consultation',
  'Makeup', 'Brows', 'Lashes',
  'Cleaning', 'Landscaping', 'Plumbing',
  'General'
];

export function ServiceCustomization({ selectedServices, onNext, onBack, loading }: ServiceCustomizationProps) {
  const [services, setServices] = useState(selectedServices);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    category: '',
    description: '',
    base_price: 0,
    duration_minutes: 60
  });

  const handleServiceUpdate = (index: number, field: string, value: any) => {
    const updatedServices = [...services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    setServices(updatedServices);
  };

  const handleAddCustomService = () => {
    if (!newService.name.trim()) return;

    const customService: CustomService = {
      id: `custom-${Date.now()}`,
      ...newService,
      type: 'service'
    };

    setCustomServices([...customServices, customService]);
    setNewService({
      name: '',
      category: '',
      description: '',
      base_price: 0,
      duration_minutes: 60
    });
    setIsAddingService(false);
  };

  const handleDeleteCustomService = (id: string) => {
    setCustomServices(customServices.filter(s => s.id !== id));
  };

  const handleNext = () => {
    onNext({
      selectedServices: services,
      customServices
    });
  };

  const allServices = [...services, ...customServices];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customize Your Services</CardTitle>
          <p className="text-muted-foreground">
            Review and adjust your selected services. You can modify prices, durations, and add custom services.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selected Services */}
          {services.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Selected Services</h3>
              <div className="grid gap-4">
                {services.map((service, index) => (
                  <Card key={service.id || index} className="border-muted">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                        <div className="space-y-2">
                          <Label>Service Name</Label>
                          <Input
                            value={service.name}
                            onChange={(e) => handleServiceUpdate(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={service.category}
                            onValueChange={(value) => handleServiceUpdate(index, 'category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SERVICE_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={service.base_price}
                            onChange={(e) => handleServiceUpdate(index, 'base_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (min)</Label>
                          <Input
                            type="number"
                            value={service.duration_minutes}
                            onChange={(e) => handleServiceUpdate(index, 'duration_minutes', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        {service.description && (
                          <div className="md:col-span-4 space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={service.description}
                              onChange={(e) => handleServiceUpdate(index, 'description', e.target.value)}
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Custom Services */}
          {customServices.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Custom Services</h3>
              <div className="grid gap-4">
                {customServices.map((service) => (
                  <Card key={service.id} className="border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <Badge variant="secondary">{service.category}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomService(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>${service.base_price}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{service.duration_minutes} min</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Service */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Add Custom Service</h3>
              <Dialog open={isAddingService} onOpenChange={setIsAddingService}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Service</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Service Name</Label>
                      <Input
                        value={newService.name}
                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                        placeholder="Enter service name..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={newService.category}
                        onValueChange={(value) => setNewService({ ...newService, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newService.base_price}
                          onChange={(e) => setNewService({ ...newService, base_price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (min)</Label>
                        <Input
                          type="number"
                          value={newService.duration_minutes}
                          onChange={(e) => setNewService({ ...newService, duration_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Textarea
                        value={newService.description}
                        onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                        placeholder="Describe your service..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleAddCustomService} className="w-full">
                      Add Service
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={loading || allServices.length === 0}>
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
    </div>
  );
}