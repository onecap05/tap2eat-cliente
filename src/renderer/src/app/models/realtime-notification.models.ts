export interface RealtimeOrderEventMessage {
  eventType: string;
  orderId: string;
  customerAccountId?: string | null;
  restaurantId?: string | null;
  branchId?: string | null;
  status?: string | null;
  previousStatus?: string | null;
  total?: number | null;
  occurredAt?: string | null;
}

export interface RealtimePaymentEventMessage {
  eventType: string;
  paymentId?: string | null;
  orderId: string;
  customerAccountId?: string | null;
  restaurantId?: string | null;
  branchId?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  reason?: string | null;
  occurredAt?: string | null;
}
