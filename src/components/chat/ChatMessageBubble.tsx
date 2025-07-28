import React from 'react';
import { ChatMessage } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerCard } from './CustomerCard';
import { RevenueCard } from './RevenueCard';
import { AppointmentList } from './AppointmentList';
import { ChatSuggestions } from './ChatSuggestions';
import { User, Bot } from 'lucide-react';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onSuggestionClick: (suggestion: string) => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  onSuggestionClick,
}) => {
  const isUser = message.type === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <Card className={`p-3 ${isUser ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>
          {message.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
          )}
        </Card>

        {/* Data visualization cards */}
        {message.data && !message.isLoading && (
          <div className="mt-3 space-y-3">
            {message.data.type === 'customer' && message.data.data && (
              <CustomerCard customer={message.data.data} />
            )}
            
            {message.data.type === 'revenue' && message.data.data && (
              <RevenueCard revenue={message.data.data} />
            )}
            
            {message.data.type === 'appointments' && message.data.data && (
              <AppointmentList appointments={message.data.data} />
            )}
            
            {message.data.type === 'list' && message.data.data && Array.isArray(message.data.data) && (
              <Card className="p-3 bg-background border">
                <div className="space-y-2">
                  {message.data.data.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-b-0">
                      <span className="font-medium">{item.name || item.customer_name}</span>
                      <span className="text-muted-foreground">
                        {item.total_spent && `$${item.total_spent.toFixed(2)}`}
                        {item.days_since_last_visit && `${item.days_since_last_visit} days ago`}
                      </span>
                    </div>
                  ))}
                  {message.data.data.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      ... and {message.data.data.length - 5} more
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Follow-up suggestions */}
            {message.data.followUpSuggestions && message.data.followUpSuggestions.length > 0 && (
              <ChatSuggestions
                suggestions={message.data.followUpSuggestions}
                onSuggestionClick={onSuggestionClick}
              />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};