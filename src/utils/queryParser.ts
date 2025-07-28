import { ParsedQuery } from '@/types/chat';

const TIMEFRAME_PATTERNS = {
  today: ['today', 'this day'],
  yesterday: ['yesterday'],
  'this-week': ['this week', 'week'],
  'last-week': ['last week'],
  'this-month': ['this month', 'month'],
  'last-month': ['last month'],
  'this-year': ['this year', 'year'],
};

const INTENT_PATTERNS = {
  customer: ['customer', 'client', 'who', 'best customer', 'top customer', 'vip', 'at risk', 'churn'],
  revenue: ['revenue', 'money', 'sales', 'earnings', 'income', 'profit', 'made'],
  appointment: ['appointment', 'booking', 'scheduled', 'visit', 'meeting'],
  analytics: ['analytics', 'report', 'insight', 'trend', 'analysis'],
};

const METRIC_PATTERNS = {
  best: ['best', 'top', 'highest', 'most'],
  worst: ['worst', 'lowest', 'least'],
  total: ['total', 'sum', 'all'],
  average: ['average', 'avg', 'mean'],
  count: ['how many', 'number of', 'count'],
  'at-risk': ['at risk', 'churn', 'haven\'t visited', 'inactive', 'lost'],
};

export function parseQuery(userInput: string): ParsedQuery {
  const normalizedInput = userInput.toLowerCase();
  
  // Extract timeframe
  const timeframe = extractTimeframe(normalizedInput);
  
  // Identify intent
  const intent = identifyIntent(normalizedInput);
  
  // Extract metric
  const metric = extractMetric(normalizedInput);
  
  // Extract entity (customer name, service type, etc.)
  const entity = extractEntity(normalizedInput);
  
  return {
    intent,
    entity,
    timeframe,
    metric,
  };
}

function extractTimeframe(input: string): ParsedQuery['timeframe'] {
  for (const [timeframe, patterns] of Object.entries(TIMEFRAME_PATTERNS)) {
    if (patterns.some(pattern => input.includes(pattern))) {
      return timeframe as ParsedQuery['timeframe'];
    }
  }
  return 'this-month'; // default
}

function identifyIntent(input: string): ParsedQuery['intent'] {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(pattern => input.includes(pattern))) {
      return intent as ParsedQuery['intent'];
    }
  }
  return 'general';
}

function extractMetric(input: string): ParsedQuery['metric'] | undefined {
  for (const [metric, patterns] of Object.entries(METRIC_PATTERNS)) {
    if (patterns.some(pattern => input.includes(pattern))) {
      return metric as ParsedQuery['metric'];
    }
  }
  return undefined;
}

function extractEntity(input: string): string | undefined {
  // Simple entity extraction - could be enhanced with NER
  const nameMatch = input.match(/named? ([A-Za-z]+)/);
  if (nameMatch) {
    return nameMatch[1];
  }
  
  const serviceMatch = input.match(/(service|appointment) ([A-Za-z\s]+)/);
  if (serviceMatch) {
    return serviceMatch[2].trim();
  }
  
  return undefined;
}

export function getDateRange(timeframe: ParsedQuery['timeframe']): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timeframe) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    
    case 'this-week':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        start: startOfWeek,
        end: now
      };
    
    case 'last-week':
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      return {
        start: lastWeekStart,
        end: lastWeekEnd
      };
    
    case 'this-month':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: startOfMonth,
        end: now
      };
    
    case 'last-month':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start: lastMonthStart,
        end: lastMonthEnd
      };
    
    case 'this-year':
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return {
        start: startOfYear,
        end: now
      };
    
    default:
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: now
      };
  }
}