import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { ICreateProductRequest } from '../../../models/product/ICreateProductRequest';
import { IImageMetadataRequest } from '../../../models/commons/IImageMetadataRequest';
import { ImageUploadApiService } from '../../../services/ImageUploadApiService';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css'
})
export class ProductFormComponent {
  @Input() categories: ICategoryResponse[] = [];
  @Input() saving = false;

  @Output() createProduct = new EventEmitter<Omit<ICreateProductRequest, 'restaurantId'>>();

  readonly dietaryFlagOptions = [
    { label: 'Vegetariano', value: 'VEGETARIAN' },
    { label: 'Vegano', value: 'VEGAN' },
    { label: 'Sin gluten', value: 'GLUTEN_FREE' },
    { label: 'Sin lactosa', value: 'LACTOSE_FREE' },
    { label: 'Picante', value: 'SPICY' },
    { label: 'Bajo en azúcar', value: 'LOW_SUGAR' }
  ];

  readonly allergenOptions = [
    { label: 'Gluten', value: 'GLUTEN' },
    { label: 'Lácteos', value: 'DAIRY' },
    { label: 'Huevo', value: 'EGG' },
    { label: 'Cacahuate', value: 'PEANUT' },
    { label: 'Nueces', value: 'TREE_NUTS' },
    { label: 'Soya', value: 'SOY' },
    { label: 'Pescado', value: 'FISH' },
    { label: 'Mariscos', value: 'SHELLFISH' },
    { label: 'Ajonjolí', value: 'SESAME' }
  ];

  form = {
    categoryId: '',
    name: '',
    description: '',
    productType: 'SIMPLE',
    price: '',
    featured: false,
    available: true,
    dietaryFlags: [] as string[],
    allergens: [] as string[]
  };

  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  uploadingImage = false;
  errorMessage = '';

  constructor(private readonly imageUploadApiService: ImageUploadApiService) {}

  async submit(): Promise<void> {
    this.errorMessage = '';

    if (!this.form.categoryId || !this.form.name.trim()) {
      this.errorMessage = 'Selecciona una categoría y escribe el nombre del producto.';
      return;
    }

    const price = Number(this.form.price);

    if (Number.isNaN(price) || price < 0) {
      this.errorMessage = 'El precio debe ser un número válido mayor o igual a 0.';
      return;
    }

    try {
      const uploadedImage = this.selectedImageFile
        ? await this.uploadSelectedImage(this.selectedImageFile)
        : null;

      this.createProduct.emit({
        categoryId: this.form.categoryId,
        name: this.form.name.trim(),
        description: this.form.description.trim() || null,
        productType: this.form.productType as 'SIMPLE' | 'CUSTOMIZABLE',
        price,
        image: uploadedImage,
        modifierGroups: [],
        availability: {
          status: this.form.available ? 'AVAILABLE' : 'TEMPORARILY_UNAVAILABLE',
          temporaryReason: null,
          temporaryReasonDetail: null,
          weeklySchedule: []
        },
        active: true,
        displayOrder: null,
        featured: this.form.featured,
        tags: [],
        dietaryFlags: this.form.dietaryFlags,
        allergens: this.form.allergens
      });

      this.resetForm();
    } catch {
      this.errorMessage = 'No se pudo subir la imagen del producto. Intenta de nuevo.';
    }
  }

  onImageSelected(event: Event): void {
    this.errorMessage = '';

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Selecciona un archivo de imagen válido.';
      input.value = '';
      return;
    }

    const maxSizeInMb = 5;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      this.errorMessage = `La imagen no debe superar ${maxSizeInMb} MB.`;
      input.value = '';
      return;
    }

    this.selectedImageFile = file;

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    this.imagePreviewUrl = URL.createObjectURL(file);
  }

  removeSelectedImage(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
  }

  toggleDietaryFlag(value: string): void {
    this.form.dietaryFlags = this.toggleValue(this.form.dietaryFlags, value);
  }

  toggleAllergen(value: string): void {
    this.form.allergens = this.toggleValue(this.form.allergens, value);
  }

  isDietaryFlagSelected(value: string): boolean {
    return this.form.dietaryFlags.includes(value);
  }

  isAllergenSelected(value: string): boolean {
    return this.form.allergens.includes(value);
  }

  private async uploadSelectedImage(file: File): Promise<IImageMetadataRequest> {
    this.uploadingImage = true;

    try {
      const response = await firstValueFrom(
        this.imageUploadApiService.uploadProductImage(file)
      );

      return {
        url: response.url,
        objectKey: response.objectKey,
        provider: response.provider
      };
    } finally {
      this.uploadingImage = false;
    }
  }

  private toggleValue(values: string[], value: string): string[] {
    return values.includes(value)
      ? values.filter(item => item !== value)
      : [...values, value];
  }

  private resetForm(): void {
    this.form = {
      categoryId: '',
      name: '',
      description: '',
      productType: 'SIMPLE',
      price: '',
      featured: false,
      available: true,
      dietaryFlags: [],
      allergens: []
    };

    this.removeSelectedImage();
    this.errorMessage = '';
  }
}