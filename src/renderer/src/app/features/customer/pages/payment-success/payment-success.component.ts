import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.component.html',
  styleUrl: './payment-success.component.css'
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {
  public orderId = '';
  private navigationSubscription?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  public ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId') ?? '';

    this.navigationSubscription = timer(2400).subscribe(() => {
      void this.router.navigate(['/customer/orders', this.orderId, 'confirmation']);
    });
  }

  public ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
  }
}
