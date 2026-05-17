import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ICreateCategoryRequest } from '../../../models/category/ICreateCategoryRequest';
import { IUpdateCategoryRequest } from '../../../models/category/IUpdateCategoryRequest';
import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import {
  DayOfWeekRequest,
  IDailyAvailabilityRequest
} from '../../../models/commons/IAvailabilityConfigRequest';

type ScheduleFormDay = {
  dayOfWeek: DayOfWeekRequest;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type SavedScheduleDay = {
  dayOfWeek: string;
  enabled: boolean;
  timeRanges?: { startTime: string; endTime: string }[];
};

const DEFAULT_SCHEDULE_START_TIME = '08:00';
const DEFAULT_SCHEDULE_END_TIME = '12:00';

const CATEGORY_FORM_MESSAGES = {
  requiredName: 'Escribe el nombre de la categoría.',
  invalidDisplayOrder: 'El orden debe ser un número mayor o igual a 0.',
  requiredScheduleDay: 'Selecciona al menos un día para el horario específico.',
  invalidScheduleTimeRange: 'Revisa las horas del horario específico.'
};

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.css'
})
export class CategoryFormComponent implements OnChanges {
  @Input() saving = false;
  @Input() categoryToEdit: ICategoryResponse | null = null;

  @Output() createCategory = new EventEmitter<Omit<ICreateCategoryRequest, 'restaurantId'>>();
  @Output() updateCategory = new EventEmitter<{ categoryId: string; request: IUpdateCategoryRequest }>();

  readonly dayOptions: { label: string; value: DayOfWeekRequest }[] = [
    { label: 'Lunes', value: 'MONDAY' },
    { label: 'Martes', value: 'TUESDAY' },
    { label: 'Miércoles', value: 'WEDNESDAY' },
    { label: 'Jueves', value: 'THURSDAY' },
    { label: 'Viernes', value: 'FRIDAY' },
    { label: 'Sábado', value: 'SATURDAY' },
    { label: 'Domingo', value: 'SUNDAY' }
  ];

  form = {
    name: '',
    description: '',
    displayOrder: '',
    useSpecificSchedule: false
  };

  scheduleForm: ScheduleFormDay[] = this.createEmptyScheduleForm();
  errorMessage = '';

  get isEditMode(): boolean {
    return this.categoryToEdit !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryToEdit']) {
      this.loadCategoryToEdit();
    }
  }

  submit(): void {
    this.errorMessage = '';

    if (!this.form.name.trim()) {
      this.errorMessage = CATEGORY_FORM_MESSAGES.requiredName;
      return;
    }

    const displayOrder = this.resolveDisplayOrder();

    if (displayOrder === null) {
      this.errorMessage = CATEGORY_FORM_MESSAGES.invalidDisplayOrder;
      return;
    }

    try {
      const request: IUpdateCategoryRequest = {
        name: this.form.name.trim(),
        description: this.form.description.trim() || null,
        displayOrder,
        image: this.categoryToEdit?.image
          ? {
              url: this.categoryToEdit.image.url,
              objectKey: this.categoryToEdit.image.objectKey,
              provider: this.categoryToEdit.image.provider
            }
          : null,
        availability: {
          status: this.categoryToEdit?.availability?.status ?? 'AVAILABLE',
          temporaryReason: this.categoryToEdit?.availability?.temporaryReason ?? null,
          temporaryReasonDetail: this.categoryToEdit?.availability?.temporaryReasonDetail ?? null,
          weeklySchedule: this.buildWeeklySchedule()
        }
      };

      if (this.categoryToEdit) {
        this.updateCategory.emit({
          categoryId: this.categoryToEdit.id,
          request
        });

        return;
      }

      this.createCategory.emit(request);
      this.resetForm();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : CATEGORY_FORM_MESSAGES.invalidScheduleTimeRange;
    }
  }

  private resolveDisplayOrder(): number | null {
    if (!this.form.displayOrder) {
      return 0;
    }

    const displayOrder = Number(this.form.displayOrder);

    if (Number.isNaN(displayOrder) || displayOrder < 0) {
      return null;
    }

    return displayOrder;
  }

  private buildWeeklySchedule(): IDailyAvailabilityRequest[] {
    if (!this.form.useSpecificSchedule) {
      return [];
    }

    const enabledDays = this.scheduleForm.filter(day => day.enabled);

    if (enabledDays.length === 0) {
      throw new Error(CATEGORY_FORM_MESSAGES.requiredScheduleDay);
    }

    return enabledDays.map(day => this.buildDailyAvailability(day));
  }

  private buildDailyAvailability(day: ScheduleFormDay): IDailyAvailabilityRequest {
    if (!day.startTime || !day.endTime || day.startTime >= day.endTime) {
      throw new Error(CATEGORY_FORM_MESSAGES.invalidScheduleTimeRange);
    }

    return {
      dayOfWeek: day.dayOfWeek,
      enabled: true,
      timeRanges: [
        {
          startTime: day.startTime,
          endTime: day.endTime
        }
      ]
    };
  }

  private loadCategoryToEdit(): void {
    this.resetForm();

    if (!this.categoryToEdit) {
      return;
    }

    this.form = {
      name: this.categoryToEdit.name,
      description: this.categoryToEdit.description ?? '',
      displayOrder: String(this.categoryToEdit.displayOrder ?? ''),
      useSpecificSchedule: false
    };

    this.loadScheduleFromCategory();
  }

  private loadScheduleFromCategory(): void {
    this.scheduleForm = this.createEmptyScheduleForm();

    const weeklySchedule = this.categoryToEdit?.availability?.weeklySchedule ?? [];

    if (weeklySchedule.length === 0) {
      this.form.useSpecificSchedule = false;
      return;
    }

    this.form.useSpecificSchedule = true;

    for (const savedDay of weeklySchedule) {
      this.loadScheduleDay(savedDay);
    }
  }

  private loadScheduleDay(savedDay: SavedScheduleDay): void {
    const day = this.scheduleForm.find(item => item.dayOfWeek === savedDay.dayOfWeek);

    if (!day) {
      return;
    }

    const firstRange = savedDay.timeRanges?.[0];

    day.enabled = savedDay.enabled;
    day.startTime = firstRange?.startTime ?? DEFAULT_SCHEDULE_START_TIME;
    day.endTime = firstRange?.endTime ?? DEFAULT_SCHEDULE_END_TIME;
  }

  private createEmptyScheduleForm(): ScheduleFormDay[] {
    return this.dayOptions.map(day => ({
      dayOfWeek: day.value,
      label: day.label,
      enabled: false,
      startTime: DEFAULT_SCHEDULE_START_TIME,
      endTime: DEFAULT_SCHEDULE_END_TIME
    }));
  }

  private resetForm(): void {
    this.form = {
      name: '',
      description: '',
      displayOrder: '',
      useSpecificSchedule: false
    };

    this.scheduleForm = this.createEmptyScheduleForm();
    this.errorMessage = '';
  }
}