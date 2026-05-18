import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import maplibregl, { LngLat, LngLatLike, Map, Marker } from 'maplibre-gl';
import { firstValueFrom } from 'rxjs';

import { ICreateBranchRequest } from '../../../models/branch/ICreateBranchRequest';
import { LocationApiService } from '../../../services/LocationApiService';
import { IPostalCodeLookupResponse } from '../../../models/location/IPostalCodeLookupResponse';

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  path?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  quarter?: string;
  residential?: string;
  borough?: string;
  hamlet?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: NominatimAddress;
}

@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-form.component.html',
  styleUrl: './branch-form.component.css'
})
export class BranchFormComponent implements AfterViewInit, OnDestroy {
  private static readonly DEFAULT_CENTER: [number, number] = [-96.9101, 19.5438];
  private static readonly DEFAULT_ZOOM = 14;
  private static readonly REVERSE_GEOCODING_URL = 'https://nominatim.openstreetmap.org/reverse';
  private static readonly MEXICO_POSTAL_CODE_PATTERN = /^\d{5}$/;

  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  @Input() saving = false;

  @Output() createBranch = new EventEmitter<Omit<ICreateBranchRequest, 'restaurantId'>>();

  errorMessage = '';
  mapMessage = 'Obteniendo ubicación actual...';
  postalCodeMessage = '';
  loadingPostalCode = false;
  neighborhoodOptions: string[] = [];

  form = {
    name: '',
    phoneNumber: '',
    formattedAddress: '',
    street: '',
    exteriorNumber: '',
    interiorNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    addressReference: '',
    latitude: '',
    longitude: '',
    googlePlaceId: '',
    isMainBranch: false
  };

