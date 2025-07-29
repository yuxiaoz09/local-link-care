import React from 'react';
import { Progress } from '@/components/ui/progress';
import { getPasswordStrengthText } from '@/lib/passwordValidation';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  score: number;
  feedback: string[];
  className?: string;
}

export function PasswordStrengthIndicator({ score, feedback, className }: PasswordStrengthIndicatorProps) {
  const { text, color } = getPasswordStrengthText(score);
  const progressValue = (score / 4) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password strength:</span>
        <span className={cn('text-sm font-medium', color)}>{text}</span>
      </div>
      
      <Progress 
        value={progressValue} 
        className="h-2"
        // Custom color based on strength
        data-strength={score}
      />
      
      {feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-start gap-1">
              <span className="text-destructive">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}