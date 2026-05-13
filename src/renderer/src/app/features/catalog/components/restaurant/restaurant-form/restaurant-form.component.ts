import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface RestaurantFormValue {
  name: string;
  description: string;
  logoUrl: string;
  logoObjectKey: string;
  logoProvider: string;
}

@Component({
  selector: 'app-restaurant-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurant-form.component.html',
  styleUrl: './restaurant-form.component.css'
})
export class RestaurantFormComponent {
  @Input() saving = false;
  @Output() createRestaurant = new EventEmitter<RestaurantFormValue>();

  form: RestaurantFormValue = {
    name: '',
    description: '',
    logoUrl: '',
    logoObjectKey: '',
    logoProvider: 'CLOUDINARY'
  };

  submit(): void {
    if (!this.form.name.trim()) {
      return;
    }

    this.createRestaurant.emit({
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      logoUrl: this.form.logoUrl.trim(),
      logoObjectKey: this.form.logoObjectKey.trim(),
      logoProvider: this.form.logoProvider
    });
  }
}