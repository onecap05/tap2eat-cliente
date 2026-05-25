import { TestBed } from '@angular/core/testing';

import { OrderResponse } from '../models/order.models';
import { PickupQrService } from './pickup-qr.service';

describe('PickupQrService', () => {
  let service: PickupQrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PickupQrService);
  });

  it('should generate public tracking URL for QR payload', () => {
    const payload = service.buildPayloadText(order());

    expect(payload).toBe(`${window.location.origin}/orders/track/public-track-1`);
  });

  it('should throw when public tracking code is missing', () => {
    const orderWithoutTrackingCode = order();
    orderWithoutTrackingCode.publicTrackingCode = null;

    expect(() => service.buildPayloadText(orderWithoutTrackingCode)).toThrow();
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
    publicTrackingCode: 'public-track-1',
    items: [],
    subtotal: 120,
    total: 120,
    status: 'Ready',
    createdAt: '2026-05-23T12:00:00Z',
    updatedAt: '2026-05-23T12:00:00Z'
  };
}
