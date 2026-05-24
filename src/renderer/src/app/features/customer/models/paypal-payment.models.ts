export interface PayPalOrderResponse {
  paymentId: string;
  paypalOrderId: string;
  status: string;
  amount: number;
  currency: string;
}

export interface PayPalCaptureResponse {
  paymentId: string;
  paypalOrderId: string;
  captureId?: string | null;
  paymentStatus: string;
  providerReference?: string | null;
}
