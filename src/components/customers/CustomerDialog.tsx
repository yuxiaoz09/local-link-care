import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText, isValidEmail, isValidPhone, logSecurityEvent, rateLimiter, RATE_LIMITS, sanitizeErrorMessage } from '@/lib/security';
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
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
      });
      setTags(customer.tags || []);
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
      });
      setTags([]);
    }
    setNewTag('');
  }, [customer, open]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
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

    // Security: Validate and sanitize all inputs
    const sanitizedName = sanitizeText(formData.name);
    if (!sanitizedName.trim()) {
      toast({
        title: "Error",
        description: "Customer name is required.",
        variant: "destructive",
      });
      return;
    }

    // Security: Validate email format if provided
    if (formData.email && !isValidEmail(formData.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Security: Validate phone format if provided
    if (formData.phone && !isValidPhone(formData.phone)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

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
        tags: tags.length > 0 ? tags.map(tag => sanitizeText(tag)) : null,
      };

      if (customer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customer updated successfully.",
        });
      } else {
        // Create new customer
        const { error } = await supabase
          .from('customers')
          .insert([customerData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customer added successfully.",
        });
      }

      onSuccess();
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
            />
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag (VIP, Regular, etc.)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
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