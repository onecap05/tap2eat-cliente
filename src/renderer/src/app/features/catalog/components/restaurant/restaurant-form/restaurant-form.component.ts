import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { IRestaurantResponse } from '../../../models/restaurant/IRestaurantResponse';
import { ImageUploadApiService } from '../../../services/ImageUploadApiService';

export interface RestaurantFormValue {
  name: string;
  rfc: string;
  description: string;
  logoUrl: string;
  logoObjectKey: string;
  logoProvider: string;
}

interface RestaurantLogoMetadata {
  url: string;
  objectKey: string;
  provider: string;
}

const MAX_LOGO_SIZE_IN_MB = 5;
const BYTES_PER_MB = 1024 * 1024;
const RFC_PATTERN = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

const RESTAURANT_FORM_MESSAGES = {
  requiredName: 'Escribe el nombre del restaurante.',
  requiredRfc: 'Escribe el RFC del restaurante.',
  invalidRfc: 'El RFC debe tener un formato válido.',
  invalidLogoFile: 'Selecciona un archivo de imagen válido.',
  invalidLogoSize: `El logo no debe superar ${MAX_LOGO_SIZE_IN_MB} MB.`,
  uploadLogoFailed: 'No se pudo subir el logo del restaurante.'
};

const RESTAURANT_FORM_LABELS = {
  name: 'Nombre del restaurante',
  rfc: 'RFC del restaurante',
  description: 'Descripción',
  logo: 'Logo del restaurante',
  selectLogo: 'Seleccionar imagen',
  logoHint: 'JPG, PNG o WEBP. Máximo 5 MB.',
  emptyLogoHint: 'Si no seleccionas imagen, el restaurante se mostrará con la inicial.',
  removeLogo: 'Quitar imagen',
  createButton: 'Crear restaurante',
  updateButton: 'Guardar cambios',
  creatingButton: 'Creando...',
  updatingButton: 'Guardando...',
  uploadingLogoButton: 'Subiendo logo...',
  cancelButton: 'Cancelar'
};

@Component({
  selector: 'app-restaurant-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurant-form.component.html',
  styleUrl: './restaurant-form.component.css'
})
export class RestaurantFormComponent implements OnChanges, OnDestroy {
  @Input() saving = false;
  @Input() restaurantToEdit: IRestaurantResponse | null = null;

  @Output() createRestaurant = new EventEmitter<RestaurantFormValue>();
  @Output() updateRestaurant = new EventEmitter<RestaurantFormValue>();
  @Output() cancel = new EventEmitter<void>();

  readonly labels = RESTAURANT_FORM_LABELS;

  form: RestaurantFormValue = this.createEmptyForm();

  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  uploadingLogo = false;
  errorMessage = '';

  private logoPreviewObjectUrl: string | null = null;

  constructor(private readonly imageUploadApiService: ImageUploadApiService) {}

  get isEditMode(): boolean {
    return this.restaurantToEdit !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['restaurantToEdit']) {
      this.loadRestaurantToEdit();
    }
  }

  ngOnDestroy(): void {
    this.clearLogoPreviewObjectUrl();
  }

  async submit(): Promise<void> {
    this.errorMessage = '';

    if (this.saving || this.uploadingLogo) {
      return;
    }

    if (!this.form.name.trim()) {
      this.errorMessage = RESTAURANT_FORM_MESSAGES.requiredName;
      return;
    }

    const normalizedRfc = this.normalizeRfc(this.form.rfc);

    if (!normalizedRfc) {
      this.errorMessage = RESTAURANT_FORM_MESSAGES.requiredRfc;
      return;
    }

    if (!RFC_PATTERN.test(normalizedRfc)) {
      this.errorMessage = RESTAURANT_FORM_MESSAGES.invalidRfc;
      return;
    }

    this.form.rfc = normalizedRfc;

    try {
      const logo = await this.resolveLogoForSubmit();

      const formValue: RestaurantFormValue = {
        name: this.form.name.trim(),
        rfc: normalizedRfc,
        description: this.form.description.trim(),
        logoUrl: logo?.url ?? '',
        logoObjectKey: logo?.objectKey ?? '',
        logoProvider: logo?.provider ?? 'CLOUDINARY'
      };

      if (this.isEditMode) {
        this.updateRestaurant.emit(formValue);
        return;
      }

      this.createRestaurant.emit(formValue);
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : RESTAURANT_FORM_MESSAGES.uploadLogoFailed;
    }
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = RESTAURANT_FORM_MESSAGES.invalidLogoFile;
      input.value = '';
      return;
    }

    if (file.size > MAX_LOGO_SIZE_IN_MB * BYTES_PER_MB) {
      this.errorMessage = RESTAURANT_FORM_MESSAGES.invalidLogoSize;
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.selectedLogoFile = file;
    this.clearLogoPreviewObjectUrl();

    this.logoPreviewObjectUrl = URL.createObjectURL(file);
    this.logoPreviewUrl = this.logoPreviewObjectUrl;
  }

  removeSelectedLogo(): void {
    this.selectedLogoFile = null;
    this.clearLogoPreviewObjectUrl();
    this.logoPreviewUrl = null;
    this.form.logoUrl = '';
    this.form.logoObjectKey = '';
    this.form.logoProvider = 'CLOUDINARY';
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private async resolveLogoForSubmit(): Promise<RestaurantLogoMetadata | null> {
    if (!this.selectedLogoFile) {
      if (!this.form.logoUrl) {
        return null;
      }

      return {
        url: this.form.logoUrl,
        objectKey: this.form.logoObjectKey,
        provider: this.form.logoProvider || 'CLOUDINARY'
      };
    }

    this.uploadingLogo = true;

    try {
      const uploadedLogo = await firstValueFrom(
        this.imageUploadApiService.uploadRestaurantLogo(this.selectedLogoFile)
      );

      return {
        url: uploadedLogo.url,
        objectKey: uploadedLogo.objectKey,
        provider: uploadedLogo.provider
      };
    } finally {
      this.uploadingLogo = false;
    }
  }

  private loadRestaurantToEdit(): void {
    this.clearLogoPreviewObjectUrl();
    this.selectedLogoFile = null;

    if (!this.restaurantToEdit) {
      this.form = this.createEmptyForm();
      this.logoPreviewUrl = null;
      return;
    }

    this.form = {
      name: this.restaurantToEdit.name ?? '',
      rfc: this.restaurantToEdit.rfc ?? '',
      description: this.restaurantToEdit.description ?? '',
      logoUrl: this.restaurantToEdit.logo?.url ?? '',
      logoObjectKey: this.restaurantToEdit.logo?.objectKey ?? '',
      logoProvider: this.restaurantToEdit.logo?.provider ?? 'CLOUDINARY'
    };

    this.logoPreviewUrl = this.restaurantToEdit.logo?.url ?? null;
  }

  private createEmptyForm(): RestaurantFormValue {
    return {
      name: '',
      rfc: '',
      description: '',
      logoUrl: '',
      logoObjectKey: '',
      logoProvider: 'CLOUDINARY'
    };
  }

  private normalizeRfc(rfc: string): string {
    return rfc.trim().toUpperCase();
  }

  private clearLogoPreviewObjectUrl(): void {
    if (this.logoPreviewObjectUrl) {
      URL.revokeObjectURL(this.logoPreviewObjectUrl);
      this.logoPreviewObjectUrl = null;
    }
  }
}