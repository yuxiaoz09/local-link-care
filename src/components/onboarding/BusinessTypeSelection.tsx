import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Scissors, 
  Car, 
  Flower2, 
  Coffee, 
  Dumbbell, 
  Sparkles, 
  Wrench,
  Building2,
  ArrowRight
} from 'lucide-react';
import { OnboardingData } from './OnboardingWizard';

interface BusinessTypeSelectionProps {
  onNext: (data: Partial<OnboardingData>) => void;
  initialData: OnboardingData;
  loading: boolean;
}

const BUSINESS_TYPES = [
  {
    id: 'hair_salon',
    title: 'Hair Salon/Barbershop',
    description: 'Hair cutting, styling, coloring, and grooming services',
    icon: Scissors,
    color: 'bg-purple-500',
    categories: ['Haircuts', 'Coloring', 'Styling', 'Grooming', 'Treatments']
  },
  {
    id: 'spa_wellness',
    title: 'Spa/Wellness Center',
    description: 'Massage, skincare, and wellness treatments',
    icon: Flower2,
    color: 'bg-green-500',
    categories: ['Massage', 'Skincare', 'Body Treatments', 'Wellness']
  },
  {
    id: 'auto_repair',
    title: 'Auto Repair Shop',
    description: 'Vehicle maintenance and repair services',
    icon: Car,
    color: 'bg-blue-500',
    categories: ['Maintenance', 'Repairs', 'Diagnostics', 'Tires']
  },
  {
    id: 'restaurant',
    title: 'Restaurant/Cafe',
    description: 'Food service and dining experiences',
    icon: Coffee,
    color: 'bg-orange-500',
    categories: ['Dining', 'Events', 'Catering']
  },
  {
    id: 'fitness',
    title: 'Fitness Studio/Gym',
    description: 'Personal training and fitness classes',
    icon: Dumbbell,
    color: 'bg-red-500',
    categories: ['Training', 'Classes', 'Consultation']
  },
  {
    id: 'beauty',
    title: 'Beauty Services',
    description: 'Cosmetic and beauty enhancement services',
    icon: Sparkles,
    color: 'bg-pink-500',
    categories: ['Makeup', 'Brows', 'Lashes', 'Skincare']
  },
  {
    id: 'home_services',
    title: 'Home Services',
    description: 'Home maintenance and repair services',
    icon: Wrench,
    color: 'bg-yellow-500',
    categories: ['Cleaning', 'Repairs', 'Landscaping', 'Plumbing']
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Custom business type',
    icon: Building2,
    color: 'bg-gray-500',
    categories: ['General']
  }
];

export function BusinessTypeSelection({ onNext, initialData, loading }: BusinessTypeSelectionProps) {
  const [selectedType, setSelectedType] = useState(initialData.industryCategory || '');
  const [customType, setCustomType] = useState(initialData.businessType || '');
  const [showCustomInput, setShowCustomInput] = useState(initialData.industryCategory === 'other');

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    setShowCustomInput(typeId === 'other');
    if (typeId !== 'other') {
      setCustomType('');
    }
  };

  const handleNext = () => {
    const businessType = selectedType === 'other' ? customType : BUSINESS_TYPES.find(t => t.id === selectedType)?.title || '';
    
    onNext({
      businessType,
      industryCategory: selectedType
    });
  };

  const canProceed = selectedType && (selectedType !== 'other' || customType.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>What type of business do you run?</CardTitle>
        <p className="text-muted-foreground">
          Select your business type to get personalized service templates and recommendations.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUSINESS_TYPES.map((type) => {
            const IconComponent = type.icon;
            const isSelected = selectedType === type.id;
            
            return (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary border-primary' : ''
                }`}
                onClick={() => handleTypeSelect(type.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1">{type.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{type.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {type.categories.slice(0, 3).map((category) => (
                          <Badge key={category} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {type.categories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{type.categories.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {showCustomInput && (
          <div className="space-y-2">
            <Label htmlFor="custom-type">Custom Business Type</Label>
            <Input
              id="custom-type"
              placeholder="Enter your business type..."
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            onClick={handleNext} 
            disabled={!canProceed || loading}
            className="min-w-[120px]"
          >
            {loading ? 'Saving...' : (
              <>
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}