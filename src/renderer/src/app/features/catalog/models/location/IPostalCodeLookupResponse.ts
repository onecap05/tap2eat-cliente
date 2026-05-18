export interface IPostalCodeLookupResponse {
  postalCode: string;
  city: string;
  municipality: string;
  state: string;
  country: string;
  neighborhoods: string[];
}