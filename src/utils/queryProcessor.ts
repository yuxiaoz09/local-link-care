import { supabase } from '@/integrations/supabase/client';
import { ParsedQuery, QueryResult, CustomerResult, RevenueResult, AppointmentResult } from '@/types/chat';
import { getDateRange } from './queryParser';
import { sanitizeInput } from '@/lib/security';

export async function processQuery(query: ParsedQuery, businessId: string): Promise<QueryResult> {
  try {
    const dateRange = getDateRange(query.timeframe);
    const startDate = dateRange.start.toISOString().split('T')[0];
    const endDate = dateRange.end.toISOString().split('T')[0];

    // Log analytics access
    await supabase.rpc('log_analytics_access', {
      p_action: 'CHAT_QUERY',
      p_resource: `${query.intent}_${query.metric || 'general'}`,
      p_details: { 
        query: sanitizeInput(JSON.stringify(query)),
        timeframe: query.timeframe 
      }
    });

    switch (query.intent) {
      case 'customer':
        return await processCustomerQuery(query, businessId, startDate, endDate);
      
      case 'revenue':
        return await processRevenueQuery(query, businessId, startDate, endDate);
      
      case 'appointment':
        return await processAppointmentQuery(query, businessId, startDate, endDate);
      
      default:
        return {
          type: 'error',
          data: null,
          summary: "I didn't understand your question. Try asking about customers, revenue, or appointments.",
          followUpSuggestions: [
            "Who is my best customer this month?",
            "How much revenue did I make today?",
            "Show me today's appointments"
          ]
        };
    }
  } catch (error) {
    console.error('Error processing query:', error);
    return {
      type: 'error',
      data: null,
      summary: "I encountered an error processing your request. Please try again.",
      followUpSuggestions: [
        "Who is my best customer this month?",
        "How much revenue did I make today?",
        "Show me today's appointments"
      ]
    };
  }
}

async function processCustomerQuery(
  query: ParsedQuery, 
  businessId: string, 
  startDate: string, 
  endDate: string
): Promise<QueryResult> {
  if (query.metric === 'best') {
    const { data, error } = await supabase.rpc('get_best_customer_period', {
      business_uuid: businessId,
      start_date: startDate,
      end_date: endDate
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        type: 'customer',
        data: null,
        summary: `No customers found for ${query.timeframe}.`,
        followUpSuggestions: [
          "Show me all customers",
          "Who are my customers at risk?",
          "How many customers do I have total?"
        ]
      };
    }

    const customer = data[0] as CustomerResult;
    return {
      type: 'customer',
      data: customer,
      summary: `Your best customer ${query.timeframe} is ${customer.customer_name} with $${customer.total_spent.toFixed(2)} in revenue from ${customer.appointment_count} appointments.`,
      followUpSuggestions: [
        "Show me their appointment history",
        "Who are my other top customers?",
        "Send them a thank you message"
      ]
    };
  }

  if (query.metric === 'at-risk') {
    const { data, error } = await supabase.rpc('get_at_risk_customers', {
      business_uuid: businessId,
      days_threshold: 30
    });

    if (error) throw error;

    return {
      type: 'list',
      data: data || [],
      summary: `Found ${data?.length || 0} customers who haven't visited in 30+ days.`,
      followUpSuggestions: [
        "Send follow-up messages to at-risk customers",
        "Show me customer retention rate",
        "Who are my most loyal customers?"
      ]
    };
  }

  // Default customer query
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .ilike('name', query.entity ? `%${sanitizeInput(query.entity)}%` : '%')
    .limit(10);

  if (error) throw error;

  return {
    type: 'list',
    data: data || [],
    summary: query.entity 
      ? `Found ${data?.length || 0} customers matching "${query.entity}"`
      : `Showing your recent customers`,
    followUpSuggestions: [
      "Who is my best customer this month?",
      "Show me customers at risk",
      "Add a new customer"
    ]
  };
}

async function processRevenueQuery(
  query: ParsedQuery, 
  businessId: string, 
  startDate: string, 
  endDate: string
): Promise<QueryResult> {
  const { data, error } = await supabase.rpc('get_revenue_period', {
    business_uuid: businessId,
    start_date: startDate,
    end_date: endDate
  });

  if (error) throw error;

  if (!data || data.length === 0) {
    return {
      type: 'revenue',
      data: { total_revenue: 0, appointment_count: 0, avg_transaction_value: 0, unique_customers: 0 },
      summary: `No revenue data found for ${query.timeframe}.`,
      followUpSuggestions: [
        "Show me this month's revenue",
        "What's my busiest day this week?",
        "Add a new appointment"
      ]
    };
  }

  const revenue = data[0] as RevenueResult;
  const timeframeText = query.timeframe.replace('-', ' ');
  
  return {
    type: 'revenue',
    data: revenue,
    summary: `${timeframeText}, you made $${revenue.total_revenue.toFixed(2)} from ${revenue.appointment_count} appointments with ${revenue.unique_customers} customers. Average transaction: $${revenue.avg_transaction_value.toFixed(2)}.`,
    followUpSuggestions: [
      "Compare with last month",
      "Show me my top services by revenue",
      "Who were my best customers this period?"
    ]
  };
}

async function processAppointmentQuery(
  query: ParsedQuery, 
  businessId: string, 
  startDate: string, 
  endDate: string
): Promise<QueryResult> {
  const { data, error } = await supabase.rpc('get_appointments_period', {
    business_uuid: businessId,
    start_date: startDate,
    end_date: endDate
  });

  if (error) throw error;

  const appointments = data || [];
  const timeframeText = query.timeframe.replace('-', ' ');
  
  return {
    type: 'appointments',
    data: appointments,
    summary: `You have ${appointments.length} appointments ${timeframeText}.`,
    followUpSuggestions: [
      "Show me tomorrow's appointments",
      "Who has the most appointments?",
      "Schedule a new appointment"
    ]
  };
}