export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'data';
  message: string;
  timestamp: Date;
  data?: any;
  isLoading?: boolean;
}

export interface ParsedQuery {
  intent: 'customer' | 'revenue' | 'appointment' | 'analytics' | 'general';
  entity?: string;
  timeframe: 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-year' | 'custom';
  metric?: 'best' | 'worst' | 'total' | 'average' | 'count' | 'at-risk';
  customDate?: { start: Date; end: Date };
}

export interface QueryResult {
  type: 'customer' | 'revenue' | 'appointments' | 'chart' | 'list' | 'error';
  data: any;
  summary: string;
  followUpSuggestions: string[];
}

export interface CustomerResult {
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_spent: number;
  appointment_count: number;
  last_visit?: string;
  days_since_last_visit?: number;
}

export interface RevenueResult {
  total_revenue: number;
  appointment_count: number;
  avg_transaction_value: number;
  unique_customers: number;
}

export interface AppointmentResult {
  appointment_id: string;
  customer_name: string;
  appointment_title: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number;
}