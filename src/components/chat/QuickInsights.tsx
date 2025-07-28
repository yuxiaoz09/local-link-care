import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

interface QuickInsightsProps {
  onQuestionClick: (question: string) => void;
}

export const QuickInsights: React.FC<QuickInsightsProps> = ({ onQuestionClick }) => {
  const quickQuestions = [
    {
      icon: DollarSign,
      title: 'Revenue Today',
      question: 'How much revenue did I make today?',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Users,
      title: 'Best Customer',
      question: 'Who is my best customer this month?',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Calendar,
      title: 'Today\'s Schedule',
      question: 'Show me today\'s appointments',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: TrendingUp,
      title: 'At-Risk Customers',
      question: 'Show me customers at risk of churning',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Quick Insights</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Get instant answers to common business questions
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {quickQuestions.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 justify-start text-left hover:bg-muted/50"
              onClick={() => onQuestionClick(item.question)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.question}
                  </p>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          💡 Click the chat button to ask your own questions in natural language
        </p>
      </div>
    </Card>
  );
};