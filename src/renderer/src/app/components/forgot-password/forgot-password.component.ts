import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  public email: string = '';
  public errorMessage: string = '';
  public successMessage: string = '';
  public isSubmitting: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  public onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isSubmitting = false;

        this.router.navigate(['/reset-password'], {
          queryParams: { email: this.email }
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message || 'No se pudo solicitar la recuperación.';
        console.error(error);
      }
    });
  }
}