import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  public email: string = '';
  public code: string = '';
  public newPassword: string = '';

  public errorMessage: string = '';
  public successMessage: string = '';
  public isSubmitting: boolean = false;

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
    this.isSubmitting = true;

    this.authService.resetPassword({
      email: this.email,
      code: this.code,
      newPassword: this.newPassword
    }).subscribe({
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
          error?.error?.message || 'No se pudo restablecer la contraseña.';
        console.error(error);
      }
    });
  }
}