import { Routes } from '@angular/router';

import { RegisterComponent } from './components/register/register.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { LoginComponent } from './components/login/login.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';

import { customerGuard } from './guards/customer.guard';
import { ownerGuard } from './guards/owner.guard';

export const routes: Routes = [
  {
    path: 'orders/track/:publicTrackingCode',
    loadComponent: () => import('./features/customer/pages/public-order-tracking/public-order-tracking.component')
      .then(component => component.PublicOrderTrackingComponent)
  },
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
    canActivate: [customerGuard]
  },
  {
    path: 'customer/restaurants/:restaurantId',
    loadComponent: () => import('./features/customer/pages/restaurant-detail/customer-restaurant-detail.component')
      .then(component => component.CustomerRestaurantDetailComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'customer/favorites',
    loadComponent: () => import('./features/customer/pages/customer-favorites/customer-favorites.component')
      .then(component => component.CustomerFavoritesComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'customer/checkout',
    loadComponent: () => import('./features/customer/pages/checkout/customer-checkout.component')
      .then(component => component.CustomerCheckoutComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'customer/orders',
    loadComponent: () => import('./features/customer/pages/customer-orders/customer-orders.component')
      .then(component => component.CustomerOrdersComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'customer/profile',
    loadComponent: () => import('./features/customer/pages/customer-profile/customer-profile.component')
      .then(component => component.CustomerProfileComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'customer/payment-success/:orderId',
    loadComponent: () => import('./features/customer/pages/payment-success/payment-success.component')
      .then(component => component.PaymentSuccessComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'customer/orders/:orderId/confirmation',
    loadComponent: () => import('./features/customer/pages/order-confirmation/order-confirmation.component')
      .then(component => component.OrderConfirmationComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'customer/orders/:orderId',
    loadComponent: () => import('./features/customer/pages/customer-order-detail/customer-order-detail.component')
      .then(component => component.CustomerOrderDetailComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'owner/dashboard',
    loadComponent: () => import('./features/catalog/pages/owner-dashboard/owner-dashboard.component')
      .then(component => component.OwnerDashboardComponent),
    canActivate: [ownerGuard]
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
