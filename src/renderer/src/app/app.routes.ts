import { Routes } from '@angular/router';

import { RegisterComponent } from './components/register/register.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { LoginComponent } from './components/login/login.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { OwnerCatalogDashboardComponent } from './features/catalog/pages/OwnerCatalogDashboardComponent';

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
  component: DashboardComponent,
  canActivate: [authGuard]
},
{
  path: 'owner/dashboard',
  component: OwnerCatalogDashboardComponent,
  canActivate: [authGuard]
},
  {
  path: 'catalog',
  component: OwnerCatalogDashboardComponent,
  canActivate: [authGuard]
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