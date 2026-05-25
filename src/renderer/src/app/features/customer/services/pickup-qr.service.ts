import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

import { OrderResponse } from '../models/order.models';

@Injectable({
  providedIn: 'root'
})
export class PickupQrService {
  public buildTrackingUrl(order: OrderResponse): string | null {
    if (!order.publicTrackingCode) {
      return null;
    }

    return `${window.location.origin}/orders/track/${encodeURIComponent(order.publicTrackingCode)}`;
  }

  public buildPayloadText(order: OrderResponse): string {
    const trackingUrl = this.buildTrackingUrl(order);

    if (!trackingUrl) {
      throw new Error('Order public tracking code is missing.');
    }

    return trackingUrl;
  }

  public generatePickupQrDataUrl(order: OrderResponse): Promise<string> {
    return QRCode.toDataURL(this.buildPayloadText(order), {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220
    });
  }
}
