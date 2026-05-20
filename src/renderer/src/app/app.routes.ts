import { Routes } from '@angular/router';

import { RegisterComponent } from './components/register/register.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { LoginComponent } from './components/login/login.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';

import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: 'customer/dashboard',
    redirectTo: 'customer/restaurants',
    pathMatch: 'full'
  },
  {
    path: 'customer/restaurants',
    loadComponent: () => import('./features/customer/pages/restaurant-list/customer-restaurant-list.component')
      .then(component => component.CustomerRestaurantListComponent)
  },
  {
    path: 'customer/restaurants/:restaurantId',
    loadComponent: () => import('./features/customer/pages/restaurant-detail/customer-restaurant-detail.component')
      .then(component => component.CustomerRestaurantDetailComponent)
  },
  {
    path: 'owner/dashboard',
    loadComponent: () => import('./features/catalog/pages/owner-dashboard/owner-dashboard.component')
      .then(component => component.OwnerDashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'catalog',
    redirectTo: 'owner/dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
