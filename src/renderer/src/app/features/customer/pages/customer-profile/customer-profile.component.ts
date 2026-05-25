import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IMeResponse } from '../../../../models/IMeResponse';
import { AuthService } from '../../../../services/auth.service';

const CUSTOMER_PROFILE_TEXT = {
  loading: 'Cargando perfil...',
  error: 'No pudimos cargar tu perfil. Intenta de nuevo.',
  active: 'Activa',
  inactive: 'Inactiva',
  verified: 'Verificado',
  notVerified: 'Pendiente',
  notAvailable: 'No disponible'
};

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './customer-profile.component.html',
  styleUrl: './customer-profile.component.css'
})
export class CustomerProfileComponent implements OnInit {
  public readonly text = CUSTOMER_PROFILE_TEXT;
  public account: IMeResponse | null = null;
  public isLoading = true;
  public errorMessage = '';

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

  private loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getCurrentAccount().subscribe({
      next: account => {
        this.account = account;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = this.text.error;
        this.isLoading = false;
      }
    });
  }
}
