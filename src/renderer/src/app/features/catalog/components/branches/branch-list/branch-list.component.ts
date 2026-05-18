import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';

@Component({
  selector: 'app-branch-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './branch-list.component.html',
  styleUrl: './branch-list.component.css'
})
export class BranchListComponent {
  @Input() branches: IBranchResponse[] = [];

  @Output() editBranch = new EventEmitter<IBranchResponse>();
  @Output() deleteBranch = new EventEmitter<IBranchResponse>();

  onEditBranch(branch: IBranchResponse): void {
    this.editBranch.emit(branch);
  }

  onDeleteBranch(branch: IBranchResponse): void {
    this.deleteBranch.emit(branch);
  }
}