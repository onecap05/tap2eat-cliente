import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ICreateCategoryRequest } from '../../../models/category/ICreateCategoryRequest';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.css'
})
export class CategoryFormComponent {
  @Input() saving = false;
  @Output() createCategory = new EventEmitter<Omit<ICreateCategoryRequest, 'restaurantId'>>();

  form = {
    name: '',
    description: '',
    displayOrder: ''
  };

  submit(): void {
    if (!this.form.name.trim()) {
      return;
    }

    const displayOrder = this.form.displayOrder ? Number(this.form.displayOrder) : 0;

    this.createCategory.emit({
      name: this.form.name.trim(),
      description: this.form.description.trim() || null,
      displayOrder: Number.isNaN(displayOrder) ? 0 : displayOrder,
      image: null,
      availability: {
        status: 'AVAILABLE',
        temporaryReason: null,
        temporaryReasonDetail: null,
        weeklySchedule: []
      }
    });

    this.form = {
      name: '',
      description: '',
      displayOrder: ''
    };
  }
}