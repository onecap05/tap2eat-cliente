import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type OwnerPanelSection = 'dashboard' | 'reports' | 'orders' | 'menu' | 'branches';

@Component({
  selector: 'app-owner-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-sidebar.component.html',
  styleUrl: './owner-sidebar.component.css'
})
export class OwnerSidebarComponent {
  @Input({ required: true }) activeSection!: OwnerPanelSection;
  @Output() sectionChange = new EventEmitter<OwnerPanelSection>();

  items: Array<{ label: string; value: OwnerPanelSection; icon: string }> = [
    { label: 'Dashboard', value: 'dashboard', icon: '📊' },
    { label: 'Reportes', value: 'reports', icon: '📈' },
    { label: 'Pedidos', value: 'orders', icon: '🧾' },
    { label: 'Menú', value: 'menu', icon: '🍽️' },
    { label: 'Sucursales', value: 'branches', icon: '📍' }
  ];

  selectSection(section: OwnerPanelSection): void {
    this.sectionChange.emit(section);
  }
}
