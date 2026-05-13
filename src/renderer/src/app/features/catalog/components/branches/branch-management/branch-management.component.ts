import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { ICreateBranchRequest } from '../../../models/branch/ICreateBranchRequest';

import { BranchListComponent } from '../branch-list/branch-list.component';
import { BranchFormComponent } from '../branch-form/branch-form.component';

@Component({
  selector: 'app-branch-management',
  standalone: true,
  imports: [CommonModule, BranchListComponent, BranchFormComponent],
  templateUrl: './branch-management.component.html',
  styleUrl: './branch-management.component.css'
})
export class BranchManagementComponent {
  @Input() branches: IBranchResponse[] = [];
  @Input() creatingBranch = false;

  @Output() createBranch = new EventEmitter<Omit<ICreateBranchRequest, 'restaurantId'>>();

  showBranchForm = false;

  toggleBranchForm(): void {
    this.showBranchForm = !this.showBranchForm;
  }

  onCreateBranch(request: Omit<ICreateBranchRequest, 'restaurantId'>): void {
    this.createBranch.emit(request);
    this.showBranchForm = false;
  }
}