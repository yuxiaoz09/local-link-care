import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Widget {
  id: string;
  name: string;
  widget_key: string;
}

interface WidgetCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: Widget | null;
}

export function WidgetCodeDialog({ open, onOpenChange, widget }: WidgetCodeDialogProps) {
  if (!widget) return null;

  const widgetUrl = `${window.location.origin}/widget/${widget.widget_key}`;
  
  const embedCode = `<!-- Booking Widget -->
<div id="booking-widget-${widget.widget_key}"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget.js';
    script.onload = function() {
      BookingWidget.init({
        key: '${widget.widget_key}',
        container: '#booking-widget-${widget.widget_key}'
      });
    };
    document.head.appendChild(script);
  })();
</script>`;

  const iframeCode = `<iframe 
  src="${widgetUrl}" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
</iframe>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Widget Code - {widget.name}</DialogTitle>
          <DialogDescription>
            Copy and paste this code into your website to add the booking widget
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">JavaScript Embed Code</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(embedCode, 'Embed code')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Recommended: Dynamic widget that loads asynchronously
              </p>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{embedCode}</code>
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">iframe Embed Code</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(iframeCode, 'iframe code')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Simple option: Embed as iframe (less customizable)
              </p>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{iframeCode}</code>
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Direct Link</CardTitle>
              <p className="text-sm text-muted-foreground">
                Direct URL to your booking widget
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <input 
                  value={widgetUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-muted"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(widgetUrl, 'Widget URL')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(widgetUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Installation Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Choose Your Method</h4>
                <p className="text-sm text-muted-foreground">
                  Use the JavaScript embed for the best experience, or the iframe for simplicity.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Add to Your Website</h4>
                <p className="text-sm text-muted-foreground">
                  Paste the code where you want the booking widget to appear on your page.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Test the Widget</h4>
                <p className="text-sm text-muted-foreground">
                  Make a test booking to ensure everything works correctly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}