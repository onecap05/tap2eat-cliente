export interface IMeResponse {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}
