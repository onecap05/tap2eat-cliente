import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IRestaurantResponse } from '../../../models/restaurant/IRestaurantResponse';

@Component({
  selector: 'app-restaurant-summary-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurant-summary-card.component.html',
  styleUrl: './restaurant-summary-card.component.css'
})
export class RestaurantSummaryCardComponent {
  @Input({ required: true }) restaurant!: IRestaurantResponse;
}