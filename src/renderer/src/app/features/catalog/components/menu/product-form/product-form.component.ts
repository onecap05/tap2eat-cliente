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
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';

import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { ICreateProductRequest } from '../../../models/product/ICreateProductRequest';
import { IUpdateProductRequest } from '../../../models/product/IUpdateProductRequest';
import { IProductResponse } from '../../../models/product/IProductResponse';
import { IImageMetadataRequest } from '../../../models/commons/IImageMetadataRequest';
import {
  IModifierGroupRequest,
  SelectionTypeRequest
} from '../../../models/product/IModifierGroupRequest';
import { IModifierOptionRequest } from '../../../models/product/IModifierOptionRequest';
import {
  DayOfWeekRequest,
  IDailyAvailabilityRequest
} from '../../../models/commons/IAvailabilityConfigRequest';
import { ImageUploadApiService } from '../../../services/ImageUploadApiService';

type ProductTypeForm = 'SIMPLE' | 'CUSTOMIZABLE';

type ScheduleFormDay = {
  dayOfWeek: DayOfWeekRequest;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type SavedScheduleDay = {
  dayOfWeek: string;
  enabled: boolean;
  timeRanges?: { startTime: string; endTime: string }[];
};

type ModifierOptionForm = {
  id?: string | null;
  name: string;
  additionalPrice: string;
  active: boolean;
  displayOrder: number;
};

type ModifierGroupForm = {
  id?: string | null;
  name: string;
  selectionType: SelectionTypeRequest;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  active: boolean;
  displayOrder: number;
  expanded: boolean;
  options: ModifierOptionForm[];
};

const DEFAULT_SCHEDULE_START_TIME = '08:00';
const DEFAULT_SCHEDULE_END_TIME = '12:00';
const DEFAULT_MODIFIER_OPTION_PRICE = '0';
const DEFAULT_SINGLE_MAX_SELECTIONS = 1;
const DEFAULT_OPTIONAL_MIN_SELECTIONS = 0;
const DEFAULT_REQUIRED_MIN_SELECTIONS = 1;
const DEFAULT_TEMPORARY_REASON = 'OPERATIONAL_PAUSE';
const DEFAULT_TEMPORARY_REASON_DETAIL = 'Producto pausado temporalmente.';
const MAX_IMAGE_SIZE_IN_MB = 5;
const BYTES_PER_MB = 1024 * 1024;

const PRODUCT_FORM_MESSAGES = {
  requiredProductFields: 'Selecciona una categoría y escribe el nombre del producto.',
  invalidProductPrice: 'El precio debe ser un número válido mayor o igual a 0.',
  invalidImageFile: 'Selecciona un archivo de imagen válido.',
  invalidImageSize: `La imagen no debe superar ${MAX_IMAGE_SIZE_IN_MB} MB.`,
  saveProductFailed: 'No se pudo guardar el producto. Revisa la imagen, horario y modificadores.',
  requiredScheduleDay: 'Selecciona al menos un día para el horario específico.',
  invalidScheduleTimeRange: 'Revisa las horas del horario específico.',
  requiredModifierGroup: 'Agrega al menos un grupo de modificadores para el producto personalizable.',
  invalidModifierGroupName: 'Cada grupo de modificadores debe tener nombre.',
  requiredModifierOption: 'Cada grupo activo debe tener al menos una opción activa.',
  invalidModifierOptionName: 'Cada opción de modificador debe tener nombre.',
  invalidModifierOptionPrice: 'El precio adicional de cada opción debe ser mayor o igual a 0.',
  invalidModifierSelections: 'Revisa el mínimo y máximo de selecciones de los modificadores.'
};

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
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
    productType: 'SIMPLE' as ProductTypeForm,
    price: '',
    featured: false,
    available: true,
    useSpecificSchedule: false,
    dietaryFlags: [] as string[],
    allergens: [] as string[]
  };

  scheduleForm: ScheduleFormDay[] = this.createEmptyScheduleForm();
  modifierGroups: ModifierGroupForm[] = [];

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

  get isCustomizableProduct(): boolean {
    return this.form.productType === 'CUSTOMIZABLE';
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
      this.errorMessage = PRODUCT_FORM_MESSAGES.requiredProductFields;
      return;
    }

    const price = Number(this.form.price);

    if (Number.isNaN(price) || price < 0) {
      this.errorMessage = PRODUCT_FORM_MESSAGES.invalidProductPrice;
      return;
    }

    try {
      const image = await this.resolveImageForSubmit();

      const request: IUpdateProductRequest = {
        categoryId: this.form.categoryId,
        name: this.form.name.trim(),
        description: this.form.description.trim() || null,
        productType: this.form.productType,
        price,
        image,
        modifierGroups: this.buildModifierGroups(),
        availability: {
          status: this.form.available ? 'AVAILABLE' : 'TEMPORARILY_UNAVAILABLE',
          temporaryReason: this.form.available
            ? null
            : this.productToEdit?.availability?.temporaryReason ?? DEFAULT_TEMPORARY_REASON,
          temporaryReasonDetail: this.form.available
            ? null
            : this.productToEdit?.availability?.temporaryReasonDetail ?? DEFAULT_TEMPORARY_REASON_DETAIL,
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
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : PRODUCT_FORM_MESSAGES.saveProductFailed;
    }
  }

  onProductTypeChange(): void {
    if (!this.isCustomizableProduct) {
      this.modifierGroups = [];
      return;
    }

    if (this.modifierGroups.length === 0) {
      this.addModifierGroup();
    }
  }

  addModifierGroup(): void {
    this.modifierGroups = [
      this.createEmptyModifierGroup(1),
      ...this.modifierGroups
    ];

    this.renumberModifierGroups();
  }

  removeModifierGroup(index: number): void {
  const confirmed = window.confirm('¿Seguro que quieres quitar este grupo de modificadores?');

  if (!confirmed) {
    return;
  }

  this.modifierGroups = this.modifierGroups.filter((_, currentIndex) => currentIndex !== index);
  this.renumberModifierGroups();
}

  toggleModifierGroup(group: ModifierGroupForm): void {
    group.expanded = !group.expanded;
  }

  getModifierGroupTitle(group: ModifierGroupForm, index: number): string {
    return group.name.trim() || `Grupo ${index + 1}`;
  }

  getModifierGroupSummary(group: ModifierGroupForm): string {
    const selectionTypeLabel = group.selectionType === 'SINGLE'
      ? 'Selección única'
      : 'Selección múltiple';

    const requiredLabel = group.required ? 'Requerido' : 'Opcional';
    const activeOptionsCount = group.options.filter(option => option.active).length;

    return `${selectionTypeLabel} · ${requiredLabel} · ${activeOptionsCount} opciones activas`;
  }

  addModifierOption(groupIndex: number): void {
    const group = this.modifierGroups[groupIndex];

    if (!group) {
      return;
    }

    group.options = [
      this.createEmptyModifierOption(1),
      ...group.options
    ];

    this.renumberModifierOptions(group);
  }

  removeModifierOption(groupIndex: number, optionIndex: number): void {
  const confirmed = window.confirm('¿Seguro que quieres quitar esta opción?');

  if (!confirmed) {
    return;
  }

  const group = this.modifierGroups[groupIndex];

  if (!group) {
    return;
  }

  group.options = group.options.filter((_, currentIndex) => currentIndex !== optionIndex);
  this.renumberModifierOptions(group);
}

  dropModifierGroup(event: CdkDragDrop<ModifierGroupForm[]>): void {
    moveItemInArray(this.modifierGroups, event.previousIndex, event.currentIndex);
    this.renumberModifierGroups();
  }

  dropModifierOption(event: CdkDragDrop<ModifierOptionForm[]>, groupIndex: number): void {
    const group = this.modifierGroups[groupIndex];

    if (!group) {
      return;
    }

    moveItemInArray(group.options, event.previousIndex, event.currentIndex);
    this.renumberModifierOptions(group);
  }

  onModifierGroupSelectionTypeChange(group: ModifierGroupForm): void {
    this.applySelectionDefaults(group);
  }

  onModifierGroupRequiredChange(group: ModifierGroupForm): void {
    this.applySelectionDefaults(group);
  }

  isSingleSelection(group: ModifierGroupForm): boolean {
    return group.selectionType === 'SINGLE';
  }

  onImageSelected(event: Event): void {
    this.errorMessage = '';

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = PRODUCT_FORM_MESSAGES.invalidImageFile;
      input.value = '';
      return;
    }

    const maxSizeInBytes = MAX_IMAGE_SIZE_IN_MB * BYTES_PER_MB;

    if (file.size > maxSizeInBytes) {
      this.errorMessage = PRODUCT_FORM_MESSAGES.invalidImageSize;
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
      throw new Error(PRODUCT_FORM_MESSAGES.requiredScheduleDay);
    }

    return enabledDays.map(day => this.buildDailyAvailability(day));
  }

  private buildDailyAvailability(day: ScheduleFormDay): IDailyAvailabilityRequest {
    if (!day.startTime || !day.endTime || day.startTime >= day.endTime) {
      throw new Error(PRODUCT_FORM_MESSAGES.invalidScheduleTimeRange);
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
  }

  private buildModifierGroups(): IModifierGroupRequest[] {
    if (!this.isCustomizableProduct) {
      return [];
    }

    if (this.modifierGroups.length === 0) {
      throw new Error(PRODUCT_FORM_MESSAGES.requiredModifierGroup);
    }

    return this.modifierGroups.map((group, index) => this.buildModifierGroup(group, index));
  }

  private buildModifierGroup(group: ModifierGroupForm, index: number): IModifierGroupRequest {
    const normalizedGroup = this.normalizeModifierGroup(group);

    this.validateModifierGroup(normalizedGroup);

    return {
      id: normalizedGroup.id ?? null,
      name: normalizedGroup.name.trim(),
      selectionType: normalizedGroup.selectionType,
      minSelections: normalizedGroup.minSelections,
      maxSelections: normalizedGroup.maxSelections,
      required: normalizedGroup.required,
      active: normalizedGroup.active,
      displayOrder: index + 1,
      options: normalizedGroup.options.map((option, optionIndex) =>
        this.buildModifierOption(option, optionIndex)
      )
    };
  }

  private buildModifierOption(option: ModifierOptionForm, index: number): IModifierOptionRequest {
    const additionalPrice = Number(option.additionalPrice);

    if (!option.name.trim()) {
      throw new Error(PRODUCT_FORM_MESSAGES.invalidModifierOptionName);
    }

    if (Number.isNaN(additionalPrice) || additionalPrice < 0) {
      throw new Error(PRODUCT_FORM_MESSAGES.invalidModifierOptionPrice);
    }

    return {
      id: option.id ?? null,
      name: option.name.trim(),
      additionalPrice,
      active: option.active,
      displayOrder: index + 1
    };
  }

  private normalizeModifierGroup(group: ModifierGroupForm): ModifierGroupForm {
    const normalizedGroup = { ...group };

    this.applySelectionDefaults(normalizedGroup);

    return normalizedGroup;
  }

  private applySelectionDefaults(group: ModifierGroupForm): void {
    if (group.selectionType === 'SINGLE') {
      group.maxSelections = DEFAULT_SINGLE_MAX_SELECTIONS;
      group.minSelections = group.required
        ? DEFAULT_REQUIRED_MIN_SELECTIONS
        : DEFAULT_OPTIONAL_MIN_SELECTIONS;

      return;
    }

    if (group.required && group.minSelections < DEFAULT_REQUIRED_MIN_SELECTIONS) {
      group.minSelections = DEFAULT_REQUIRED_MIN_SELECTIONS;
    }

    if (group.maxSelections < group.minSelections) {
      group.maxSelections = group.minSelections;
    }
  }

  private validateModifierGroup(group: ModifierGroupForm): void {
    if (!group.name.trim()) {
      throw new Error(PRODUCT_FORM_MESSAGES.invalidModifierGroupName);
    }

    if (group.minSelections < 0 || group.maxSelections < group.minSelections) {
      throw new Error(PRODUCT_FORM_MESSAGES.invalidModifierSelections);
    }

    const activeOptions = group.options.filter(option => option.active);

    if (group.active && activeOptions.length === 0) {
      throw new Error(PRODUCT_FORM_MESSAGES.requiredModifierOption);
    }

    if (group.active && group.maxSelections > activeOptions.length) {
      throw new Error(PRODUCT_FORM_MESSAGES.invalidModifierSelections);
    }
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
    this.loadModifierGroupsFromProduct();
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
      this.loadScheduleDay(savedDay);
    }
  }

  private loadScheduleDay(savedDay: SavedScheduleDay): void {
    const day = this.scheduleForm.find(item => item.dayOfWeek === savedDay.dayOfWeek);

    if (!day) {
      return;
    }

    const firstRange = savedDay.timeRanges?.[0];

    day.enabled = savedDay.enabled;
    day.startTime = firstRange?.startTime ?? DEFAULT_SCHEDULE_START_TIME;
    day.endTime = firstRange?.endTime ?? DEFAULT_SCHEDULE_END_TIME;
  }

  private loadModifierGroupsFromProduct(): void {
    const groups = this.productToEdit?.modifierGroups ?? [];

    this.modifierGroups = groups.map((group, index) => ({
      id: group.id ?? null,
      name: group.name,
      selectionType: group.selectionType,
      required: group.required,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      active: group.active,
      displayOrder: group.displayOrder ?? index + 1,
      expanded: false,
      options: group.options.map((option, optionIndex) => ({
        id: option.id ?? null,
        name: option.name,
        additionalPrice: String(option.additionalPrice),
        active: option.active,
        displayOrder: option.displayOrder ?? optionIndex + 1
      }))
    }));
  }

  private createEmptyScheduleForm(): ScheduleFormDay[] {
    return this.dayOptions.map(day => ({
      dayOfWeek: day.value,
      label: day.label,
      enabled: false,
      startTime: DEFAULT_SCHEDULE_START_TIME,
      endTime: DEFAULT_SCHEDULE_END_TIME
    }));
  }

  private createEmptyModifierGroup(displayOrder: number): ModifierGroupForm {
    return {
      name: '',
      selectionType: 'SINGLE',
      required: true,
      minSelections: DEFAULT_REQUIRED_MIN_SELECTIONS,
      maxSelections: DEFAULT_SINGLE_MAX_SELECTIONS,
      active: true,
      displayOrder,
      expanded: true,
      options: [
        this.createEmptyModifierOption(1)
      ]
    };
  }

  private createEmptyModifierOption(displayOrder: number): ModifierOptionForm {
    return {
      name: '',
      additionalPrice: DEFAULT_MODIFIER_OPTION_PRICE,
      active: true,
      displayOrder
    };
  }

  private renumberModifierGroups(): void {
    this.modifierGroups = this.modifierGroups.map((group, index) => ({
      ...group,
      displayOrder: index + 1
    }));
  }

  private renumberModifierOptions(group: ModifierGroupForm): void {
    group.options = group.options.map((option, index) => ({
      ...option,
      displayOrder: index + 1
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
    this.modifierGroups = [];
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