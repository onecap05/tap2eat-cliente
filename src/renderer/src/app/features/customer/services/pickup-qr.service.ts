import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

import { OrderResponse } from '../models/order.models';

export interface PickupQrPayload {
  type: 'TAP2EAT_PICKUP';
  orderId: string;
  customerAccountId: string;
  restaurantId: string;
  branchId: string;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class PickupQrService {
  public buildPayload(order: OrderResponse): PickupQrPayload {
    // TODO: In production, this pickup payload should come from a signed backend token.
    return {
      type: 'TAP2EAT_PICKUP',
      orderId: order.id,
      customerAccountId: order.customerAccountId,
      restaurantId: order.restaurantId,
      branchId: order.branchId,
      total: order.total
    };
  }

  public buildPayloadText(order: OrderResponse): string {
    return JSON.stringify(this.buildPayload(order));
  }

  public generatePickupQrDataUrl(order: OrderResponse): Promise<string> {
    return QRCode.toDataURL(this.buildPayloadText(order), {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220
    });
  }
}
