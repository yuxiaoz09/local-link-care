import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Minimize2 } from 'lucide-react';
import { ChatMessage } from '@/types/chat';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatSuggestions } from './ChatSuggestions';
import { parseQuery } from '@/utils/queryParser';
import { processQuery } from '@/utils/queryProcessor';
import { useBusinessSetup } from '@/hooks/useBusinessSetup';
import { sanitizeInput } from '@/lib/security';
import { useToast } from '@/components/ui/use-toast';

export const ChatInterface: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { businessData } = useBusinessSetup();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rate limiting
  const lastQueryTime = useRef<number>(0);
  const queryCount = useRef<number>(0);
  const RATE_LIMIT_WINDOW = 60000; // 1 minute
  const MAX_QUERIES_PER_MINUTE = 20;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Listen for questions from QuickInsights
  useEffect(() => {
    const handleOpenChatWithQuestion = (e: CustomEvent) => {
      setIsOpen(true);
      setIsMinimized(false);
      handleSendMessage(e.detail);
    };

    window.addEventListener('openChatWithQuestion', handleOpenChatWithQuestion as EventListener);
    return () => {
      window.removeEventListener('openChatWithQuestion', handleOpenChatWithQuestion as EventListener);
    };
  }, [businessData]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    if (now - lastQueryTime.current > RATE_LIMIT_WINDOW) {
      queryCount.current = 0;
      lastQueryTime.current = now;
    }

    if (queryCount.current >= MAX_QUERIES_PER_MINUTE) {
      toast({
        title: "Rate limit exceeded",
        description: "Please wait a moment before asking another question.",
        variant: "destructive",
      });
      return false;
    }

    queryCount.current++;
    return true;
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading || !businessData?.id) return;

    if (!checkRateLimit()) return;

    const sanitizedMessage = sanitizeInput(message.trim());
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: sanitizedMessage,
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      message: 'Let me analyze that for you...',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const parsedQuery = parseQuery(sanitizedMessage);
      const result = await processQuery(parsedQuery, businessData.id);

      const responseMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        message: result.summary,
        timestamp: new Date(),
        data: {
          type: result.type,
          data: result.data,
          followUpSuggestions: result.followUpSuggestions,
        },
      };

      setMessages(prev => [...prev.slice(0, -1), responseMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        message: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] flex flex-col shadow-xl z-50 bg-background border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Smart CRM Assistant</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm">
                  <p className="mb-4">Hi! I'm your smart CRM assistant.</p>
                  <p className="mb-4">Ask me about your customers, revenue, or appointments!</p>
                  <ChatSuggestions
                    suggestions={[
                      "Who is my best customer this month?",
                      "How much revenue did I make today?",
                      "Show me customers at risk",
                      "How many appointments do I have tomorrow?"
                    ]}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </div>
              )}
              
              {messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  onSuggestionClick={handleSuggestionClick}
                />
              ))}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your business..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => handleSendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};