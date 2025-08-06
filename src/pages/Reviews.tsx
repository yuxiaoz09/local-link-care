import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Filter, Star, MessageSquare, TrendingUp, Users, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSetup } from '@/hooks/useBusinessSetup';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ReviewOverviewCards } from '@/components/reviews/ReviewOverviewCards';
import { ReviewFilters } from '@/components/reviews/ReviewFilters';
import { ReviewAnalytics } from '@/components/reviews/ReviewAnalytics';
import { ReviewRequestDialog } from '@/components/reviews/ReviewRequestDialog';
import { ResponseTemplatesDialog } from '@/components/reviews/ResponseTemplatesDialog';
import { ReviewSettingsDialog } from '@/components/reviews/ReviewSettingsDialog';
import { useToast } from '@/hooks/use-toast';

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

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  recentReviews: number;
  responseRate: number;
}

interface FilterState {
  platform: string;
  rating: string;
  responseStatus: string;
  dateRange: string;
  searchQuery: string;
}

export default function Reviews() {
  const { user } = useAuth();
  const { businessData } = useBusinessSetup();
  const { toast } = useToast();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    recentReviews: 0,
    responseRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<FilterState>({
    platform: 'all',
    rating: 'all',
    responseStatus: 'all',
    dateRange: 'all',
    searchQuery: ''
  });
  
  // Dialog states
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  useEffect(() => {
    if (businessData?.id) {
      fetchReviews();
      fetchStats();
    }
  }, [businessData?.id, filters]);

  const fetchReviews = async () => {
    if (!businessData?.id) return;

    try {
      let query = supabase
        .from('reviews')
        .select('*')
        .eq('business_id', businessData.id)
        .order('review_date', { ascending: false });

      // Apply filters
      if (filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }
      
      if (filters.rating !== 'all') {
        query = query.eq('rating', parseInt(filters.rating));
      }
      
      if (filters.responseStatus === 'responded') {
        query = query.not('response_text', 'is', null);
      } else if (filters.responseStatus === 'needs_response') {
        query = query.is('response_text', null);
      }
      
      if (filters.dateRange !== 'all') {
        const days = parseInt(filters.dateRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('review_date', startDate.toISOString());
      }
      
      if (filters.searchQuery) {
        query = query.ilike('review_text', `%${filters.searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReviews((data || []) as Review[]);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchStats = async () => {
    if (!businessData?.id) return;

    try {
      const { data: allReviews, error } = await supabase
        .from('reviews')
        .select('rating, response_text, review_date')
        .eq('business_id', businessData.id);

      if (error) throw error;

      const totalReviews = allReviews?.length || 0;
      const averageRating = totalReviews > 0 
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0;

      // Reviews in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentReviews = allReviews?.filter(
        review => new Date(review.review_date) >= thirtyDaysAgo
      ).length || 0;

      // Response rate
      const reviewsWithResponses = allReviews?.filter(
        review => review.response_text
      ).length || 0;
      const responseRate = totalReviews > 0 ? (reviewsWithResponses / totalReviews) * 100 : 0;

      setStats({
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        recentReviews,
        responseRate: Math.round(responseRate)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReview = (reviewId: string, updates: Partial<Review>) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId ? { ...review, ...updates } : review
    ));
    // Refresh stats to reflect response rate changes
    fetchStats();
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Review Management</h1>
            <p className="text-muted-foreground">Monitor and manage your online reviews</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-1"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Management</h1>
          <p className="text-muted-foreground">Monitor and manage your online reviews</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRequestDialog(true)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Request Reviews
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTemplatesDialog(true)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSettingsDialog(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <ReviewOverviewCards stats={stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">All Reviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{review.customer_name || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {review.review_text || 'No review text'}
                        </p>
                      </div>
                      <Badge variant={
                        review.platform === 'google' ? 'default' :
                        review.platform === 'yelp' ? 'secondary' : 'outline'
                      }>
                        {review.platform}
                      </Badge>
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No reviews yet. Start requesting reviews from your customers!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Review Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Review request tracking coming soon</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowRequestDialog(true)}
                    >
                      Send Review Request
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="reviews" className="space-y-4">
          <ReviewFilters filters={filters} onFiltersChange={setFilters} />
          
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                businessId={businessData?.id || ''}
                onUpdate={handleUpdateReview}
              />
            ))}
            {reviews.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No reviews found</h3>
                  <p className="text-muted-foreground mb-4">
                    {filters.platform !== 'all' || filters.rating !== 'all' || filters.searchQuery
                      ? 'Try adjusting your filters to see more reviews.'
                      : 'Start collecting reviews from your customers.'}
                  </p>
                  <Button onClick={() => setShowRequestDialog(true)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Request Reviews
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <ReviewAnalytics businessId={businessData?.id || ''} reviews={reviews} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ReviewRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        businessId={businessData?.id || ''}
      />
      
      <ResponseTemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
        businessId={businessData?.id || ''}
      />
      
      <ReviewSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        businessId={businessData?.id || ''}
      />
    </div>
  );
}