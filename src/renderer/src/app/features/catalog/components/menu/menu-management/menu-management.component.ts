import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { IProductResponse } from '../../../models/product/IProductResponse';
import { ICreateCategoryRequest } from '../../../models/category/ICreateCategoryRequest';
import { ICreateProductRequest } from '../../../models/product/ICreateProductRequest';

import { ProductTableComponent } from '../product-table/product-table.component';
import { CategoryListComponent } from '../category-list/category-list.component';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { ProductFormComponent } from '../product-form/product-form.component';
import { OwnerModalComponent } from '../../shared/owner-modal/owner-modal.component';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    CommonModule,
    ProductTableComponent,
    CategoryListComponent,
    CategoryFormComponent,
    ProductFormComponent,
    OwnerModalComponent
  ],
  templateUrl: './menu-management.component.html',
  styleUrl: './menu-management.component.css'
})
export class MenuManagementComponent {
  @Input() categories: ICategoryResponse[] = [];
  @Input() products: IProductResponse[] = [];
  @Input() creatingCategory = false;
  @Input() creatingProduct = false;

  @Output() createCategory = new EventEmitter<Omit<ICreateCategoryRequest, 'restaurantId'>>();
  @Output() createProduct = new EventEmitter<Omit<ICreateProductRequest, 'restaurantId'>>();

  showCategoryForm = false;
  showProductForm = false;

  toggleCategoryForm(): void {
    this.showCategoryForm = !this.showCategoryForm;
  }

  toggleProductForm(): void {
    this.showProductForm = !this.showProductForm;
  }

  closeCategoryForm(): void {
    this.showCategoryForm = false;
  }

  closeProductForm(): void {
    this.showProductForm = false;
  }

  onCreateCategory(request: Omit<ICreateCategoryRequest, 'restaurantId'>): void {
    this.createCategory.emit(request);
    this.showCategoryForm = false;
  }

  onCreateProduct(request: Omit<ICreateProductRequest, 'restaurantId'>): void {
    this.createProduct.emit(request);
    
  }
}