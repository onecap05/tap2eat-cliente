export interface PaymentResponse {
  id: string;
  orderId: string;
  customerAccountId: string;
  restaurantId: string;
  branchId: string;
  amount: number;
  currency: string;
  status: string;
  provider?: string | null;
  providerReference?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
}

export interface ApprovePaymentRequest {
  providerReference?: string | null;
}

export interface RejectPaymentRequest {
  rejectionReason: string;
}
