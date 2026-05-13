import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

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

  getCategoryName(categoryId: string): string {
    return this.categories.find(category => category.id === categoryId)?.name || 'Sin categoría';
  }

  getProductImage(product: IProductResponse): string | null {
    return product.image?.url || null;
  }
}