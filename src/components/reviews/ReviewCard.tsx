import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, MessageSquare, Flag, ExternalLink, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Review {
  id: string;
  platform: 'google' | 'yelp' | 'facebook';
  customer_name: string | null;
  customer_avatar_url: string | null;
  rating: number;
  review_text: string | null;
  review_date: string;
  response_text: string | null;
  response_date: string | null;
  response_author: string | null;
  sentiment_score: number | null;
  keywords: string[] | null;
  is_flagged: boolean;
}

interface ReviewCardProps {
  review: Review;
  businessId: string;
  onUpdate: (reviewId: string, updates: Partial<Review>) => void;
}

const platformColors = {
  google: 'bg-blue-500',
  yelp: 'bg-red-500',
  facebook: 'bg-blue-600'
};

const platformLabels = {
  google: 'Google',
  yelp: 'Yelp',
  facebook: 'Facebook'
};

export function ReviewCard({ review, businessId, onUpdate }: ReviewCardProps) {
  const { toast } = useToast();
  const [responseText, setResponseText] = useState(review.response_text || '');
  const [isResponding, setIsResponding] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          response_text: responseText,
          response_date: new Date().toISOString(),
          response_author: 'Business Owner' // TODO: Use actual user name
        })
        .eq('id', review.id);

      if (error) throw error;

      onUpdate(review.id, {
        response_text: responseText,
        response_date: new Date().toISOString(),
        response_author: 'Business Owner'
      });

      setShowResponseDialog(false);
      setIsResponding(false);
      
      toast({
        title: "Response posted",
        description: "Your response has been saved successfully.",
      });
    } catch (error) {
      console.error('Error posting response:', error);
      toast({
        title: "Error",
        description: "Failed to post response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFlag = async () => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_flagged: !review.is_flagged })
        .eq('id', review.id);

      if (error) throw error;

      onUpdate(review.id, { is_flagged: !review.is_flagged });
      
      toast({
        title: review.is_flagged ? "Review unflagged" : "Review flagged",
        description: review.is_flagged ? "Review has been unflagged." : "Review has been flagged for attention.",
      });
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast({
        title: "Error",
        description: "Failed to update review flag. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getSentimentBadge = (score: number | null) => {
    if (score === null) return null;
    
    if (score >= 0.3) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Positive</Badge>;
    } else if (score <= -0.3) {
      return <Badge variant="destructive">Negative</Badge>;
    } else {
      return <Badge variant="secondary">Neutral</Badge>;
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${review.is_flagged ? 'border-red-200 bg-red-50/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={review.customer_avatar_url || ''} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{review.customer_name || 'Anonymous'}</h4>
                <Badge 
                  variant="outline" 
                  className={`${platformColors[review.platform]} text-white border-none`}
                >
                  {platformLabels[review.platform]}
                </Badge>
                {review.is_flagged && (
                  <Badge variant="destructive" className="text-xs">
                    <Flag className="h-3 w-3 mr-1" />
                    Flagged
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {renderStars(review.rating)}
                <span>•</span>
                <Calendar className="h-3 w-3" />
                {format(new Date(review.review_date), 'MMM d, yyyy')}
                {review.sentiment_score !== null && getSentimentBadge(review.sentiment_score)}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFlag}
              className={review.is_flagged ? 'text-red-600' : ''}
            >
              <Flag className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {review.review_text && (
          <div>
            <p className="text-sm leading-relaxed">{review.review_text}</p>
            {review.keywords && review.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {review.keywords.slice(0, 3).map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {review.response_text ? (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Response from {review.response_author}</span>
              <span className="text-xs text-muted-foreground">
                {review.response_date && format(new Date(review.response_date), 'MMM d, yyyy')}
              </span>
            </div>
            <p className="text-sm">{review.response_text}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs"
              onClick={() => {
                setResponseText(review.response_text || '');
                setIsResponding(true);
                setShowResponseDialog(true);
              }}
            >
              Edit Response
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setResponseText('');
                    setIsResponding(true);
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Respond
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Respond to Review</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm font-medium">{review.customer_name || 'Anonymous'}</span>
                    </div>
                    <p className="text-sm">{review.review_text}</p>
                  </div>
                  
                  <Textarea
                    placeholder="Write your response..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="min-h-[100px]"
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowResponseDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmitResponse}
                      disabled={!responseText.trim() || loading}
                    >
                      {loading ? 'Posting...' : 'Post Response'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}