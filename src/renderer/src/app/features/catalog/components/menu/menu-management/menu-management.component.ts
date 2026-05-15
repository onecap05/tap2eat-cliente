import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { IProductResponse } from '../../../models/product/IProductResponse';
import { ICreateCategoryRequest } from '../../../models/category/ICreateCategoryRequest';
import { ICreateProductRequest } from '../../../models/product/ICreateProductRequest';
import { IUpdateProductRequest } from '../../../models/product/IUpdateProductRequest';

import { ProductTableComponent } from '../product-table/product-table.component';
import { CategoryListComponent } from '../category-list/category-list.component';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { ProductFormComponent } from '../product-form/product-form.component';
import { OwnerModalComponent } from '../../shared/owner-modal/owner-modal.component';
import { IPauseProductRequest } from '../../../models/product/IPauseProductRequest';
import { TemporaryUnavailabilityReason } from '../../../models/commons/IAvailabilityConfigResponse';


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
  @Input() productOperationVersion = 0;

  @Output() createCategory = new EventEmitter<Omit<ICreateCategoryRequest, 'restaurantId'>>();
  @Output() createProduct = new EventEmitter<Omit<ICreateProductRequest, 'restaurantId'>>();
  @Output() updateProduct = new EventEmitter<{ productId: string; request: IUpdateProductRequest }>();
  @Output() deactivateProduct = new EventEmitter<IProductResponse>();
  @Output() pauseProduct = new EventEmitter<{ productId: string; request: IPauseProductRequest }>();
  @Output() resumeProduct = new EventEmitter<IProductResponse>();
  @Output() deleteProduct = new EventEmitter<IProductResponse>();

  showCategoryForm = false;
  showProductForm = false;
  selectedProductToEdit: IProductResponse | null = null;

  selectedProductToPause: IProductResponse | null = null;

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

  ngOnChanges(changes: SimpleChanges): void {
  if (changes['productOperationVersion'] && !changes['productOperationVersion'].firstChange) {
    this.closeProductForm();
    this.closePauseProductModal();
  }
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
}