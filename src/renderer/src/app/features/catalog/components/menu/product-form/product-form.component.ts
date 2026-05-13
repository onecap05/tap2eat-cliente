import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { ICreateProductRequest } from '../../../models/product/ICreateProductRequest';

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

  form = {
    categoryId: '',
    name: '',
    description: '',
    productType: 'SIMPLE',
    price: '',
    imageUrl: '',
    imageObjectKey: '',
    displayOrder: '',
    featured: false,
    tags: '',
    dietaryFlags: '',
    allergens: ''
  };

  submit(): void {
    if (!this.form.categoryId || !this.form.name.trim()) {
      return;
    }

    const price = Number(this.form.price);
    const displayOrder = this.form.displayOrder ? Number(this.form.displayOrder) : 0;

    if (Number.isNaN(price) || price < 0) {
      return;
    }

    this.createProduct.emit({
      categoryId: this.form.categoryId,
      name: this.form.name.trim(),
      description: this.form.description.trim() || null,
      productType: this.form.productType as 'SIMPLE' | 'CUSTOMIZABLE',
      price,
      image: this.form.imageUrl.trim()
        ? {
            url: this.form.imageUrl.trim(),
            objectKey: this.form.imageObjectKey.trim() || 'products/default-product.jpg',
            provider: 'CLOUDINARY'
          }
        : null,
      modifierGroups: [],
      availability: {
        status: 'AVAILABLE',
        temporaryReason: null,
        temporaryReasonDetail: null,
        weeklySchedule: []
      },
      active: true,
      displayOrder: Number.isNaN(displayOrder) ? 0 : displayOrder,
      featured: this.form.featured,
      tags: this.parseCsv(this.form.tags),
      dietaryFlags: this.parseCsv(this.form.dietaryFlags),
      allergens: this.parseCsv(this.form.allergens)
    });

    this.resetForm();
  }

  private parseCsv(value: string): string[] {
    if (!value.trim()) {
      return [];
    }

    return value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  private resetForm(): void {
    this.form = {
      categoryId: '',
      name: '',
      description: '',
      productType: 'SIMPLE',
      price: '',
      imageUrl: '',
      imageObjectKey: '',
      displayOrder: '',
      featured: false,
      tags: '',
      dietaryFlags: '',
      allergens: ''
    };
  }
}