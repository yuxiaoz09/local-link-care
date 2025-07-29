import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Widget {
  id: string;
  name: string;
  is_active: boolean;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  button_style: string;
  show_prices: boolean;
  show_duration: boolean;
  require_phone: boolean;
  require_email: boolean;
  allow_notes: boolean;
  allowed_domains: string[] | null;
}

interface WidgetConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: Widget | null;
  businessId: string | null;
  onSuccess: () => void;
}

export function WidgetConfigDialog({ 
  open, 
  onOpenChange, 
  widget, 
  businessId, 
  onSuccess 
}: WidgetConfigDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    is_active: true,
    primary_color: '#3B82F6',
    secondary_color: '#1F2937',
    font_family: 'system-ui',
    button_style: 'rounded',
    show_prices: true,
    show_duration: true,
    require_phone: true,
    require_email: true,
    allow_notes: true,
    allowed_domains: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (widget) {
      setFormData({
        name: widget.name,
        is_active: widget.is_active,
        primary_color: widget.primary_color,
        secondary_color: widget.secondary_color,
        font_family: widget.font_family,
        button_style: widget.button_style,
        show_prices: widget.show_prices,
        show_duration: widget.show_duration,
        require_phone: widget.require_phone,
        require_email: widget.require_email,
        allow_notes: widget.allow_notes,
        allowed_domains: widget.allowed_domains?.join('\n') || '',
      });
    } else {
      setFormData({
        name: '',
        is_active: true,
        primary_color: '#3B82F6',
        secondary_color: '#1F2937',
        font_family: 'system-ui',
        button_style: 'rounded',
        show_prices: true,
        show_duration: true,
        require_phone: true,
        require_email: true,
        allow_notes: true,
        allowed_domains: '',
      });
    }
  }, [widget, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    setLoading(true);
    try {
      const domains = formData.allowed_domains
        .split('\n')
        .map(d => d.trim())
        .filter(d => d.length > 0);

      const data = {
        name: formData.name,
        business_id: businessId,
        is_active: formData.is_active,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        font_family: formData.font_family,
        button_style: formData.button_style,
        show_prices: formData.show_prices,
        show_duration: formData.show_duration,
        require_phone: formData.require_phone,
        require_email: formData.require_email,
        allow_notes: formData.allow_notes,
        allowed_domains: domains.length > 0 ? domains : null,
      };

      if (widget) {
        const { error } = await supabase
          .from('widget_configurations')
          .update(data)
          .eq('id', widget.id);

        if (error) throw error;
        toast.success('Widget updated successfully');
      } else {
        const { error } = await supabase
          .from('widget_configurations')
          .insert([data]);

        if (error) throw error;
        toast.success('Widget created successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving widget:', error);
      toast.error('Failed to save widget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {widget ? 'Edit Widget' : 'Create Widget'}
          </DialogTitle>
          <DialogDescription>
            Configure your booking widget settings and styling
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Widget Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Booking Widget"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Styling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <Input
                    id="secondary_color"
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font_family">Font Family</Label>
                <Select value={formData.font_family} onValueChange={(value) => setFormData(prev => ({ ...prev, font_family: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system-ui">System UI</SelectItem>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="button_style">Button Style</Label>
                <Select value={formData.button_style} onValueChange={(value) => setFormData(prev => ({ ...prev, button_style: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded">Rounded</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="pill">Pill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Display Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show_prices"
                  checked={formData.show_prices}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_prices: checked }))}
                />
                <Label htmlFor="show_prices">Show Prices</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show_duration"
                  checked={formData.show_duration}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_duration: checked }))}
                />
                <Label htmlFor="show_duration">Show Duration</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Form Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="require_phone"
                  checked={formData.require_phone}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_phone: checked }))}
                />
                <Label htmlFor="require_phone">Require Phone Number</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="require_email"
                  checked={formData.require_email}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_email: checked }))}
                />
                <Label htmlFor="require_email">Require Email</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allow_notes"
                  checked={formData.allow_notes}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_notes: checked }))}
                />
                <Label htmlFor="allow_notes">Allow Notes</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Domain Restrictions</CardTitle>
              <CardDescription>
                Leave empty to allow all domains, or list specific domains (one per line)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.allowed_domains}
                onChange={(e) => setFormData(prev => ({ ...prev, allowed_domains: e.target.value }))}
                placeholder="example.com&#10;mystore.com"
                rows={4}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : widget ? 'Update Widget' : 'Create Widget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}