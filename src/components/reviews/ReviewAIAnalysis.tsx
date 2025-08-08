
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Brain, Send, Loader2, MessageCircle, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReviewAIAnalysisProps {
  businessId: string;
  filters: {
    platform: string;
    rating: string;
    responseStatus: string;
    dateRange: string;
    searchQuery: string;
  };
}

interface AnalysisResult {
  analysis: string;
  reviewCount: number;
  suggestions: string[];
}

export function ReviewAIAnalysis({ businessId, filters }: ReviewAIAnalysisProps) {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!query.trim() || !businessId) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-reviews', {
        body: {
          query: query.trim(),
          businessId,
          filters
        }
      });

      if (error) {
        throw error;
      }

      setResult(data);
    } catch (error) {
      console.error('Error analyzing reviews:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze reviews. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setResult(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const quickQuestions = [
    "What are the common themes in negative reviews this month?",
    "What do customers praise most about our service?",
    "How do reviews vary between different platforms?",
    "What are the most mentioned keywords in 5-star reviews?",
    "What specific issues do 1-star reviews mention?",
    "How has customer sentiment changed over the past 3 months?"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Review Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ask questions about your reviews and get AI-powered insights
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Query Input */}
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your reviews..."
            disabled={isAnalyzing}
            className="flex-1"
          />
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !query.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Questions */}
        {!result && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-xs py-1 px-2"
                  onClick={() => setQuery(question)}
                >
                  {question}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Result */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              Analyzed {result.reviewCount} reviews
            </div>
            
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {result.analysis}
              </div>
            </div>

            {/* Follow-up Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Follow-up questions:
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.suggestions.map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 text-xs py-1 px-2"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setResult(null)}
              className="w-full"
            >
              Ask Another Question
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
