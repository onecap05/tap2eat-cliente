import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IRestaurantResponse } from '../../../models/restaurant/IRestaurantResponse';

const RESTAURANT_SUMMARY_CARD_LABELS = {
  restaurant: 'Restaurante',
  active: 'Activo',
  deleted: 'Eliminado',
  noDescription: 'Sin descripción registrada.',
  logoAlt: 'Logo del restaurante',
  edit: 'Editar',
  delete: 'Eliminar',
  restore: 'Restaurar'
};

@Component({
  selector: 'app-restaurant-summary-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurant-summary-card.component.html',
  styleUrl: './restaurant-summary-card.component.css'
})
export class RestaurantSummaryCardComponent {
  @Input({ required: true }) restaurant!: IRestaurantResponse;

  @Output() editRestaurant = new EventEmitter<void>();
  @Output() deleteRestaurant = new EventEmitter<void>();
  @Output() restoreRestaurant = new EventEmitter<void>();

  readonly labels = RESTAURANT_SUMMARY_CARD_LABELS;
}