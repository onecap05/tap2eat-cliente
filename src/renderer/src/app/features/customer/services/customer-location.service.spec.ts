import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { CustomerLocationService } from './customer-location.service';

describe('CustomerLocationService', () => {
  let service: CustomerLocationService;
  let originalGeolocation: Geolocation | undefined;

  beforeEach(() => {
    originalGeolocation = navigator.geolocation;
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomerLocationService);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation
    });
  });

  it('returns location when geolocation succeeds', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: {
              latitude: 19.43,
              longitude: -99.13
            }
          } as GeolocationPosition);
        }
      }
    });

    await expect(firstValueFrom(service.getCurrentLocation()))
      .resolves.toEqual({ latitude: 19.43, longitude: -99.13 });
  });

  it('returns null when geolocation fails', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, message: 'denied' } as GeolocationPositionError);
        }
      }
    });

    await expect(firstValueFrom(service.getCurrentLocation()))
      .resolves.toBeNull();
  });

  it('returns null when geolocation is unavailable', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined
    });

    await expect(firstValueFrom(service.getCurrentLocation()))
      .resolves.toBeNull();
  });
});
