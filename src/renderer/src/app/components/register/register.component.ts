import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { IRegisterRequest } from '../../models/IRegisterRequest';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  public request: IRegisterRequest = {
    email: '',
    password: '',
    role: 'CUSTOMER',
    firstName: '',
    lastName: '',
    phone: ''
  };

  public availableRoles = [
    { label: 'Cliente', value: 'CUSTOMER' },
    { label: 'Dueño restaurante', value: 'RESTAURANT_OWNER' }
  ];

  public errorMessage: string = '';
  public successMessage: string = '';
  public isSubmitting: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  public onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    const payload: IRegisterRequest = {
      ...this.request,
      firstName: this.request.firstName.trim(),
      lastName: this.request.lastName.trim(),
      phone: this.request.phone && this.request.phone.trim() !== ''
        ? this.request.phone.trim()
        : null
    };

    this.authService.registerAccount(payload).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isSubmitting = false;

        this.router.navigate(['/verify-email'], {
          queryParams: { email: this.request.email }
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message || 'No se pudo completar el registro.';
        console.error(error);
      }
    });
  }
}