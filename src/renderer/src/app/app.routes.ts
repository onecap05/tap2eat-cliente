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
      .then(component => component.CustomerRestaurantListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/restaurants/:restaurantId',
    loadComponent: () => import('./features/customer/pages/restaurant-detail/customer-restaurant-detail.component')
      .then(component => component.CustomerRestaurantDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/checkout',
    loadComponent: () => import('./features/customer/pages/checkout/customer-checkout.component')
      .then(component => component.CustomerCheckoutComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/orders',
    loadComponent: () => import('./features/customer/pages/customer-orders/customer-orders.component')
      .then(component => component.CustomerOrdersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/payment-success/:orderId',
    loadComponent: () => import('./features/customer/pages/payment-success/payment-success.component')
      .then(component => component.PaymentSuccessComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/orders/:orderId/confirmation',
    loadComponent: () => import('./features/customer/pages/order-confirmation/order-confirmation.component')
      .then(component => component.OrderConfirmationComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/orders/:orderId',
    loadComponent: () => import('./features/customer/pages/customer-order-detail/customer-order-detail.component')
      .then(component => component.CustomerOrderDetailComponent),
    canActivate: [authGuard]
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