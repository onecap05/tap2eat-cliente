import { IModifierOptionRequest } from './IModifierOptionRequest';

export type SelectionTypeRequest = 'SINGLE' | 'MULTIPLE';

export interface IModifierGroupRequest {
  id?: string | null;
  name: string;
  selectionType: SelectionTypeRequest;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  active: boolean;
  displayOrder?: number | null;
  options: IModifierOptionRequest[];
}