import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { ICreateBranchRequest } from '../../../models/branch/ICreateBranchRequest';
import { IUpdateBranchRequest } from '../../../models/branch/IUpdateBranchRequest';

import { BranchListComponent } from '../branch-list/branch-list.component';
import { BranchFormComponent } from '../branch-form/branch-form.component';
import { OwnerModalComponent } from '../../shared/owner-modal/owner-modal.component';

@Component({
  selector: 'app-branch-management',
  standalone: true,
  imports: [
    CommonModule,
    BranchListComponent,
    BranchFormComponent,
    OwnerModalComponent
  ],
  templateUrl: './branch-management.component.html',
  styleUrl: './branch-management.component.css'
})
export class BranchManagementComponent {
  @Input() branches: IBranchResponse[] = [];
  @Input() creatingBranch = false;
  @Input() updatingBranch = false;

  @Output() createBranch = new EventEmitter<Omit<ICreateBranchRequest, 'restaurantId'>>();
  @Output() updateBranch = new EventEmitter<{
    branchId: string;
    request: IUpdateBranchRequest;
  }>();

  showBranchForm = false;
  selectedBranch: IBranchResponse | null = null;

  get isEditing(): boolean {
    return !!this.selectedBranch;
  }

  get modalTitle(): string {
    return this.isEditing ? 'Editar sucursal' : 'Nueva sucursal';
  }

  get modalSubtitle(): string {
    return this.isEditing
      ? 'Actualiza la información y ubicación de la sucursal.'
      : 'Agrega una ubicación donde tu restaurante atiende pedidos.';
  }

  openCreateBranchForm(): void {
    this.selectedBranch = null;
    this.showBranchForm = true;
  }

  openEditBranchForm(branch: IBranchResponse): void {
    this.selectedBranch = branch;
    this.showBranchForm = true;
  }

  closeBranchForm(): void {
    this.showBranchForm = false;
    this.selectedBranch = null;
  }

  onCreateBranch(request: Omit<ICreateBranchRequest, 'restaurantId'>): void {
    this.createBranch.emit(request);
    this.showBranchForm = false;
  }

  onUpdateBranch(request: IUpdateBranchRequest): void {
    if (!this.selectedBranch) {
      return;
    }

    this.updateBranch.emit({
      branchId: this.selectedBranch.id,
      request
    });

    this.showBranchForm = false;
    this.selectedBranch = null;
  }
}