  private map?: Map;
  private marker?: Marker;
  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly http: HttpClient,
    private readonly locationApiService: LocationApiService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser || !this.mapContainer) {
      return;
    }

    this.initializeMap(BranchFormComponent.DEFAULT_CENTER, BranchFormComponent.DEFAULT_ZOOM);
    this.tryCenterMapOnCurrentLocation();
  }

  ngOnDestroy(): void {
    this.marker?.remove();
    this.map?.remove();
  }

  submit(): void {
    this.errorMessage = '';

    if (!this.form.name.trim()) {
      this.errorMessage = 'El nombre de la sucursal es obligatorio.';
      return;
    }

    if (!this.form.street.trim()) {
      this.errorMessage = 'La calle es obligatoria.';
      return;
    }

    if (!this.form.neighborhood.trim()) {
      this.errorMessage = 'La colonia es obligatoria.';
      return;
    }

    if (!this.form.city.trim()) {
      this.errorMessage = 'La ciudad es obligatoria.';
      return;
    }

    if (!this.form.state.trim()) {
      this.errorMessage = 'El estado es obligatorio.';
      return;
    }

    if (!this.form.country.trim()) {
      this.errorMessage = 'El país es obligatorio.';
      return;
    }

    if (
      this.form.country.trim().toLowerCase().includes('méxico') &&
      !BranchFormComponent.MEXICO_POSTAL_CODE_PATTERN.test(this.form.postalCode.trim())
    ) {
      this.errorMessage = 'El código postal debe tener 5 dígitos para México.';
      return;
    }

    const latitude = Number(this.form.latitude);
    const longitude = Number(this.form.longitude);

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      this.errorMessage = 'Selecciona una ubicación válida en el mapa.';
      return;
    }

    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      this.errorMessage = 'Selecciona una ubicación válida en el mapa.';
      return;
    }

    this.createBranch.emit({
      name: this.form.name.trim(),
      phoneNumber: this.form.phoneNumber.trim() || null,
      formattedAddress: this.buildFormattedAddress(),
      street: this.form.street.trim(),
      exteriorNumber: this.form.exteriorNumber.trim() || null,
      interiorNumber: this.form.interiorNumber.trim() || null,
      neighborhood: this.form.neighborhood.trim(),
      city: this.form.city.trim(),
      state: this.form.state.trim(),
      postalCode: this.form.postalCode.trim() || null,
      country: this.form.country.trim(),
      addressReference: this.form.addressReference.trim() || null,
      latitude,
      longitude,
      googlePlaceId: this.form.googlePlaceId.trim() || null,
      isMainBranch: this.form.isMainBranch,
      availability: {
        status: 'AVAILABLE',
        temporaryReason: null,
        temporaryReasonDetail: null,
        weeklySchedule: []
      }
    });

    this.resetForm();
  }

  centerOnCurrentLocation(): void {
    this.tryCenterMapOnCurrentLocation();
  }

  async lookupPostalCode(): Promise<void> {
    const postalCode = this.form.postalCode.trim();

    this.postalCodeMessage = '';

    if (!postalCode) {
      this.neighborhoodOptions = [];
      return;
    }

    if (!BranchFormComponent.MEXICO_POSTAL_CODE_PATTERN.test(postalCode)) {
      this.postalCodeMessage = 'El código postal debe tener 5 dígitos.';
      this.neighborhoodOptions = [];
      return;
    }

    await this.loadPostalCodeData(postalCode, true);
  }

  private initializeMap(center: LngLatLike, zoom: number): void {
    if (!this.mapContainer) {
      return;
    }

    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          }
        ]
      },
      center,
      zoom
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

    this.map.once('load', () => {
      this.map?.resize();
    });

    this.marker = new maplibregl.Marker({
      draggable: true
    })
      .setLngLat(center)
      .addTo(this.map);

    this.updateCoordinatesFromMarker();

    this.marker.on('dragend', () => {
      const lngLat = this.marker?.getLngLat();

      if (!lngLat) {
        return;
      }

      this.updateLocationFromLngLat(lngLat, 'Ubicación actualizada desde el marcador.');
    });

    this.map.on('click', (event) => {
      this.marker?.setLngLat(event.lngLat);
      this.updateLocationFromLngLat(event.lngLat, 'Ubicación actualizada desde el mapa.');
    });
  }

  private tryCenterMapOnCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.mapMessage = 'Tu navegador no permite obtener la ubicación actual.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const longitude = position.coords.longitude;
        const latitude = position.coords.latitude;
        const center: [number, number] = [longitude, latitude];

        this.map?.flyTo({
          center,
          zoom: BranchFormComponent.DEFAULT_ZOOM
        });

        this.marker?.setLngLat(center);
        this.updateLocationFromLngLat(
          new LngLat(longitude, latitude),
          'Mapa centrado en tu ubicación actual.'
        );
      },
      () => {
        this.mapMessage = 'No se pudo obtener tu ubicación. Puedes seleccionar el punto en el mapa.';
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  private async updateLocationFromLngLat(lngLat: LngLat, successMessage: string): Promise<void> {
    this.updateCoordinates(lngLat);
    this.mapMessage = 'Buscando dirección de la ubicación...';

    await this.fillAddressFromCoordinates(lngLat);

    this.mapMessage = successMessage;
  }

  private updateCoordinatesFromMarker(): void {
    const lngLat = this.marker?.getLngLat();

    if (!lngLat) {
      return;
    }

    this.updateCoordinates(lngLat);
  }

  private updateCoordinates(lngLat: LngLat): void {
    this.form.latitude = lngLat.lat.toFixed(7);
    this.form.longitude = lngLat.lng.toFixed(7);
  }

  private async fillAddressFromCoordinates(lngLat: LngLat): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<NominatimReverseResponse>(BranchFormComponent.REVERSE_GEOCODING_URL, {
          params: {
            format: 'jsonv2',
            lat: lngLat.lat,
            lon: lngLat.lng,
            zoom: 18,
            addressdetails: 1,
            'accept-language': 'es'
          }
        })
      );

      this.applyAddressFromNominatim(response);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      this.mapMessage = 'No se pudo obtener la dirección automáticamente.';
    }
  }

  private async loadPostalCodeData(postalCode: string, clearInvalidNeighborhood: boolean): Promise<void> {
    this.loadingPostalCode = true;

    try {
      const response = await firstValueFrom(
        this.locationApiService.lookupPostalCode(postalCode)
      );

      this.applyPostalCodeLookup(response, clearInvalidNeighborhood);
      this.postalCodeMessage = 'Código postal validado.';
    } catch (error) {
      console.error('Postal code lookup error:', error);
      this.postalCodeMessage = 'No se encontró información para este código postal.';
      this.neighborhoodOptions = [];
    } finally {
      this.loadingPostalCode = false;
    }
  }

  private applyPostalCodeLookup(
    response: IPostalCodeLookupResponse,
    clearInvalidNeighborhood: boolean
  ): void {
    this.form.city = response.city || response.municipality || this.form.city;
    this.form.state = response.state || this.form.state;
    this.form.country = response.country || 'México';
    this.neighborhoodOptions = response.neighborhoods || [];

    if (!this.form.neighborhood && this.neighborhoodOptions.length === 1) {
      this.form.neighborhood = this.neighborhoodOptions[0];
      return;
    }

    const currentNeighborhoodExists = this.neighborhoodOptions.some(
      neighborhood => this.normalizeText(neighborhood) === this.normalizeText(this.form.neighborhood)
    );

    if (clearInvalidNeighborhood && this.form.neighborhood && !currentNeighborhoodExists) {
      this.form.neighborhood = '';
    }
  }

  private applyAddressFromNominatim(response: NominatimReverseResponse): void {
    const address = response.address;

    if (!address) {
      if (response.display_name?.trim()) {
        this.form.formattedAddress = response.display_name.trim();
      }

      return;
    }

    this.form.street = this.firstAvailable([
      address.road,
      address.pedestrian,
      address.footway,
      address.path
    ]);

    this.form.exteriorNumber = address.house_number || '';

    this.form.neighborhood = this.firstAvailable([
      address.neighbourhood,
      address.suburb,
      address.city_district,
      address.quarter,
      address.residential,
      address.borough,
      address.hamlet
    ]);

    this.form.city = this.firstAvailable([
      address.city,
      address.town,
      address.village,
      address.municipality,
      address.county
    ]);

    this.form.state = address.state || '';
    this.form.postalCode = address.postcode || '';
    this.form.country = address.country || '';

    this.form.formattedAddress = this.buildFormattedAddress();

    if (
      BranchFormComponent.MEXICO_POSTAL_CODE_PATTERN.test(this.form.postalCode.trim())
    ) {
      this.loadPostalCodeData(this.form.postalCode.trim(), false);
    }

    if (!this.form.formattedAddress && response.display_name?.trim()) {
      this.form.formattedAddress = response.display_name.trim();
    }
  }

  private buildFormattedAddress(): string {
    const streetLine = [
      this.form.street.trim(),
      this.form.exteriorNumber.trim(),
      this.form.interiorNumber.trim() ? `Int. ${this.form.interiorNumber.trim()}` : ''
    ]
      .filter(Boolean)
      .join(' ');

    return [
      streetLine,
      this.form.neighborhood.trim(),
      this.form.city.trim(),
      this.form.state.trim(),
      this.form.postalCode.trim(),
      this.form.country.trim()
    ]
      .filter(Boolean)
      .join(', ');
  }

  private firstAvailable(values: Array<string | undefined>): string {
    return values.find(value => value?.trim())?.trim() || '';
  }

  private normalizeText(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private resetForm(): void {
    this.form = {
      name: '',
      phoneNumber: '',
      formattedAddress: '',
      street: '',
      exteriorNumber: '',
      interiorNumber: '',
      neighborhood: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      addressReference: '',
      latitude: '',
      longitude: '',
      googlePlaceId: '',
      isMainBranch: false
    };

    this.neighborhoodOptions = [];
    this.postalCodeMessage = '';

    this.marker?.setLngLat(BranchFormComponent.DEFAULT_CENTER);
    this.map?.flyTo({
      center: BranchFormComponent.DEFAULT_CENTER,
      zoom: BranchFormComponent.DEFAULT_ZOOM
    });
    this.updateCoordinatesFromMarker();
  }
}