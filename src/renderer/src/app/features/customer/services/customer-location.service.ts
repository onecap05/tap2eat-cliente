import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CustomerLocation } from '../models/recommendation.models';

@Injectable({
  providedIn: 'root'
})
export class CustomerLocationService {
  private readonly timeoutMs = 7000;

  public getCurrentLocation(): Observable<CustomerLocation | null> {
    return new Observable<CustomerLocation | null>(subscriber => {
      const geolocation = globalThis.navigator?.geolocation;

      if (!geolocation) {
        subscriber.next(null);
        subscriber.complete();
        return;
      }

      geolocation.getCurrentPosition(
        position => {
          subscriber.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          subscriber.complete();
        },
        () => {
          subscriber.next(null);
          subscriber.complete();
        },
        {
          enableHighAccuracy: false,
          maximumAge: 60000,
          timeout: this.timeoutMs
        }
      );
    });
  }
}
