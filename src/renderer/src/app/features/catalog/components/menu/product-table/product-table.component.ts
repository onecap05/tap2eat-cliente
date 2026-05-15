import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IProductResponse } from '../../../models/product/IProductResponse';
import { ICategoryResponse } from '../../../models/category/ICategoryResponse';

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-table.component.html',
  styleUrl: './product-table.component.css'
})
export class ProductTableComponent {
  @Input() products: IProductResponse[] = [];
  @Input() categories: ICategoryResponse[] = [];

  @Output() editProduct = new EventEmitter<IProductResponse>();
  @Output() pauseProduct = new EventEmitter<IProductResponse>();
  @Output() resumeProduct = new EventEmitter<IProductResponse>();
  @Output() deleteProduct = new EventEmitter<IProductResponse>();

  getCategoryName(categoryId: string): string {
    return this.categories.find(category => category.id === categoryId)?.name || 'Sin categoría';
  }

  getProductImage(product: IProductResponse): string | null {
    return product.image?.url || null;
  }

  getAvailabilityLabel(product: IProductResponse): string {
    if (!product.active) {
      return 'Eliminado';
    }

    if (product.availability?.status === 'TEMPORARILY_UNAVAILABLE') {
      return 'Pausado';
    }

    if (product.availability?.status === 'PERMANENTLY_UNAVAILABLE') {
      return 'No disponible';
    }

    return 'Disponible';
  }

  isPaused(product: IProductResponse): boolean {
    return product.availability?.status === 'TEMPORARILY_UNAVAILABLE';
  }

  onEditProduct(product: IProductResponse): void {
    this.editProduct.emit(product);
  }

  onPauseProduct(product: IProductResponse): void {
    this.pauseProduct.emit(product);
  }

  onResumeProduct(product: IProductResponse): void {
    this.resumeProduct.emit(product);
  }

  onDeleteProduct(product: IProductResponse): void {
    this.deleteProduct.emit(product);
  }
}