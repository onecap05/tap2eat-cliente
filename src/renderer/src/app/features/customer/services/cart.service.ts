import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  IAddToCartRequest,
  ICartItem,
  ICartState,
  IProductModifierSelection,
  ISelectedModifierOption
} from '../models/cart.models';

const CART_STORAGE_KEY = 'tap2eat.customer.cart';
const EMPTY_CART: ICartState = {
  restaurantId: null,
  items: [],
  subtotal: 0
};

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly stateSubject = new BehaviorSubject<ICartState>(this.loadState());

  public readonly state$ = this.stateSubject.asObservable();

  public getSnapshot(): ICartState {
    return this.stateSubject.value;
  }

  public addItem(request: IAddToCartRequest, replaceRestaurantCart = false): boolean {
    const currentState = this.getSnapshot();
    const restaurantId = request.product.restaurantId;

    if (currentState.restaurantId && currentState.restaurantId !== restaurantId && !replaceRestaurantCart) {
      return false;
    }

    const baseState = currentState.restaurantId === restaurantId && !replaceRestaurantCart
      ? currentState
      : { ...EMPTY_CART, restaurantId };

    const item = this.buildCartItem(request);
    const existingItem = baseState.items.find(currentItem => currentItem.id === item.id);
    const items = existingItem
      ? baseState.items.map(currentItem => currentItem.id === item.id
        ? this.withQuantity(currentItem, currentItem.quantity + item.quantity)
        : currentItem)
      : [...baseState.items, item];

    this.updateState({
      restaurantId,
      items,
      subtotal: this.calculateCartSubtotal(items)
    });

    return true;
  }

  public increaseItem(itemId: string): void {
    this.updateItemQuantity(itemId, 1);
  }

  public decreaseItem(itemId: string): void {
    this.updateItemQuantity(itemId, -1);
  }

  public removeItem(itemId: string): void {
    const currentState = this.getSnapshot();
    const items = currentState.items.filter(item => item.id !== itemId);

    this.updateState({
      restaurantId: items.length ? currentState.restaurantId : null,
      items,
      subtotal: this.calculateCartSubtotal(items)
    });
  }

  public clear(): void {
    this.updateState(EMPTY_CART);
  }

  private updateItemQuantity(itemId: string, delta: number): void {
    const currentState = this.getSnapshot();
    const items = currentState.items
      .map(item => item.id === itemId ? this.withQuantity(item, item.quantity + delta) : item)
      .filter(item => item.quantity > 0);

    this.updateState({
      restaurantId: items.length ? currentState.restaurantId : null,
      items,
      subtotal: this.calculateCartSubtotal(items)
    });
  }

  private buildCartItem(request: IAddToCartRequest): ICartItem {
    const selectedModifiers = this.flattenModifierSelections(request.modifierSelections);
    const unitPrice = request.product.price + selectedModifiers.reduce(
      (total, option) => total + option.additionalPrice,
      0
    );
    const quantity = Math.max(1, request.quantity);
    const modifierKey = selectedModifiers
      .map(option => `${option.groupId}:${option.optionId}`)
      .sort()
      .join('|');

    return {
      id: `${request.product.id}|${modifierKey}`,
      restaurantId: request.product.restaurantId,
      productId: request.product.id,
      productName: request.product.name,
      productImageUrl: request.product.image?.url,
      basePrice: request.product.price,
      quantity,
      selectedModifiers,
      unitPrice,
      subtotal: unitPrice * quantity
    };
  }

  private flattenModifierSelections(selections: IProductModifierSelection[]): ISelectedModifierOption[] {
    return selections.flatMap(selection => {
      const groupId = selection.group.id ?? selection.group.name;

      return selection.options.map(option => ({
        groupId,
        groupName: selection.group.name,
        optionId: option.id ?? option.name,
        optionName: option.name,
        additionalPrice: option.additionalPrice ?? 0
      }));
    });
  }

  private withQuantity(item: ICartItem, quantity: number): ICartItem {
    const nextQuantity = Math.max(0, quantity);

    return {
      ...item,
      quantity: nextQuantity,
      subtotal: item.unitPrice * nextQuantity
    };
  }

  private calculateCartSubtotal(items: ICartItem[]): number {
    return items.reduce((total, item) => total + item.subtotal, 0);
  }

  private updateState(state: ICartState): void {
    const normalizedState = {
      ...state,
      subtotal: this.calculateCartSubtotal(state.items)
    };

    this.stateSubject.next(normalizedState);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizedState));
  }

  private loadState(): ICartState {
    const storedValue = localStorage.getItem(CART_STORAGE_KEY);

    if (!storedValue) {
      return EMPTY_CART;
    }

    try {
      const parsedState = JSON.parse(storedValue) as ICartState;

      return {
        restaurantId: parsedState.restaurantId ?? null,
        items: parsedState.items ?? [],
        subtotal: this.calculateCartSubtotal(parsedState.items ?? [])
      };
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);

      return EMPTY_CART;
    }
  }
}
