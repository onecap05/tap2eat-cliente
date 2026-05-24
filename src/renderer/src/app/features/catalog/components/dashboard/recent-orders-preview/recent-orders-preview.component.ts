import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface RecentOrderPreview {
  id: string;
  customer: string;
  items: number;
  total: number;
  status: string;
  time: string;
}

@Component({
  selector: 'app-recent-orders-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-orders-preview.component.html',
  styleUrl: './recent-orders-preview.component.css'
})
export class RecentOrdersPreviewComponent {
  @Input() orders: RecentOrderPreview[] = [];
}