import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ICreateBranchRequest } from '../../../models/branch/ICreateBranchRequest';

@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-form.component.html',
  styleUrl: './branch-form.component.css'
})
export class BranchFormComponent {
  @Input() saving = false;

  @Output() createBranch = new EventEmitter<Omit<ICreateBranchRequest, 'restaurantId'>>();

  errorMessage = '';

  form = {
    name: '',
    phoneNumber: '',
    formattedAddress: '',
    latitude: '',
    longitude: '',
    googlePlaceId: '',
    isMainBranch: false
  };

  submit(): void {
    this.errorMessage = '';

    if (!this.form.name.trim()) {
      this.errorMessage = 'El nombre de la sucursal es obligatorio.';
      return;
    }

    if (!this.form.formattedAddress.trim()) {
      this.errorMessage = 'La dirección es obligatoria.';
      return;
    }

    const latitude = Number(this.form.latitude);
    const longitude = Number(this.form.longitude);

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      this.errorMessage = 'La latitud debe estar entre -90 y 90.';
      return;
    }

    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      this.errorMessage = 'La longitud debe estar entre -180 y 180.';
      return;
    }

    this.createBranch.emit({
      name: this.form.name.trim(),
      phoneNumber: this.form.phoneNumber.trim() || null,
      formattedAddress: this.form.formattedAddress.trim(),
      latitude,
      longitude,
      googlePlaceId: this.form.googlePlaceId.trim() || null,
      isMainBranch: this.form.isMainBranch,
      availability: {
        status: 'AVAILABLE',
        temporaryReason: null,
        temporaryReasonDetail: null,
        weeklySchedule: []
      }
    });

    this.resetForm();
  }

  private resetForm(): void {
    this.form = {
      name: '',
      phoneNumber: '',
      formattedAddress: '',
      latitude: '',
      longitude: '',
      googlePlaceId: '',
      isMainBranch: false
    };
  }
}