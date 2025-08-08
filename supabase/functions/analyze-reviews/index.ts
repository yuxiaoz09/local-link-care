
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, businessId, filters } = await req.json();
    
    if (!query || !businessId) {
      return new Response(
        JSON.stringify({ error: 'Query and businessId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set the auth context
    supabase.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: ''
    } as any);

    // Build query based on filters
    let reviewsQuery = supabase
      .from('reviews')
      .select('*')
      .eq('business_id', businessId)
      .order('review_date', { ascending: false });

    // Apply filters if provided
    if (filters) {
      if (filters.platform && filters.platform !== 'all') {
        reviewsQuery = reviewsQuery.eq('platform', filters.platform);
      }
      
      if (filters.rating && filters.rating !== 'all') {
        reviewsQuery = reviewsQuery.eq('rating', parseInt(filters.rating));
      }
      
      if (filters.dateRange && filters.dateRange !== 'all') {
        const days = parseInt(filters.dateRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        reviewsQuery = reviewsQuery.gte('review_date', startDate.toISOString());
      }
      
      if (filters.responseStatus === 'responded') {
        reviewsQuery = reviewsQuery.not('response_text', 'is', null);
      } else if (filters.responseStatus === 'needs_response') {
        reviewsQuery = reviewsQuery.is('response_text', null);
      }
    }

    const { data: reviews, error: reviewsError } = await reviewsQuery.limit(100);

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reviews' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reviews || reviews.length === 0) {
      return new Response(
        JSON.stringify({ 
          analysis: 'No reviews found matching your criteria.',
          suggestions: [
            'Try adjusting your filters',
            'Check if you have reviews in the selected time period',
            'Expand your search criteria'
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare review data for AI analysis
    const reviewData = reviews.map(review => ({
      rating: review.rating,
      text: review.review_text,
      platform: review.platform,
      date: review.review_date,
      keywords: review.keywords,
      sentiment_score: review.sentiment_score
    }));

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create AI prompt
    const systemPrompt = `You are an expert review analyst. Analyze the provided customer reviews and answer the user's question with actionable insights. 

Guidelines:
- Focus on patterns, themes, and trends in the data
- Provide specific examples from the reviews when relevant
- Be concise but thorough
- If analyzing negative reviews, focus on constructive feedback and improvement opportunities
- If analyzing positive reviews, highlight what's working well
- Always provide actionable recommendations

Review data includes: rating (1-5), review text, platform, date, keywords, and sentiment score (-1 to 1).`;

    const userPrompt = `User Question: "${query}"

Review Data (${reviews.length} reviews):
${JSON.stringify(reviewData, null, 2)}

Please analyze these reviews and provide insights to answer the user's question.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze reviews' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // Generate follow-up suggestions based on the query
    const suggestions = generateFollowUpSuggestions(query, reviews);

    return new Response(
      JSON.stringify({ 
        analysis,
        reviewCount: reviews.length,
        suggestions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-reviews function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFollowUpSuggestions(query: string, reviews: any[]): string[] {
  const lowerQuery = query.toLowerCase();
  const suggestions = [];

  if (lowerQuery.includes('negative')) {
    suggestions.push(
      'What specific issues do customers mention most?',
      'How has our negative feedback changed over time?',
      'Which platform has the most negative reviews?'
    );
  } else if (lowerQuery.includes('positive')) {
    suggestions.push(
      'What do customers praise most about our service?',
      'Which staff members are mentioned positively?',
      'What are our strongest competitive advantages?'
    );
  } else if (lowerQuery.includes('theme') || lowerQuery.includes('common')) {
    suggestions.push(
      'Compare themes between different rating levels',
      'What themes appear across different platforms?',
      'How have review themes evolved over time?'
    );
  } else {
    suggestions.push(
      'What are the main themes in negative reviews?',
      'What do customers like most about our service?',
      'How do reviews vary by platform?',
      'What trends do you see over the past 3 months?'
    );
  }

  return suggestions.slice(0, 3); // Return max 3 suggestions
}
