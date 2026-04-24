import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit {
  public code: string = '';
  public email: string = '';

  public errorMessage: string = '';
  public successMessage: string = '';
  public resendMessage: string = '';
  public isSubmitting: boolean = false;
  public isResending: boolean = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  public ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });
  }

  public onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.resendMessage = '';
    this.isSubmitting = true;

    this.authService.verifyEmail({ code: this.code }).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isSubmitting = false;

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1200);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message || 'No se pudo verificar el correo.';
        console.error(error);
      }
    });
  }

  public onResendCode(): void {
    if (!this.email) {
      this.errorMessage = 'No se encontró el correo para reenviar el código.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.resendMessage = '';
    this.isResending = true;

    this.authService.resendVerificationCode({ email: this.email }).subscribe({
      next: (response) => {
        this.resendMessage = response.message;
        this.isResending = false;
      },
      error: (error) => {
        this.isResending = false;
        this.errorMessage =
          error?.error?.message || 'No se pudo reenviar el código.';
        console.error(error);
      }
    });
  }
}