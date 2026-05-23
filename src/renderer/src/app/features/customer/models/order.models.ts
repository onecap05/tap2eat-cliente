export type OrderStatus =
  | 'Created'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'Delivered'
  | 'Cancelled';

export interface CreateOrderRequest {
  customerAccountId: string;
  restaurantId: string;
  branchId: string;
  notes?: string;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
  selectedModifierOptionIds: string[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus | string;
}

export interface SelectedModifierResponse {
  modifierGroupId: string;
  modifierGroupName: string;
  modifierOptionId: string;
  modifierOptionName: string;
  priceAdjustment: number;
}

export interface OrderItemResponse {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  selectedModifiers: SelectedModifierResponse[];
  subtotal: number;
}

export interface OrderResponse {
  id: string;
  customerAccountId: string;
  restaurantId: string;
  branchId: string;
  items: OrderItemResponse[];
  subtotal: number;
  total: number;
  status: OrderStatus | string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderQueryFilters {
  status?: OrderStatus | string | null;
  from?: string | null;
  to?: string | null;
}
