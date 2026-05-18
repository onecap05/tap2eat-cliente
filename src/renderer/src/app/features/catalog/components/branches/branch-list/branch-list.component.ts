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

  getBranchOpenState(branch: IBranchResponse): 'Abierta' | 'Cerrada' {
    if (branch.availability?.status && branch.availability.status !== 'AVAILABLE') {
      return 'Cerrada';
    }

    const weeklySchedule = branch.availability?.weeklySchedule;

    if (!weeklySchedule || weeklySchedule.length === 0) {
      return 'Abierta';
    }

    const currentDay = this.getCurrentDayOfWeek();
    const todaySchedule = weeklySchedule.find(day => day.dayOfWeek === currentDay);

    if (!todaySchedule || !todaySchedule.enabled || !todaySchedule.timeRanges?.length) {
      return 'Cerrada';
    }

    const currentTime = this.getCurrentTime();

    const isOpen = todaySchedule.timeRanges.some(timeRange =>
      currentTime >= timeRange.startTime && currentTime <= timeRange.endTime
    );

    return isOpen ? 'Abierta' : 'Cerrada';
  }

  isBranchOpen(branch: IBranchResponse): boolean {
    return this.getBranchOpenState(branch) === 'Abierta';
  }

  private getCurrentDayOfWeek(): string {
    const day = new Date().getDay();

    const days: Record<number, string> = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY'
    };

    return days[day];
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }
}