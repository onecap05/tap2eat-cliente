export interface IRegisterRequest {
  email: string;
  password: string;
  role: 'CUSTOMER' | 'RESTAURANT_OWNER';
  firstName: string;
  lastName: string;
  phone?: string | null;
}