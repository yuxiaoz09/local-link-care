import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Users, Send, Settings } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface ReviewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function ReviewRequestDialog({ open, onOpenChange, businessId }: ReviewRequestDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('select-customers');
  
  // Form data
  const [requestType, setRequestType] = useState<'email' | 'sms'>('email');
  const [platform, setPlatform] = useState('google');
  const [emailSubject, setEmailSubject] = useState('How was your experience with us?');
  const [emailMessage, setEmailMessage] = useState(`Hi {customer_name},

We hope you enjoyed your recent visit to {business_name}! Your feedback is incredibly valuable to us.

Would you mind taking a moment to share your experience by leaving us a review? It only takes a minute and helps other customers discover our services.

Click here to leave a review: {review_link}

Thank you for choosing us!

Best regards,
{business_name} Team`);
  
  const [smsMessage, setSmsMessage] = useState(`Hi {customer_name}! Thanks for visiting {business_name}. Would you mind leaving us a quick review? {review_link} - Thanks!`);

  useEffect(() => {
    if (open && businessId) {
      fetchCustomers();
    }
  }, [open, businessId]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('business_id', businessId)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleSendRequests = async () => {
    if (selectedCustomers.length === 0) {
      toast({
        title: "No customers selected",
        description: "Please select at least one customer to send review requests.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const requests = selectedCustomers.map(customerId => ({
        business_id: businessId,
        customer_id: customerId,
        request_type: requestType,
        platform_requested: platform,
        sent_date: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('review_requests')
        .insert(requests);

      if (error) throw error;

      toast({
        title: "Review requests sent",
        description: `Successfully sent ${selectedCustomers.length} review request${selectedCustomers.length > 1 ? 's' : ''}.`,
      });

      onOpenChange(false);
      setSelectedCustomers([]);
    } catch (error) {
      console.error('Error sending review requests:', error);
      toast({
        title: "Error",
        description: "Failed to send review requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCharacterCount = () => {
    return requestType === 'sms' ? smsMessage.length : emailMessage.length;
  };

  const getMaxCharacters = () => {
    return requestType === 'sms' ? 160 : 1000;
  };

  const selectedCustomersList = customers.filter(c => selectedCustomers.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Review Requests</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="select-customers">
              <Users className="mr-2 h-4 w-4" />
              Select Customers
            </TabsTrigger>
            <TabsTrigger value="customize-message">
              <MessageSquare className="mr-2 h-4 w-4" />
              Customize Message
            </TabsTrigger>
            <TabsTrigger value="review-send">
              <Send className="mr-2 h-4 w-4" />
              Review & Send
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select-customers" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Select Customers</h3>
                <p className="text-sm text-muted-foreground">
                  Choose customers to send review requests to
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleSelectAll}
                disabled={customers.length === 0}
              >
                {selectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="border rounded-lg max-h-80 overflow-y-auto">
              {customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers found</p>
                  <p className="text-xs">Add customers first to send review requests</p>
                </div>
              ) : (
                <div className="divide-y">
                  {customers.map((customer) => (
                    <div key={customer.id} className="flex items-center space-x-3 p-3">
                      <Checkbox
                        id={customer.id}
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{customer.name}</p>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          {customer.email && <span>{customer.email}</span>}
                          {customer.phone && <span>{customer.phone}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomers.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => setActiveTab('customize-message')}>
                  Next: Customize Message
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="customize-message" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Customize Message</h3>
              <p className="text-sm text-muted-foreground">
                Personalize your review request message
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Request Type</Label>
                <Select value={requestType} onValueChange={(value: 'email' | 'sms') => setRequestType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="yelp">Yelp</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {requestType === 'email' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-subject">Subject Line</Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-message">Email Message</Label>
                  <Textarea
                    id="email-message"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {getCharacterCount()}/{getMaxCharacters()} characters
                  </p>
                </div>
              </div>
            )}

            {requestType === 'sms' && (
              <div className="space-y-2">
                <Label htmlFor="sms-message">SMS Message</Label>
                <Textarea
                  id="sms-message"
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  {getCharacterCount()}/{getMaxCharacters()} characters
                  {requestType === 'sms' && getCharacterCount() > 160 && (
                    <span className="text-red-500 ml-2">
                      Message will be split into multiple SMS
                    </span>
                  )}
                </p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Available Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{'{customer_name}'}</Badge>
                  <Badge variant="outline">{'{business_name}'}</Badge>
                  <Badge variant="outline">{'{review_link}'}</Badge>
                  <Badge variant="outline">{'{service_name}'}</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('select-customers')}>
                Back
              </Button>
              <Button onClick={() => setActiveTab('review-send')}>
                Next: Review & Send
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="review-send" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Review & Send</h3>
              <p className="text-sm text-muted-foreground">
                Review your settings and send review requests
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Request Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <Badge>{requestType.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform:</span>
                    <Badge variant="outline">{platform}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Recipients:</span>
                    <span>{selectedCustomers.length} customers</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Selected Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedCustomersList.map((customer) => (
                      <div key={customer.id} className="flex justify-between text-sm">
                        <span>{customer.name}</span>
                        <span className="text-muted-foreground">
                          {requestType === 'email' ? customer.email : customer.phone}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Message Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {requestType === 'email' && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Subject: </span>
                      <span className="text-sm">{emailSubject}</span>
                    </div>
                    <div className="border-t pt-2">
                      <pre className="text-sm whitespace-pre-wrap">{emailMessage}</pre>
                    </div>
                  </div>
                )}
                {requestType === 'sms' && (
                  <pre className="text-sm whitespace-pre-wrap">{smsMessage}</pre>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('customize-message')}>
                Back
              </Button>
              <Button onClick={handleSendRequests} disabled={loading || selectedCustomers.length === 0}>
                {loading ? 'Sending...' : `Send ${selectedCustomers.length} Request${selectedCustomers.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}