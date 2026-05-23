import { IModifierGroupResponse } from '../../catalog/models/commons/IModifierGroupResponse';
import { IModifierOptionResponse } from '../../catalog/models/commons/IModifierOptionResponse';
import { CustomerProductResponse } from './customer-catalog.models';

export interface ISelectedModifierOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  additionalPrice: number;
}

export interface IProductModifierSelection {
  group: IModifierGroupResponse;
  options: IModifierOptionResponse[];
}

export interface ICartItem {
  id: string;
  restaurantId: string;
  branchId?: string | null;
  productId: string;
  productName: string;
  productImageUrl?: string | null;
  basePrice: number;
  quantity: number;
  selectedModifiers: ISelectedModifierOption[];
  unitPrice: number;
  subtotal: number;
}

export interface ICartState {
  restaurantId: string | null;
  branchId: string | null;
  items: ICartItem[];
  subtotal: number;
}

export interface IAddToCartRequest {
  product: CustomerProductResponse;
  branchId?: string | null;
  quantity: number;
  modifierSelections: IProductModifierSelection[];
}
