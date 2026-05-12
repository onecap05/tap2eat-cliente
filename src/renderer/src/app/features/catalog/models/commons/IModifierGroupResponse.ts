import { IModifierOptionResponse } from './IModifierOptionResponse';

export type SelectionType = 'SINGLE' | 'MULTIPLE';

export interface IModifierGroupResponse {
  id?: string | null;
  name: string;
  selectionType: SelectionType;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder?: number | null;
  active: boolean;
  options: IModifierOptionResponse[];
}