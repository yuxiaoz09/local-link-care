import React from 'react';
import { Button } from '@/components/ui/button';

interface ChatSuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({
  suggestions,
  onSuggestionClick,
}) => {
  return (
    <div className="space-y-2">
      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          className="w-full text-left justify-start text-xs h-auto p-2 whitespace-normal bg-background/50 hover:bg-muted"
          onClick={() => onSuggestionClick(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
};