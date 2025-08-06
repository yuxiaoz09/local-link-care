import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Clock, Mail, MessageSquare, Globe } from 'lucide-react';

interface ReviewSettings {
  id?: string;
  auto_request_enabled: boolean;
  request_delay_hours: number;
  follow_up_enabled: boolean;
  follow_up_delay_days: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  preferred_platforms: string[];
}

interface ReviewSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function ReviewSettingsDialog({ open, onOpenChange, businessId }: ReviewSettingsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReviewSettings>({
    auto_request_enabled: true,
    request_delay_hours: 2,
    follow_up_enabled: true,
    follow_up_delay_days: 7,
    email_notifications: true,
    sms_notifications: false,
    preferred_platforms: ['google', 'yelp']
  });

  useEffect(() => {
    if (open && businessId) {
      fetchSettings();
    }
  }, [open, businessId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('review_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch review settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settingsData = {
        business_id: businessId,
        ...settings
      };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('review_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('review_settings')
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Settings saved",
        description: "Review settings have been saved successfully.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ReviewSettings>(
    key: K,
    value: ReviewSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePlatformChange = (platform: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      preferred_platforms: checked 
        ? [...prev.preferred_platforms, platform]
        : prev.preferred_platforms.filter(p => p !== platform)
    }));
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Review Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Automation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Automation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-send review requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically send review requests after completed appointments
                  </p>
                </div>
                <Switch
                  checked={settings.auto_request_enabled}
                  onCheckedChange={(checked) => updateSetting('auto_request_enabled', checked)}
                />
              </div>

              {settings.auto_request_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="delay-hours">Delay before sending (hours)</Label>
                    <Input
                      id="delay-hours"
                      type="number"
                      min="0"
                      max="168"
                      value={settings.request_delay_hours}
                      onChange={(e) => updateSetting('request_delay_hours', parseInt(e.target.value) || 0)}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Wait this many hours after appointment completion
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Follow-up reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Send gentle reminders if no review is left
                      </p>
                    </div>
                    <Switch
                      checked={settings.follow_up_enabled}
                      onCheckedChange={(checked) => updateSetting('follow_up_enabled', checked)}
                    />
                  </div>

                  {settings.follow_up_enabled && (
                    <div className="space-y-2">
                      <Label htmlFor="follow-up-days">Follow-up delay (days)</Label>
                      <Input
                        id="follow-up-days"
                        type="number"
                        min="1"
                        max="30"
                        value={settings.follow_up_delay_days}
                        onChange={(e) => updateSetting('follow_up_delay_days', parseInt(e.target.value) || 1)}
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground">
                        Days to wait before sending follow-up
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified via email about new reviews
                  </p>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">SMS notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified via SMS about new reviews
                  </p>
                </div>
                <Switch
                  checked={settings.sms_notifications}
                  onCheckedChange={(checked) => updateSetting('sms_notifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Platform Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Platform Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label className="text-base">Preferred review platforms</Label>
                <p className="text-sm text-muted-foreground">
                  Select which platforms to include in review requests
                </p>
                
                <div className="space-y-3">
                  {[
                    { id: 'google', name: 'Google My Business', description: 'Most popular for local businesses' },
                    { id: 'yelp', name: 'Yelp', description: 'Great for restaurants and services' },
                    { id: 'facebook', name: 'Facebook', description: 'Good for community engagement' }
                  ].map((platform) => (
                    <div key={platform.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={platform.id}
                        checked={settings.preferred_platforms.includes(platform.id)}
                        onCheckedChange={(checked) => handlePlatformChange(platform.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={platform.id} className="text-sm font-medium">
                          {platform.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">{platform.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}