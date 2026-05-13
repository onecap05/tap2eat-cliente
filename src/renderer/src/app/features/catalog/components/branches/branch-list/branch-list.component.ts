import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

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
}