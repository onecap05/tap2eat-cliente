import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { IProductResponse } from '../../../models/product/IProductResponse';
import { ICategoryResponse } from '../../../models/category/ICategoryResponse';

type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './product-table.component.html',
  styleUrl: './product-table.component.css'
})
export class ProductTableComponent implements OnInit, OnDestroy {
  @Input() products: IProductResponse[] = [];
  @Input() categories: ICategoryResponse[] = [];
  @Input() reordering = false;

  @Output() editProduct = new EventEmitter<IProductResponse>();
  @Output() pauseProduct = new EventEmitter<IProductResponse>();
  @Output() resumeProduct = new EventEmitter<IProductResponse>();
  @Output() deleteProduct = new EventEmitter<IProductResponse>();
  @Output() reorderProducts = new EventEmitter<IProductResponse[]>();

  private now = new Date();
  private intervalId: number | null = null;

  ngOnInit(): void {
    this.intervalId = window.setInterval(() => {
      this.now = new Date();
    }, 60_000);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
    }
  }

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

    if (this.isOutOfSchedule(product)) {
      return 'Fuera de horario';
    }

    return 'Disponible';
  }

  isPaused(product: IProductResponse): boolean {
    return product.availability?.status === 'TEMPORARILY_UNAVAILABLE';
  }

  isOutOfSchedule(product: IProductResponse): boolean {
    if (!product.active) {
      return false;
    }

    if (product.availability?.status !== 'AVAILABLE') {
      return false;
    }

    const weeklySchedule = product.availability?.weeklySchedule ?? [];

    if (weeklySchedule.length === 0) {
      return false;
    }

    const currentDay = this.getCurrentDayOfWeek();
    const currentTime = this.getCurrentTimeAsString();

    const todaySchedule = weeklySchedule.find(day => day.dayOfWeek === currentDay);

    if (!todaySchedule || !todaySchedule.enabled) {
      return true;
    }

    const timeRanges = todaySchedule.timeRanges ?? [];

    if (timeRanges.length === 0) {
      return true;
    }

    const isInsideAnyRange = timeRanges.some(range =>
      currentTime >= range.startTime && currentTime < range.endTime
    );

    return !isInsideAnyRange;
  }

  dropProduct(event: CdkDragDrop<IProductResponse[]>): void {
    if (this.reordering) {
      return;
    }

    const reorderedProducts = [...this.products];

    moveItemInArray(reorderedProducts, event.previousIndex, event.currentIndex);

    this.reorderProducts.emit(reorderedProducts);
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

  private getCurrentDayOfWeek(): DayOfWeek {
    const day = this.now.getDay();

    const days: DayOfWeek[] = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY'
    ];

    return days[day];
  }

  private getCurrentTimeAsString(): string {
    const hours = String(this.now.getHours()).padStart(2, '0');
    const minutes = String(this.now.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }
}