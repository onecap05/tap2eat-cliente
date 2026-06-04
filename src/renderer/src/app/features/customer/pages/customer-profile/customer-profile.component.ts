import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { IMeResponse } from '../../../../models/IMeResponse';
import { IUpdateProfileRequest } from '../../../../models/IUpdateProfileRequest';
import { AuthService } from '../../../../services/auth.service';
import { CustomerNotificationBellComponent } from '../../components/customer-notification-bell/customer-notification-bell.component';

const CUSTOMER_PROFILE_TEXT = {
  loading: 'Cargando perfil...',
  error: 'No pudimos cargar tu perfil. Intenta de nuevo.',
  updateError: 'No pudimos actualizar tu perfil. Intenta de nuevo.',
  updateSuccess: 'Perfil actualizado correctamente.',
  active: 'Activa',
  inactive: 'Inactiva',
  verified: 'Verificado',
  notVerified: 'Pendiente',
  notAvailable: 'No disponible'
};

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomerNotificationBellComponent],
  templateUrl: './customer-profile.component.html',
  styleUrl: './customer-profile.component.css'
})
export class CustomerProfileComponent implements OnInit {
  public readonly text = CUSTOMER_PROFILE_TEXT;
  public account: IMeResponse | null = null;
  public isLoading = true;
  public isSubmitting = false;
  public isEditing = false;
  public errorMessage = '';
  public successMessage = '';

  public form: IUpdateProfileRequest = {
    firstName: '',
    lastName: '',
    phone: ''
  };

  public originalForm: IUpdateProfileRequest = {
    firstName: '',
    lastName: '',
    phone: ''
  };

  constructor(
    private readonly authService: AuthService
  ) {}

  public ngOnInit(): void {
    this.loadProfile();
  }

  public get fullName(): string {
    const name = [this.account?.firstName, this.account?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return name || this.text.notAvailable;
  }

  public get accountStatusLabel(): string {
    return this.account?.isActive ? this.text.active : this.text.inactive;
  }

  public get emailVerifiedLabel(): string {
    return this.account?.emailVerified ? this.text.verified : this.text.notVerified;
  }

  public startEditing(): void {
    if (!this.account) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isEditing = true;
  }

  public cancelEditing(): void {
    this.form = {
      firstName: this.originalForm.firstName,
      lastName: this.originalForm.lastName,
      phone: this.originalForm.phone || ''
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.isEditing = false;
  }

  public saveProfile(): void {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    const payload: IUpdateProfileRequest = {
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      phone: this.form.phone && this.form.phone.trim() !== ''
        ? this.form.phone.trim()
        : null
    };

    this.authService.updateCurrentProfile(payload).subscribe({
      next: account => {
        this.account = account;

        this.form = {
          firstName: account.firstName || '',
          lastName: account.lastName || '',
          phone: account.phone || ''
        };

        this.originalForm = {
          firstName: account.firstName || '',
          lastName: account.lastName || '',
          phone: account.phone || ''
        };

        this.successMessage = this.text.updateSuccess;
        this.isSubmitting = false;
        this.isEditing = false;
      },
      error: () => {
        this.errorMessage = this.text.updateError;
        this.isSubmitting = false;
      }
    });
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.getCurrentAccount().subscribe({
      next: account => {
        this.account = account;

        this.form = {
          firstName: account.firstName || '',
          lastName: account.lastName || '',
          phone: account.phone || ''
        };

        this.originalForm = {
          firstName: account.firstName || '',
          lastName: account.lastName || '',
          phone: account.phone || ''
        };

        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = this.text.error;
        this.isLoading = false;
      }
    });
  }
}