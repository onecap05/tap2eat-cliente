import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ILoginRequest } from '../../models/ILoginRequest';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  public request: ILoginRequest = {
    email: '',
    password: ''
  };

  public errorMessage: string = '';
  public successMessage: string = '';
  public isSubmitting: boolean = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  public onSubmit(): void {
  this.errorMessage = '';
  this.successMessage = '';
  this.isSubmitting = true;

  this.authService.login(this.request).subscribe({
    next: (response) => {
  this.authService.saveSession(response);

  this.isSubmitting = false;

  const role = this.authService.getUserRole();

  console.log('User role:', role);

  if (role === 'RESTAURANT_OWNER') {
    this.router.navigateByUrl('/owner/dashboard');
    return;
  }

  if (role === 'CUSTOMER') {
    this.router.navigateByUrl('/customer/dashboard');
    return;
  }


  this.authService.logout();
  this.errorMessage = 'No se pudo determinar el tipo de usuario.';
},
    error: (error) => {
      this.isSubmitting = false;
      this.errorMessage = error?.error?.message || 'No se pudo iniciar sesión.';
      console.error(error);
    }
  });
}
}