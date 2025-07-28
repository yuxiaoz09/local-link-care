import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sanitizeText, isValidEmail, rateLimiter, logSecurityEvent, sanitizeErrorMessage, RATE_LIMITS } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  customer_id: string | null;
}

interface Customer {
  id: string;
  name: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  task?: Task | null;
  customers: Customer[];
}

export function TaskDialog({ open, onOpenChange, onSave, task, customers }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setDueDate(task.due_date || "");
      setCustomerId(task.customer_id || "");
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setCustomerId("");
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting protection
    if (!rateLimiter.isAllowed('task-creation', 10, 60000)) { // 10 attempts per minute
      logSecurityEvent('Rate limit exceeded for task creation');
      toast({
        title: "Too Many Attempts",
        description: "Please wait before creating another task",
        variant: "destructive",
      });
      return;
    }

    // Input validation and sanitization
    const sanitizedTitle = sanitizeText(title).trim();
    const sanitizedDescription = sanitizeText(description).trim();
    
    if (!sanitizedTitle) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    if (sanitizedTitle.length > 200) {
      toast({
        title: "Error",
        description: "Task title must be less than 200 characters",
        variant: "destructive",
      });
      return;
    }

    if (sanitizedDescription.length > 1000) {
      toast({
        title: "Error",
        description: "Task description must be less than 1000 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    let user = null;
    try {
      // Get the user's business ID with secure lookup
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      user = currentUser;
      if (!user) {
        logSecurityEvent('Unauthorized task creation attempt');
        toast({
          title: "Error",
          description: "You must be logged in to create tasks",
          variant: "destructive",
        });
        return;
      }

      // Secure business lookup using RLS-protected query
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .single(); // RLS ensures only user's business is returned

      if (businessError || !business) {
        logSecurityEvent('Failed business lookup for task creation', { 
          userId: user.id, 
          error: businessError?.message 
        });
        toast({
          title: "Error",
          description: "Could not find your business information",
          variant: "destructive",
        });
        return;
      }

      // Validate customer belongs to business if specified
      if (customerId) {
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('id', customerId)
          .eq('business_id', business.id)
          .single();

        if (customerError || !customer) {
          logSecurityEvent('Invalid customer selection for task', { 
            userId: user.id, 
            customerId, 
            businessId: business.id 
          });
          toast({
            title: "Error",
            description: "Selected customer is not valid",
            variant: "destructive",
          });
          return;
        }
      }

      const taskData = {
        title: sanitizedTitle,
        description: sanitizedDescription || null,
        due_date: dueDate || null,
        customer_id: customerId || null,
        business_id: business.id,
      };

      let error;
      if (task) {
        // Update existing task
        ({ error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id));
        
        if (!error) {
          logSecurityEvent('Task updated', { taskId: task.id, businessId: business.id });
        }
      } else {
        // Create new task
        ({ error } = await supabase
          .from('tasks')
          .insert([taskData]));
        
        if (!error) {
          logSecurityEvent('Task created', { businessId: business.id });
        }
      }

      if (error) {
        logSecurityEvent('Task save failed', { 
          userId: user.id, 
          error: error.message,
          isUpdate: !!task 
        });
        toast({
          title: "Error",
          description: "Failed to save task. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: task ? "Task updated successfully!" : "Task created successfully!",
      });

      onSave();
      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setDueDate("");
      setCustomerId("");
    } catch (error) {
      logSecurityEvent('Task operation error', { 
        userId: user?.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Add New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description (optional)"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer">Customer (Optional)</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : task ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}