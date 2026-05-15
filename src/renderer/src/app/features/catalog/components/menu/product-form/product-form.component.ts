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

import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { ICreateProductRequest } from '../../../models/product/ICreateProductRequest';
import { IUpdateProductRequest } from '../../../models/product/IUpdateProductRequest';
import { IProductResponse } from '../../../models/product/IProductResponse';
import { IImageMetadataRequest } from '../../../models/commons/IImageMetadataRequest';
import {
  DayOfWeekRequest,
  IDailyAvailabilityRequest
} from '../../../models/commons/IAvailabilityConfigRequest';
import { ImageUploadApiService } from '../../../services/ImageUploadApiService';

type ScheduleFormDay = {
  dayOfWeek: DayOfWeekRequest;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css'
})
export class ProductFormComponent implements OnChanges, OnDestroy {
  @Input() categories: ICategoryResponse[] = [];
  @Input() saving = false;
  @Input() productToEdit: IProductResponse | null = null;

  @Output() createProduct = new EventEmitter<Omit<ICreateProductRequest, 'restaurantId'>>();
  @Output() updateProduct = new EventEmitter<{ productId: string; request: IUpdateProductRequest }>();

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

  readonly dayOptions: { label: string; value: DayOfWeekRequest }[] = [
    { label: 'Lunes', value: 'MONDAY' },
    { label: 'Martes', value: 'TUESDAY' },
    { label: 'Miércoles', value: 'WEDNESDAY' },
    { label: 'Jueves', value: 'THURSDAY' },
    { label: 'Viernes', value: 'FRIDAY' },
    { label: 'Sábado', value: 'SATURDAY' },
    { label: 'Domingo', value: 'SUNDAY' }
  ];

  form = {
    categoryId: '',
    name: '',
    description: '',
    productType: 'SIMPLE',
    price: '',
    featured: false,
    available: true,
    useSpecificSchedule: false,
    dietaryFlags: [] as string[],
    allergens: [] as string[]
  };

  scheduleForm: ScheduleFormDay[] = this.createEmptyScheduleForm();

  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  uploadingImage = false;
  errorMessage = '';

  private imagePreviewObjectUrl: string | null = null;
  private currentImageMetadata: IImageMetadataRequest | null = null;

  constructor(private readonly imageUploadApiService: ImageUploadApiService) {}

