import { useState, useEffect } from 'react';
import { Plus, Settings, Code, Eye, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WidgetConfigDialog } from '@/components/widgets/WidgetConfigDialog';
import { WidgetCodeDialog } from '@/components/widgets/WidgetCodeDialog';
import { WidgetAnalyticsDialog } from '@/components/widgets/WidgetAnalyticsDialog';

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
  widget_key: string;
  created_at: string;
  allowed_domains: string[] | null;
}

export default function Widgets() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);

  useEffect(() => {
    if (user) {
      fetchBusinessAndWidgets();
    }
  }, [user]);

  const fetchBusinessAndWidgets = async () => {
    try {
      setLoading(true);
      
      // Get business ID
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (businessError) {
        console.error('Error fetching business:', businessError);
        return;
      }

      if (!business) {
        console.error('No business found for user');
        return;
      }

      setBusinessId(business.id);

      // Fetch widgets
      const { data: widgetsData, error: widgetsError } = await supabase
        .from('widget_configurations')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (widgetsError) {
        console.error('Error fetching widgets:', widgetsError);
        toast.error('Failed to load widgets');
        return;
      }

      setWidgets(widgetsData || []);
    } catch (error) {
      console.error('Error in fetchBusinessAndWidgets:', error);
      toast.error('Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWidget = () => {
    setSelectedWidget(null);
    setConfigDialogOpen(true);
  };

  const handleEditWidget = (widget: Widget) => {
    setSelectedWidget(widget);
    setConfigDialogOpen(true);
  };

  const handleShowCode = (widget: Widget) => {
    setSelectedWidget(widget);
    setCodeDialogOpen(true);
  };

  const handleShowAnalytics = (widget: Widget) => {
    setSelectedWidget(widget);
    setAnalyticsDialogOpen(true);
  };

  const handleToggleActive = async (widget: Widget) => {
    try {
      const { error } = await supabase
        .from('widget_configurations')
        .update({ is_active: !widget.is_active })
        .eq('id', widget.id);

      if (error) {
        console.error('Error updating widget:', error);
        toast.error('Failed to update widget');
        return;
      }

      toast.success(widget.is_active ? 'Widget deactivated' : 'Widget activated');
      fetchBusinessAndWidgets();
    } catch (error) {
      console.error('Error toggling widget active state:', error);
      toast.error('Failed to update widget');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Booking Widgets</h1>
          <p className="text-muted-foreground">
            Embed booking forms on your website to capture appointments
          </p>
        </div>
        <Button onClick={handleCreateWidget}>
          <Plus className="w-4 h-4 mr-2" />
          Create Widget
        </Button>
      </div>

      {widgets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first booking widget to start accepting appointments from your website
            </p>
            <Button onClick={handleCreateWidget}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget) => (
            <Card key={widget.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{widget.name}</CardTitle>
                  <Badge variant={widget.is_active ? "default" : "secondary"}>
                    {widget.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  {widget.allowed_domains?.length 
                    ? `Allowed on ${widget.allowed_domains.length} domain(s)`
                    : "No domain restrictions"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full border" 
                    style={{ backgroundColor: widget.primary_color }}
                  />
                  <span className="text-sm text-muted-foreground">Primary</span>
                  <div 
                    className="w-4 h-4 rounded-full border ml-4" 
                    style={{ backgroundColor: widget.secondary_color }}
                  />
                  <span className="text-sm text-muted-foreground">Secondary</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditWidget(widget)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleShowCode(widget)}
                  >
                    <Code className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleShowAnalytics(widget)}
                  >
                    <BarChart3 className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant={widget.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleActive(widget)}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WidgetConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        widget={selectedWidget}
        businessId={businessId}
        onSuccess={fetchBusinessAndWidgets}
      />

      <WidgetCodeDialog
        open={codeDialogOpen}
        onOpenChange={setCodeDialogOpen}
        widget={selectedWidget}
      />

      <WidgetAnalyticsDialog
        open={analyticsDialogOpen}
        onOpenChange={setAnalyticsDialogOpen}
        widget={selectedWidget}
      />
    </div>
  );
}