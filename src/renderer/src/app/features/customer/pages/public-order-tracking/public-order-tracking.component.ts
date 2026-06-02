import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { PublicOrderTrackingResponse } from '../../models/order.models';
import { PublicOrderTrackingApiService } from '../../services/public-order-tracking-api.service';

const TRACKING_STEPS = [
  { status: 'Created', label: 'Pedido recibido' },
  { status: 'Accepted', label: 'Pedido aceptado' },
  { status: 'Preparing', label: 'En preparacion' },
  { status: 'Ready', label: 'Listo' },
  { status: 'Delivered', label: 'Entregado' }
];

const STATUS_LABELS: Record<string, string> = {
  Created: 'Pedido recibido',
  Accepted: 'Pedido aceptado',
  Preparing: 'En preparacion',
  Ready: 'Listo',
  Delivered: 'Entregado',
  Cancelled: 'Cancelado'
};

@Component({
  selector: 'app-public-order-tracking',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-order-tracking.component.html',
  styleUrl: './public-order-tracking.component.css'
})
export class PublicOrderTrackingComponent implements OnInit {
  public readonly progressSteps = TRACKING_STEPS;

  public order: PublicOrderTrackingResponse | null = null;
  public isLoading = true;
  public notFound = false;
  public errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly publicOrderTrackingApiService: PublicOrderTrackingApiService
  ) {}

  public ngOnInit(): void {
    const publicTrackingCode = this.route.snapshot.paramMap.get('publicTrackingCode');

    if (!publicTrackingCode) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }

    this.publicOrderTrackingApiService.getByPublicTrackingCode(publicTrackingCode).subscribe({
      next: order => {
        this.order = order;
        this.isLoading = false;
      },
      error: error => {
        this.isLoading = false;
        this.notFound = error instanceof HttpErrorResponse && error.status === 404;
        this.errorMessage = this.notFound
          ? ''
          : 'No pudimos cargar el seguimiento del pedido. Intenta de nuevo mas tarde.';
      }
    });
  }

  public get statusLabel(): string {
    return this.getStatusLabel(this.order?.status);
  }

  public getStatusLabel(status?: string | null): string {
    return status ? STATUS_LABELS[status] ?? status : 'Pedido';
  }

  public isStepActive(status: string): boolean {
    if (!this.order || this.order.status === 'Cancelled') {
      return false;
    }

    const currentIndex = this.progressSteps.findIndex(step => step.status === this.order?.status);
    const stepIndex = this.progressSteps.findIndex(step => step.status === status);

    return currentIndex >= stepIndex && stepIndex >= 0;
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  public formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  public getEstimatedReadyLabel(): string {
    if (!this.order?.estimatedReadyAt) {
      return '';
    }

    const readyTime = new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(this.order.estimatedReadyAt));

    return `Listo para recoger aproximadamente a las ${readyTime}.`;
  }
}
