import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { IProductResponse } from '../../../models/product/IProductResponse';
import { ICreateCategoryRequest } from '../../../models/category/ICreateCategoryRequest';
import { ICreateProductRequest } from '../../../models/product/ICreateProductRequest';
import { IUpdateProductRequest } from '../../../models/product/IUpdateProductRequest';
import { IReorderProductsRequest } from '../../../models/product/IReorderProductsRequest';

import { ProductTableComponent } from '../product-table/product-table.component';
import { CategoryListComponent } from '../category-list/category-list.component';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { ProductFormComponent } from '../product-form/product-form.component';
import { OwnerModalComponent } from '../../shared/owner-modal/owner-modal.component';
import { IPauseProductRequest } from '../../../models/product/IPauseProductRequest';
import { TemporaryUnavailabilityReason } from '../../../models/commons/IAvailabilityConfigResponse';
import { isOutOfSchedule } from '../../../utils/availability-schedule.utils';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductTableComponent,
    CategoryListComponent,
    CategoryFormComponent,
    ProductFormComponent,
    OwnerModalComponent
  ],
  templateUrl: './menu-management.component.html',
  styleUrl: './menu-management.component.css'
})
export class MenuManagementComponent implements OnChanges {
  @Input() categories: ICategoryResponse[] = [];
  @Input() products: IProductResponse[] = [];
  @Input() creatingCategory = false;
  @Input() creatingProduct = false;
  @Input() updatingProduct = false;
  @Input() pausingProduct = false;
  @Input() savingProductOrder = false;
  @Input() productOperationVersion = 0;

  @Output() createCategory = new EventEmitter<Omit<ICreateCategoryRequest, 'restaurantId'>>();
  @Output() createProduct = new EventEmitter<Omit<ICreateProductRequest, 'restaurantId'>>();
  @Output() updateProduct = new EventEmitter<{ productId: string; request: IUpdateProductRequest }>();
  @Output() deactivateProduct = new EventEmitter<IProductResponse>();
  @Output() pauseProduct = new EventEmitter<{ productId: string; request: IPauseProductRequest }>();
  @Output() resumeProduct = new EventEmitter<IProductResponse>();
  @Output() deleteProduct = new EventEmitter<IProductResponse>();
  @Output() reorderProducts = new EventEmitter<Omit<IReorderProductsRequest, 'restaurantId'>>();

  showCategoryForm = false;
  showProductForm = false;
  selectedProductToEdit: IProductResponse | null = null;
  selectedProductToPause: IProductResponse | null = null;
  selectedCategoryId: string | null = null;

  pauseReasonOptions: { label: string; value: TemporaryUnavailabilityReason }[] = [
    { label: 'Agotado', value: 'OUT_OF_STOCK' },
    { label: 'Sin insumos', value: 'NO_SUPPLIES' },
    { label: 'Mantenimiento', value: 'MAINTENANCE' },
    { label: 'Fuera de temporada', value: 'SEASONAL' },
    { label: 'Pausa operativa', value: 'OPERATIONAL_PAUSE' }
  ];

  pauseForm: IPauseProductRequest = {
    temporaryReason: 'OUT_OF_STOCK',
    temporaryReasonDetail: ''
  };

  get orderedCategories(): ICategoryResponse[] {
    return [...this.categories].sort((firstCategory, secondCategory) =>
      this.compareByDisplayOrder(firstCategory.displayOrder, secondCategory.displayOrder)
    );
  }

  get selectedCategoryProducts(): IProductResponse[] {
    if (!this.selectedCategoryId) {
      return [];
    }

    return this.productsByCategory(this.selectedCategoryId);
  }

  get selectedCategoryName(): string {
    const category = this.categories.find(item => item.id === this.selectedCategoryId);
    return category?.name ?? 'Sin categoría seleccionada';
  }

  get selectedCategory(): ICategoryResponse | null {
    return this.categories.find(category => category.id === this.selectedCategoryId) ?? null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories'] || changes['products']) {
      this.ensureSelectedCategory();
    }

