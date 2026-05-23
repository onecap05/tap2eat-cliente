import { TestBed } from '@angular/core/testing';

import { OrderResponse } from '../models/order.models';
import { PickupQrService } from './pickup-qr.service';

describe('PickupQrService', () => {
  let service: PickupQrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PickupQrService);
  });

  it('should generate pickup payload with order id and main data', () => {
    const payload = service.buildPayload(order());

    expect(payload).toEqual({
      type: 'TAP2EAT_PICKUP',
      orderId: 'order-1',
      customerAccountId: 'customer-1',
      restaurantId: 'restaurant-1',
      branchId: 'branch-1',
      total: 120
    });
  });

  it('should generate a QR data url', async () => {
    const dataUrl = await service.generatePickupQrDataUrl(order());

    expect(dataUrl).toContain('data:image/png;base64,');
  });
});

function order(): OrderResponse {
  return {
    id: 'order-1',
    customerAccountId: 'customer-1',
    restaurantId: 'restaurant-1',
    branchId: 'branch-1',
    items: [],
    subtotal: 120,
    total: 120,
    status: 'Ready',
    createdAt: '2026-05-23T12:00:00Z',
    updatedAt: '2026-05-23T12:00:00Z'
  };
}
