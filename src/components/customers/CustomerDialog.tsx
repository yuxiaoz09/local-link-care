import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText, validateCustomerInput, logSecurityEvent, rateLimiter, RATE_LIMITS, sanitizeErrorMessage } from '@/lib/security';
import { validateCustomerName, validateEmail, validatePhone, validateNotes, validateAddress } from '@/lib/formValidation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CustomerTagSelector } from './CustomerTagSelector';

interface CustomerTag {
  tag_id: string;
  tag_name: string;
  tag_color: string;
  tag_category: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  tags: string[] | null;
}

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  businessId: string | null;
  onSuccess: () => void;
}

const CustomerDialog = ({ open, onOpenChange, customer, businessId, onSuccess }: CustomerDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [selectedTags, setSelectedTags] = useState<CustomerTag[]>([]);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
      });
      
      // Load customer's existing tags from the new tag system
      if (customer.id) {
        loadCustomerTags(customer.id);
      }
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
      });
      setSelectedTags([]);
    }
  }, [customer, open]);

  const loadCustomerTags = async (customerId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_customer_tags_with_assignments', {
        p_customer_id: customerId,
      });

      if (error) throw error;

      const tags = data?.map((tag: any) => ({
        tag_id: tag.tag_id,
        tag_name: tag.tag_name,
        tag_color: tag.tag_color,
        tag_category: tag.tag_category,
      })) || [];

      setSelectedTags(tags);
    } catch (error) {
      console.error('Error loading customer tags:', error);
    }
  };

  const saveTagAssignments = async (customerId: string, tags: CustomerTag[]) => {
    try {
      // Remove existing tag assignments
      await supabase
        .from('customer_tag_assignments')
        .delete()
        .eq('customer_id', customerId);

      // Add new tag assignments
      if (tags.length > 0) {
        const assignments = tags.map(tag => ({
          customer_id: customerId,
          tag_id: tag.tag_id,
        }));

        const { error } = await supabase
          .from('customer_tag_assignments')
          .insert(assignments);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving tag assignments:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessId) {
      logSecurityEvent('Customer form submission without business ID');
      toast({
        title: "Error",
        description: "Business not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Rate limiting check
    if (!rateLimiter.checkLimit('CUSTOMER_CREATION', businessId)) {
      toast({
        title: "Rate limit exceeded",
        description: "Too many customer operations. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    // Enhanced security: Multi-layer validation with improved validation functions
    const validations = [
      validateCustomerName(formData.name),
      ...(formData.email ? [validateEmail(formData.email)] : []),
      ...(formData.phone ? [validatePhone(formData.phone)] : []),
      validateNotes(formData.notes || ''),
      validateAddress(formData.address || '')
    ];

    const errors = validations.flatMap(v => v.errors);
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join('. '),
        variant: "destructive",
      });
      return;
    }

    const sanitizedName = sanitizeText(formData.name);

    setLoading(true);

    try {
      // Security: Sanitize all form inputs
      const customerData = {
        name: sanitizedName,
        email: formData.email ? sanitizeText(formData.email) : null,
        phone: formData.phone ? sanitizeText(formData.phone) : null,
        address: formData.address ? sanitizeText(formData.address) : null,
        notes: formData.notes ? sanitizeText(formData.notes) : null,
        business_id: businessId,
        // Keep legacy tags field as null since we're using the new tag system
        tags: null,
      };

      let customerId = customer?.id;

      if (customer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id);

        if (error) throw error;
        customerId = customer.id;
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();

        if (error) throw error;
        customerId = data.id;
      }

      // Save tag assignments using new tag system
      if (customerId) {
        await saveTagAssignments(customerId, selectedTags);
      }

      toast({
        title: "Success",
        description: customer ? "Customer updated successfully." : "Customer added successfully.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const sanitizedError = sanitizeErrorMessage(error);
      logSecurityEvent('Customer save error', { 
        businessId, 
        operation: customer ? 'update' : 'create',
        error: sanitizedError 
      });
      
      toast({
        title: "Error",
        description: sanitizedError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Customer name"
              maxLength={100}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City, State"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about the customer..."
              rows={3}
              maxLength={2000}
            />
          </div>

          <div>
            <Label>Tags</Label>
            {businessId && (
              <CustomerTagSelector
                businessId={businessId}
                customerId={customer?.id}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : customer ? 'Update' : 'Add'} Customer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;
