import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type OrderStatus = 'received' | 'preparing' | 'ready' | 'completed';

interface MockOrder {
  id: string;
  customer: string;
  items: Array<{ name: string; quantity: number }>;
  total: number;
  status: OrderStatus;
  time: string;
}

@Component({
  selector: 'app-orders-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders-preview.component.html',
  styleUrl: './orders-preview.component.css'
})
export class OrdersPreviewComponent {
  selectedFilter: OrderStatus | 'all' = 'all';

  orders: MockOrder[] = [
    {
      id: 'ORD-001',
      customer: 'Juan Pérez',
      items: [
        { name: 'Classic Burger', quantity: 2 },
        { name: 'Papas fritas', quantity: 1 }
      ],
      total: 25.99,
      status: 'received',
      time: '12:30 PM'
    },
    {
      id: 'ORD-002',
      customer: 'María García',
      items: [
        { name: 'Double Cheeseburger', quantity: 1 },
        { name: 'Papas fritas', quantity: 2 }
      ],
      total: 19.97,
      status: 'preparing',
      time: '12:25 PM'
    },
    {
      id: 'ORD-003',
      customer: 'Carlos López',
      items: [
        { name: 'Classic Burger', quantity: 1 }
      ],
      total: 9.99,
      status: 'ready',
      time: '12:20 PM'
    }
  ];

  filters: Array<{ value: OrderStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'received', label: 'Recibidos' },
    { value: 'preparing', label: 'Preparando' },
    { value: 'ready', label: 'Listos' },
    { value: 'completed', label: 'Completados' }
  ];

  get filteredOrders(): MockOrder[] {
    if (this.selectedFilter === 'all') {
      return this.orders;
    }

    return this.orders.filter(order => order.status === this.selectedFilter);
  }

  setFilter(filter: OrderStatus | 'all'): void {
    this.selectedFilter = filter;
  }

  updateOrderStatus(orderId: string, newStatus: OrderStatus): void {
    this.orders = this.orders.map(order =>
      order.id === orderId
        ? { ...order, status: newStatus }
        : order
    );
  }

  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      received: 'Recibido',
      preparing: 'Preparando',
      ready: 'Listo',
      completed: 'Completado'
    };

    return labels[status];
  }
}