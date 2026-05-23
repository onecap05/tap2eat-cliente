import { TestBed } from '@angular/core/testing';

import { IModifierGroupResponse } from '../../catalog/models/commons/IModifierGroupResponse';
import { IModifierOptionResponse } from '../../catalog/models/commons/IModifierOptionResponse';
import { CustomerProductResponse } from '../models/customer-catalog.models';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should calculate totals with modifier prices', () => {
    service.addItem({
      product: product('product-1', 'restaurant-1', 100),
      quantity: 2,
      modifierSelections: [
        {
          group: modifierGroup('group-1'),
          options: [modifierOption('option-1', 25)]
        }
      ]
    });

    const state = service.getSnapshot();

    expect(state.items[0].unitPrice).toBe(125);
    expect(state.items[0].subtotal).toBe(250);
    expect(state.subtotal).toBe(250);
  });

  it('should store real modifier option id when option has id', () => {
    service.addItem({
      product: product('product-1', 'restaurant-1', 100),
      quantity: 1,
      modifierSelections: [
        {
          group: modifierGroup('group-1'),
          options: [modifierOption('option-real-1', 15, 'Pan brioche')]
        }
      ]
    });

    const state = service.getSnapshot();

    expect(state.items[0].selectedModifiers[0].optionId).toBe('option-real-1');
    expect(state.items[0].selectedModifiers[0].optionName).toBe('Pan brioche');
  });

  it('should not use option name as option id when option id is missing', () => {
    service.addItem({
      product: product('product-1', 'restaurant-1', 100),
      quantity: 1,
      modifierSelections: [
        {
          group: modifierGroup('group-1'),
          options: [modifierOptionWithoutId('Pan brioche', 15)]
        }
      ]
    });

    const state = service.getSnapshot();

    expect(state.items[0].selectedModifiers).toHaveLength(0);
    expect(state.items[0].id).not.toContain('Pan brioche');
  });

  it('should merge equal products with equal modifiers', () => {
    const request = {
      product: product('product-1', 'restaurant-1', 90),
      quantity: 1,
      modifierSelections: [
        {
          group: modifierGroup('group-1'),
          options: [modifierOption('option-1', 10)]
        }
      ]
    };

    service.addItem(request);
    service.addItem(request);

    const state = service.getSnapshot();

    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.subtotal).toBe(200);
  });

  it('should block products from another restaurant until replacement is confirmed', () => {
    service.addItem({
      product: product('product-1', 'restaurant-1', 100),
      quantity: 1,
      modifierSelections: []
    });

    const wasAdded = service.addItem({
      product: product('product-2', 'restaurant-2', 80),
      quantity: 1,
      modifierSelections: []
    });

    expect(wasAdded).toBe(false);
    expect(service.getSnapshot().restaurantId).toBe('restaurant-1');
  });

  it('should replace cart when restaurant replacement is confirmed', () => {
    service.addItem({
      product: product('product-1', 'restaurant-1', 100),
      quantity: 1,
      modifierSelections: []
    });

    service.addItem({
      product: product('product-2', 'restaurant-2', 80),
      quantity: 1,
      modifierSelections: []
    }, true);

    const state = service.getSnapshot();

    expect(state.restaurantId).toBe('restaurant-2');
    expect(state.items).toHaveLength(1);
    expect(state.subtotal).toBe(80);
  });

  it('should block unavailable products', () => {
    const wasAdded = service.addItem({
      product: {
        ...product('product-1', 'restaurant-1', 100),
        available: false
      },
      quantity: 1,
      modifierSelections: []
    });

    expect(wasAdded).toBe(false);
    expect(service.getSnapshot().items).toHaveLength(0);
  });

  function product(id: string, restaurantId: string, price: number): CustomerProductResponse {
    return {
      id,
      restaurantId,
      categoryId: 'category-1',
      name: 'Product',
      productType: 'CUSTOMIZABLE',
      price,
      featured: false,
      active: true,
      available: true,
      tags: [],
      dietaryFlags: [],
      allergens: [],
      modifierGroups: []
    };
  }

  function modifierGroup(id: string): IModifierGroupResponse {
    return {
      id,
      name: 'Extras',
      selectionType: 'MULTIPLE',
      required: false,
      minSelections: 0,
      maxSelections: 3,
      active: true,
      options: []
    };
  }

  function modifierOption(
    id: string,
    additionalPrice: number,
    name = 'Extra'
  ): IModifierOptionResponse {
    return {
      id,
      name,
      additionalPrice,
      active: true
    };
  }

  function modifierOptionWithoutId(name: string, additionalPrice: number): IModifierOptionResponse {
    return {
      id: null,
      name,
      additionalPrice,
      active: true
    };
  }
});