  get isEditMode(): boolean {
    return this.productToEdit !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productToEdit']) {
      this.loadProductToEdit();
    }
  }

  ngOnDestroy(): void {
    this.clearImagePreviewObjectUrl();
  }

  async submit(): Promise<void> {
    this.errorMessage = '';

    if (this.saving || this.uploadingImage) {
      return;
    }

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
      const image = await this.resolveImageForSubmit();

      const request: IUpdateProductRequest = {
        categoryId: this.form.categoryId,
        name: this.form.name.trim(),
        description: this.form.description.trim() || null,
        productType: this.form.productType as 'SIMPLE' | 'CUSTOMIZABLE',
        price,
        image,
        modifierGroups: this.productToEdit?.modifierGroups ?? [],
        availability: {
          status: this.form.available ? 'AVAILABLE' : 'TEMPORARILY_UNAVAILABLE',
          temporaryReason: this.form.available
            ? null
            : this.productToEdit?.availability?.temporaryReason ?? 'OPERATIONAL_PAUSE',
          temporaryReasonDetail: this.form.available
            ? null
            : this.productToEdit?.availability?.temporaryReasonDetail ?? 'Producto pausado temporalmente.',
          weeklySchedule: this.buildWeeklySchedule()
        },
        active: this.productToEdit?.active ?? true,
        displayOrder: this.productToEdit?.displayOrder ?? null,
        featured: this.form.featured,
        tags: this.productToEdit?.tags ?? [],
        dietaryFlags: this.form.dietaryFlags,
        allergens: this.form.allergens
      };

      if (this.productToEdit) {
        this.updateProduct.emit({
          productId: this.productToEdit.id,
          request
        });

        return;
      }

      this.createProduct.emit(request);
    } catch {
      this.errorMessage = 'No se pudo guardar el producto. Revisa la imagen y el horario.';
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
    this.currentImageMetadata = null;

    this.clearImagePreviewObjectUrl();

    this.imagePreviewObjectUrl = URL.createObjectURL(file);
    this.imagePreviewUrl = this.imagePreviewObjectUrl;
  }

  removeSelectedImage(): void {
    this.clearImagePreviewObjectUrl();

    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    this.currentImageMetadata = null;
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

  toggleScheduleDay(dayOfWeek: DayOfWeekRequest): void {
    const day = this.scheduleForm.find(item => item.dayOfWeek === dayOfWeek);

    if (!day) {
      return;
    }

    day.enabled = !day.enabled;
  }

  isScheduleDayEnabled(dayOfWeek: DayOfWeekRequest): boolean {
    return this.scheduleForm.some(item => item.dayOfWeek === dayOfWeek && item.enabled);
  }

  private async resolveImageForSubmit(): Promise<IImageMetadataRequest | null> {
    if (this.selectedImageFile) {
      this.uploadingImage = true;

      try {
        const response = await firstValueFrom(
          this.imageUploadApiService.uploadProductImage(this.selectedImageFile)
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

    return this.currentImageMetadata;
  }

  private buildWeeklySchedule(): IDailyAvailabilityRequest[] {
    if (!this.form.useSpecificSchedule) {
      return [];
    }

    const enabledDays = this.scheduleForm.filter(day => day.enabled);

    if (enabledDays.length === 0) {
      throw new Error('At least one schedule day is required.');
    }

    return enabledDays.map(day => {
      if (!day.startTime || !day.endTime || day.startTime >= day.endTime) {
        throw new Error('Invalid schedule time range.');
      }

      return {
        dayOfWeek: day.dayOfWeek,
        enabled: true,
        timeRanges: [
          {
            startTime: day.startTime,
            endTime: day.endTime
          }
        ]
      };
    });
  }

  private loadProductToEdit(): void {
    this.resetForm();

    if (!this.productToEdit) {
      return;
    }

    this.form = {
      categoryId: this.productToEdit.categoryId,
      name: this.productToEdit.name,
      description: this.productToEdit.description ?? '',
      productType: this.productToEdit.productType,
      price: String(this.productToEdit.price),
      featured: this.productToEdit.featured,
      available: this.productToEdit.availability?.status !== 'TEMPORARILY_UNAVAILABLE',
      useSpecificSchedule: false,
      dietaryFlags: this.productToEdit.dietaryFlags ?? [],
      allergens: this.productToEdit.allergens ?? []
    };

    if (this.productToEdit.image) {
      this.currentImageMetadata = {
        url: this.productToEdit.image.url,
        objectKey: this.productToEdit.image.objectKey,
        provider: this.productToEdit.image.provider
      };

      this.imagePreviewUrl = this.productToEdit.image.url;
    }

    this.loadScheduleFromProduct();
  }

  private loadScheduleFromProduct(): void {
    this.scheduleForm = this.createEmptyScheduleForm();

    const weeklySchedule = this.productToEdit?.availability?.weeklySchedule ?? [];

    if (weeklySchedule.length === 0) {
      this.form.useSpecificSchedule = false;
      return;
    }

    this.form.useSpecificSchedule = true;

    for (const savedDay of weeklySchedule) {
      const day = this.scheduleForm.find(item => item.dayOfWeek === savedDay.dayOfWeek);

      if (!day) {
        continue;
      }

      const firstRange = savedDay.timeRanges?.[0];

      day.enabled = savedDay.enabled;
      day.startTime = firstRange?.startTime ?? '08:00';
      day.endTime = firstRange?.endTime ?? '12:00';
    }
  }

  private createEmptyScheduleForm(): ScheduleFormDay[] {
    return this.dayOptions.map(day => ({
      dayOfWeek: day.value,
      label: day.label,
      enabled: false,
      startTime: '08:00',
      endTime: '12:00'
    }));
  }

  private toggleValue(values: string[], value: string): string[] {
    return values.includes(value)
      ? values.filter(item => item !== value)
      : [...values, value];
  }

  private resetForm(): void {
    this.clearImagePreviewObjectUrl();

    this.form = {
      categoryId: '',
      name: '',
      description: '',
      productType: 'SIMPLE',
      price: '',
      featured: false,
      available: true,
      useSpecificSchedule: false,
      dietaryFlags: [],
      allergens: []
    };

    this.scheduleForm = this.createEmptyScheduleForm();
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    this.currentImageMetadata = null;
    this.errorMessage = '';
  }

  private clearImagePreviewObjectUrl(): void {
    if (this.imagePreviewObjectUrl) {
      URL.revokeObjectURL(this.imagePreviewObjectUrl);
      this.imagePreviewObjectUrl = null;
    }
  }
}