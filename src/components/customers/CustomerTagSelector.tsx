import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CustomerTag {
  tag_id: string;
  tag_name: string;
  tag_color: string;
  tag_category: string;
  usage_count?: number;
}

interface CustomerTagSelectorProps {
  businessId: string;
  customerId?: string;
  selectedTags: CustomerTag[];
  onTagsChange: (tags: CustomerTag[]) => void;
}

export const CustomerTagSelector: React.FC<CustomerTagSelectorProps> = ({
  businessId,
  customerId,
  selectedTags,
  onTagsChange,
}) => {
  const [open, setOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<CustomerTag[]>([]);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch available tags for the business
  useEffect(() => {
    fetchAvailableTags();
  }, [businessId]);

  const fetchAvailableTags = async () => {
    try {
      const { data, error } = await supabase.rpc('get_business_tags_with_usage', {
        p_business_id: businessId,
      });

      if (error) throw error;

      const tags = data?.map((tag: any) => ({
        tag_id: tag.tag_id,
        tag_name: tag.tag_name,
        tag_color: tag.tag_color,
        tag_category: tag.tag_category,
        usage_count: tag.usage_count,
      })) || [];

      setAvailableTags(tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch available tags',
        variant: 'destructive',
      });
    }
  };

  const createNewTag = async () => {
    if (!newTagName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_tags')
        .insert([
          {
            business_id: businessId,
            name: newTagName.trim(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const newTag: CustomerTag = {
        tag_id: data.id,
        tag_name: data.name,
        tag_color: data.color,
        tag_category: data.category,
        usage_count: 0,
      };

      setAvailableTags([newTag, ...availableTags]);
      handleTagSelect(newTag);
      setNewTagName('');
      setShowNewTagInput(false);

      toast({
        title: 'Success',
        description: 'New tag created successfully',
      });
    } catch (error: any) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Error',
        description: error.message?.includes('duplicate') 
          ? 'A tag with this name already exists' 
          : 'Failed to create new tag',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTagSelect = (tag: CustomerTag) => {
    const isSelected = selectedTags.some(t => t.tag_id === tag.tag_id);
    
    if (isSelected) {
      onTagsChange(selectedTags.filter(t => t.tag_id !== tag.tag_id));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(t => t.tag_id !== tagId));
  };

  const getAvailableUnselectedTags = () => {
    return availableTags.filter(tag => 
      !selectedTags.some(selected => selected.tag_id === tag.tag_id)
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.tag_id}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
            style={{ 
              backgroundColor: `${tag.tag_color}20`, 
              borderColor: tag.tag_color,
              color: tag.tag_color 
            }}
          >
            {tag.tag_name}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => handleRemoveTag(tag.tag_id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            Select tags...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {getAvailableUnselectedTags().map((tag) => (
                  <CommandItem
                    key={tag.tag_id}
                    value={tag.tag_name}
                    onSelect={() => handleTagSelect(tag)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: tag.tag_color }}
                      />
                      <span>{tag.tag_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({tag.usage_count} customers)
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedTags.some(t => t.tag_id === tag.tag_id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
                
                {showNewTagInput ? (
                  <div className="flex items-center gap-2 p-2 border-t">
                    <Input
                      placeholder="Enter new tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          createNewTag();
                        } else if (e.key === 'Escape') {
                          setShowNewTagInput(false);
                          setNewTagName('');
                        }
                      }}
                      className="flex-1"
                      autoFocus
                      maxLength={50}
                    />
                    <Button
                      size="sm"
                      onClick={createNewTag}
                      disabled={!newTagName.trim() || loading}
                    >
                      Add
                    </Button>
                  </div>
                ) : (
                  <CommandItem
                    onSelect={() => setShowNewTagInput(true)}
                    className="flex items-center gap-2 text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Add new tag
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};