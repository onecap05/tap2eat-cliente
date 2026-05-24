export interface IRefreshTokenResponse {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  expiresIn?: number | null;
}
