import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Star, TrendingUp, MessageSquare, Target } from 'lucide-react';

interface Review {
  id: string;
  platform: 'google' | 'yelp' | 'facebook';
  rating: number;
  review_text: string | null;
  review_date: string;
  response_text: string | null;
  keywords: string[] | null;
  sentiment_score: number | null;
}

interface ReviewAnalyticsProps {
  businessId: string;
  reviews: Review[];
}

export function ReviewAnalytics({ businessId, reviews }: ReviewAnalyticsProps) {
  // Rating distribution data
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating: `${rating} Star${rating !== 1 ? 's' : ''}`,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0
  }));

  // Platform breakdown data
  const platformData = ['google', 'yelp', 'facebook'].map(platform => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    count: reviews.filter(r => r.platform === platform).length,
    avgRating: reviews.filter(r => r.platform === platform).length > 0
      ? reviews.filter(r => r.platform === platform).reduce((sum, r) => sum + r.rating, 0) / reviews.filter(r => r.platform === platform).length
      : 0
  })).filter(p => p.count > 0);

  // Monthly trend data (last 6 months)
  const monthlyTrends = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthReviews = reviews.filter(r => {
      const reviewDate = new Date(r.review_date);
      return reviewDate >= monthStart && reviewDate <= monthEnd;
    });

    monthlyTrends.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count: monthReviews.length,
      avgRating: monthReviews.length > 0 
        ? monthReviews.reduce((sum, r) => sum + r.rating, 0) / monthReviews.length 
        : 0
    });
  }

  // Response rate calculation
  const totalReviews = reviews.length;
  const respondedReviews = reviews.filter(r => r.response_text).length;
  const responseRate = totalReviews > 0 ? (respondedReviews / totalReviews) * 100 : 0;

  // Most common keywords
  const allKeywords = reviews.flatMap(r => r.keywords || []);
  const keywordCounts = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topKeywords = Object.entries(keywordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  // Sentiment analysis
  const sentimentData = reviews.filter(r => r.sentiment_score !== null).map(r => ({
    positive: r.sentiment_score! > 0.3 ? 1 : 0,
    neutral: r.sentiment_score! >= -0.3 && r.sentiment_score! <= 0.3 ? 1 : 0,
    negative: r.sentiment_score! < -0.3 ? 1 : 0
  })).reduce((acc, curr) => ({
    positive: acc.positive + curr.positive,
    neutral: acc.neutral + curr.neutral,
    negative: acc.negative + curr.negative
  }), { positive: 0, neutral: 0, negative: 0 });

  const sentimentChartData = [
    { name: 'Positive', value: sentimentData.positive, color: '#10B981' },
    { name: 'Neutral', value: sentimentData.neutral, color: '#F59E0B' },
    { name: 'Negative', value: sentimentData.negative, color: '#EF4444' }
  ];

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseRate.toFixed(1)}%</div>
            <Progress value={responseRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {respondedReviews} of {totalReviews} reviews responded to
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalReviews > 0 
                ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
                : '0.0'
              }
            </div>
            <div className="flex mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyTrends.length > 1 
                ? Math.round(((monthlyTrends[monthlyTrends.length - 1].count - monthlyTrends[monthlyTrends.length - 2].count) / Math.max(monthlyTrends[monthlyTrends.length - 2].count, 1)) * 100)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              vs. previous month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Goal</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.min(Math.round((totalReviews / 50) * 100), 100)}%</div>
            <Progress value={Math.min((totalReviews / 50) * 100, 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {totalReviews} of 50 reviews goal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="avgRating" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {sentimentData.positive + sentimentData.neutral + sentimentData.negative > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platformData.map((platform, index) => (
                <div key={platform.platform} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{platform.platform}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {platform.count} reviews
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= Math.round(platform.avgRating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">
                        {platform.avgRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={(platform.count / totalReviews) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keywords */}
      {topKeywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Mentioned Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topKeywords.map((item, index) => (
                <Badge 
                  key={item.keyword} 
                  variant="outline"
                  className="text-sm"
                >
                  {item.keyword} ({item.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}