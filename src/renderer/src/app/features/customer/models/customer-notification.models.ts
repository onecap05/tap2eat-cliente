import { OrderStatus } from './order.models';

export interface CustomerOrderNotification {
  id: string;
  orderId: string;
  title: string;
  message: string;
  status: OrderStatus | string;
  createdAt: string;
  read: boolean;
  estimatedPreparationMinutes?: number | null;
  estimatedReadyAt?: string | null;
}
