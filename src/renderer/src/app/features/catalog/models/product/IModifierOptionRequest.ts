export interface IModifierOptionRequest {
  id?: string | null;
  name: string;
  additionalPrice: number;
  active: boolean;
  displayOrder?: number | null;
}