    if (changes['productOperationVersion'] && !changes['productOperationVersion'].firstChange) {
      this.closeProductForm();
      this.closePauseProductModal();
    }
  }

  selectCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
  }

  productsByCategory(categoryId: string): IProductResponse[] {
    return this.products
      .filter(product => product.categoryId === categoryId)
      .sort((firstProduct, secondProduct) =>
        this.compareByDisplayOrder(firstProduct.displayOrder, secondProduct.displayOrder)
      );
  }

  onReorderProducts(products: IProductResponse[]): void {
    if (!this.selectedCategoryId || products.length === 0) {
      return;
    }

    this.reorderProducts.emit({
      categoryId: this.selectedCategoryId,
      products: products.map((product, index) => ({
        productId: product.id,
        displayOrder: index + 1
      }))
    });
  }

  toggleCategoryForm(): void {
    this.showCategoryForm = !this.showCategoryForm;
  }

  openCreateProductForm(): void {
    this.selectedProductToEdit = null;
    this.showProductForm = true;
  }

  openEditProductForm(product: IProductResponse): void {
    this.selectedProductToEdit = product;
    this.showProductForm = true;
  }

  closeCategoryForm(): void {
    this.showCategoryForm = false;
  }

  closeProductForm(): void {
    this.showProductForm = false;
    this.selectedProductToEdit = null;
  }

  onCreateCategory(request: Omit<ICreateCategoryRequest, 'restaurantId'>): void {
    this.createCategory.emit(request);
    this.showCategoryForm = false;
  }

  onCreateProduct(request: Omit<ICreateProductRequest, 'restaurantId'>): void {
    this.createProduct.emit(request);
  }

  onUpdateProduct(event: { productId: string; request: IUpdateProductRequest }): void {
    this.updateProduct.emit(event);
  }

  onDeactivateProduct(product: IProductResponse): void {
    const confirmed = window.confirm(`¿Seguro que deseas desactivar "${product.name}"?`);

    if (!confirmed) {
      return;
    }

    this.deactivateProduct.emit(product);
  }

  openPauseProductModal(product: IProductResponse): void {
    this.selectedProductToPause = product;
    this.pauseForm = {
      temporaryReason: 'OUT_OF_STOCK',
      temporaryReasonDetail: ''
    };
  }

  closePauseProductModal(): void {
    this.selectedProductToPause = null;
    this.pauseForm = {
      temporaryReason: 'OUT_OF_STOCK',
      temporaryReasonDetail: ''
    };
  }

  submitPauseProduct(): void {
    if (!this.selectedProductToPause) {
      return;
    }

    this.pauseProduct.emit({
      productId: this.selectedProductToPause.id,
      request: {
        temporaryReason: this.pauseForm.temporaryReason,
        temporaryReasonDetail: this.pauseForm.temporaryReasonDetail?.trim() || null
      }
    });
  }

  onResumeProduct(product: IProductResponse): void {
    const confirmed = window.confirm(`¿Seguro que deseas reactivar "${product.name}"?`);

    if (!confirmed) {
      return;
    }

    this.resumeProduct.emit(product);
  }

  onDeleteProduct(product: IProductResponse): void {
    const confirmed = window.confirm(`¿Seguro que deseas eliminar "${product.name}" del catálogo?`);

    if (!confirmed) {
      return;
    }

    this.deleteProduct.emit(product);
  }

  getCategoryAvailabilityLabel(category: ICategoryResponse): string {
  if (!category.active) {
    return 'Eliminada';
  }

  if (category.availability?.status === 'TEMPORARILY_UNAVAILABLE') {
    return 'Pausada';
  }

  if (category.availability?.status === 'PERMANENTLY_UNAVAILABLE') {
    return 'No disponible';
  }

  if (this.isCategoryOutOfSchedule(category)) {
    return 'Fuera de horario';
  }

  return 'Disponible';
}

isCategoryOutOfSchedule(category: ICategoryResponse): boolean {
  return isOutOfSchedule(category);
}

isCategoryPaused(category: ICategoryResponse): boolean {
  return category.availability?.status === 'TEMPORARILY_UNAVAILABLE';
}

  private ensureSelectedCategory(): void {
    if (this.selectedCategoryId && this.categories.some(category => category.id === this.selectedCategoryId)) {
      return;
    }

    this.selectedCategoryId = this.orderedCategories[0]?.id ?? null;
  }

  private compareByDisplayOrder(
    firstDisplayOrder: number | null | undefined,
    secondDisplayOrder: number | null | undefined
  ): number {
    return this.normalizeDisplayOrder(firstDisplayOrder) - this.normalizeDisplayOrder(secondDisplayOrder);
  }

  private normalizeDisplayOrder(displayOrder: number | null | undefined): number {
    return displayOrder ?? 0;
  }
}