import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-owner-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-modal.component.html',
  styleUrl: './owner-modal.component.css'
})
export class OwnerModalComponent {
  @Input() title = '';
  @Input() subtitle = '';

  @Output() closeModal = new EventEmitter<void>();

  close(): void {
    this.closeModal.emit();
  }
}