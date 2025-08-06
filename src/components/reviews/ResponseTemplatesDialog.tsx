import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, MessageSquare, Star } from 'lucide-react';

interface ResponseTemplate {
  id: string;
  name: string;
  category: 'positive' | 'negative' | 'neutral';
  template_text: string;
  usage_count: number;
  is_active: boolean;
}

interface ResponseTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function ResponseTemplatesDialog({ open, onOpenChange, businessId }: ResponseTemplatesDialogProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    category: 'positive' as 'positive' | 'negative' | 'neutral',
    template_text: ''
  });

  useEffect(() => {
    if (open && businessId) {
      fetchTemplates();
    }
  }, [open, businessId]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('response_templates')
        .select('*')
        .eq('business_id', businessId)
        .order('category', { ascending: true })
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as ResponseTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch response templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim() || !formData.template_text.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('response_templates')
        .insert({
          business_id: businessId,
          name: formData.name,
          category: formData.category,
          template_text: formData.template_text
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [...prev, data as ResponseTemplate]);
      setFormData({ name: '', category: 'positive', template_text: '' });
      setShowCreateForm(false);
      
      toast({
        title: "Template created",
        description: "Response template has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !formData.name.trim() || !formData.template_text.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('response_templates')
        .update({
          name: formData.name,
          category: formData.category,
          template_text: formData.template_text
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, name: formData.name, category: formData.category, template_text: formData.template_text }
          : t
      ));
      
      setEditingTemplate(null);
      setFormData({ name: '', category: 'positive', template_text: '' });
      
      toast({
        title: "Template updated",
        description: "Response template has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('response_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      toast({
        title: "Template deleted",
        description: "Response template has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startEditing = (template: ResponseTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      template_text: template.template_text
    });
    setShowCreateForm(false);
  };

  const cancelEditing = () => {
    setEditingTemplate(null);
    setFormData({ name: '', category: 'positive', template_text: '' });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'positive':
        return <Star className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <Star className="h-4 w-4 text-red-600" />;
      default:
        return <Star className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Create default templates if none exist
  useEffect(() => {
    if (templates.length === 0 && !loading && businessId) {
      const createDefaultTemplates = async () => {
        const defaultTemplates = [
          {
            business_id: businessId,
            name: 'Positive Review Thank You',
            category: 'positive',
            template_text: 'Thank you {customer_name} for the wonderful review! We\'re thrilled you enjoyed your {service_name}. We look forward to seeing you again soon!'
          },
          {
            business_id: businessId,
            name: 'Negative Review Response',
            category: 'negative',
            template_text: 'Thank you for your feedback, {customer_name}. We take all concerns seriously and would love to discuss this further. Please contact us at {business_phone} so we can make this right.'
          },
          {
            business_id: businessId,
            name: 'Neutral Review Response',
            category: 'neutral',
            template_text: 'Thanks for taking the time to review us, {customer_name}. We appreciate your feedback and are always looking to improve our services.'
          }
        ];

        try {
          const { data, error } = await supabase
            .from('response_templates')
            .insert(defaultTemplates)
            .select();

          if (error) throw error;
          setTemplates((data || []) as ResponseTemplate[]);
        } catch (error) {
          console.error('Error creating default templates:', error);
        }
      };

      createDefaultTemplates();
    }
  }, [templates.length, loading, businessId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Response Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create/Edit Form */}
          {(showCreateForm || editingTemplate) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Positive Review Thank You"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value: 'positive' | 'negative' | 'neutral') => 
                        setFormData(prev => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">Positive Reviews</SelectItem>
                        <SelectItem value="negative">Negative Reviews</SelectItem>
                        <SelectItem value="neutral">Neutral Reviews</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-text">Template Text</Label>
                  <Textarea
                    id="template-text"
                    value={formData.template_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, template_text: e.target.value }))}
                    placeholder="Write your response template here..."
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variables like {'{customer_name}'}, {'{business_name}'}, {'{service_name}'}, {'{business_phone}'}
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (editingTemplate) {
                        cancelEditing();
                      } else {
                        setShowCreateForm(false);
                        setFormData({ name: '', category: 'positive', template_text: '' });
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  >
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Templates List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Your Templates</h3>
              {!showCreateForm && !editingTemplate && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-full mb-1"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-medium mb-2">No templates yet</h4>
                  <p className="text-muted-foreground mb-4">
                    Create response templates to quickly reply to reviews
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(template.category)}
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                          {template.usage_count > 0 && (
                            <Badge variant="outline">
                              Used {template.usage_count} times
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {template.template_text}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}