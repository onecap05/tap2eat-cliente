import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-recent-orders-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-orders-preview.component.html',
  styleUrl: './recent-orders-preview.component.css'
})
export class RecentOrdersPreviewComponent {
  orders = [
    { id: 'ORD-001', customer: 'Juan Pérez', items: 2, total: 25.99, status: 'Preparando', time: '10 min' },
    { id: 'ORD-002', customer: 'María García', items: 3, total: 32.50, status: 'Listo', time: '5 min' },
    { id: 'ORD-003', customer: 'Carlos López', items: 1, total: 12.99, status: 'Recibido', time: '15 min' }
  ];
}