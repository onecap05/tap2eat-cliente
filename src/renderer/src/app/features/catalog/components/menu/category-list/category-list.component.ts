import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ICategoryResponse } from '../../../models/category/ICategoryResponse';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css'
})
export class CategoryListComponent {
  @Input() categories: ICategoryResponse[] = [];
  @Output() newCategory = new EventEmitter<void>();

  requestNewCategory(): void {
    this.newCategory.emit();
  }
}