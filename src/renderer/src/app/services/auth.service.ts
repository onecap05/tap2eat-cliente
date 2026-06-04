import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

import { IRegisterRequest } from '../models/IRegisterRequest';
import { IRegisterResponse } from '../models/IRegisterResponse';
import { IVerifyEmailRequest } from '../models/IVerifyEmailRequest';
import { IVerifyEmailResponse } from '../models/IVerifyEmailResponse';
import { IResendVerificationCodeRequest } from '../models/IResendVerificationCodeRequest';
import { IResendVerificationCodeResponse } from '../models/IResendVerificationCodeResponse';
import { ILoginRequest } from '../models/ILoginRequest';
import { ILoginResponse } from '../models/ILoginResponse';
import { IMeResponse } from '../models/IMeResponse';
import { IRefreshTokenRequest } from '../models/IRefreshTokenRequest';
import { IRefreshTokenResponse } from '../models/IRefreshTokenResponse';
import { IForgotPasswordRequest } from '../models/IForgotPasswordRequest';
import { IForgotPasswordResponse } from '../models/IForgotPasswordResponse';
import { IResetPasswordRequest } from '../models/IResetPasswordRequest';
import { IResetPasswordResponse } from '../models/IResetPasswordResponse';
import { TokenStorageService } from './token-storage.service';
import { IUpdateProfileRequest } from '../models/IUpdateProfileRequest';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.authApiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorageService: TokenStorageService
  ) {}

  public registerAccount(request: IRegisterRequest): Observable<IRegisterResponse> {
    return this.http.post<IRegisterResponse>(`${this.API_URL}/register`, request);
  }

  public verifyEmail(request: IVerifyEmailRequest): Observable<IVerifyEmailResponse> {
    return this.http.post<IVerifyEmailResponse>(`${this.API_URL}/verify-email`, request);
  }

  public resendVerificationCode(
    request: IResendVerificationCodeRequest
  ): Observable<IResendVerificationCodeResponse> {
    return this.http.post<IResendVerificationCodeResponse>(
      `${this.API_URL}/resend-verification-code`,
      request
    );
  }

  public login(request: ILoginRequest): Observable<ILoginResponse> {
    return this.http.post<ILoginResponse>(`${this.API_URL}/login`, request);
  }

  public refreshAccessToken(): Observable<IRefreshTokenResponse> {
    const refreshToken = this.tokenStorageService.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('Refresh token is missing.'));
    }

    const request: IRefreshTokenRequest = { refreshToken };

    return this.http.post<IRefreshTokenResponse>(`${this.API_URL}/refresh`, request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  public forgotPassword(request: IForgotPasswordRequest): Observable<IForgotPasswordResponse> {
    return this.http.post<IForgotPasswordResponse>(`${this.API_URL}/forgot-password`, request);
  }

  public resetPassword(request: IResetPasswordRequest): Observable<IResetPasswordResponse> {
    return this.http.post<IResetPasswordResponse>(`${this.API_URL}/reset-password`, request);
  }

  public getCurrentAccount(): Observable<IMeResponse> {
    return this.http.get<IMeResponse>(`${this.API_URL}/me`);
  }

  public saveSession(response: ILoginResponse | IRefreshTokenResponse): void {
    this.tokenStorageService.saveAccessToken(response.accessToken);

    if (response.refreshToken) {
      this.tokenStorageService.saveRefreshToken(response.refreshToken);
    }

    if (response.tokenType !== undefined) {
      this.tokenStorageService.saveTokenType(response.tokenType || 'Bearer');
    }
  }

  public getAccessToken(): string | null {
    return this.tokenStorageService.getAccessToken();
  }

  public isAuthenticated(): boolean {
    return !!this.getAccessToken() && !this.isTokenExpired();
  }

  public isTokenExpired(): boolean {
    const token = this.getAccessToken();

    if (!token) {
      return true;
    }

    const payload = this.getTokenPayload();

    if (!payload) {
      return true;
    }

    if (!payload.exp) {
      return false;
    }

    return Date.now() >= Number(payload.exp) * 1000;
  }

  public logout(): void {
    this.tokenStorageService.clearSession();
  }

  public getTokenPayload(): any | null {
    const token = this.getAccessToken();

    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];

      const base64 = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const paddedBase64 = base64.padEnd(
        base64.length + (4 - base64.length % 4) % 4,
        '='
      );

      return JSON.parse(atob(paddedBase64));
    } catch (error) {
      console.error('Could not decode JWT payload', error);
      return null;
    }
  }

  public getAccountId(): string | null {
    const payload = this.getTokenPayload();

    return payload?.accountId || payload?.id || payload?.sub || null;
  }

  public getUserRole(): string | null {
    const payload = this.getTokenPayload();

    if (!payload) {
      return null;
    }

    const candidates = [
      payload.role,
      ...(Array.isArray(payload.authorities) ? payload.authorities : [payload.authorities]),
      ...(Array.isArray(payload.roles) ? payload.roles : [payload.roles])
    ];

    for (const candidate of candidates) {
      const role = this.normalizeRole(candidate);

      if (role) {
        return role;
      }
    }

    return null;
  }

  public isRestaurantOwner(): boolean {
    return this.getUserRole() === 'RESTAURANT_OWNER';
  }

  private normalizeRole(value: unknown): string | null {
    if (!value) {
      return null;
    }

    const role = typeof value === 'string'
      ? value
      : this.getRoleFromObject(value);

    if (!role) {
      return null;
    }

    return role.trim().toUpperCase().replace(/^ROLE_/, '');
  }

  private getRoleFromObject(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const roleValue = value as { authority?: unknown; role?: unknown; name?: unknown };
    const role = roleValue.authority ?? roleValue.role ?? roleValue.name;

    return typeof role === 'string' ? role : null;
  }

    public updateCurrentProfile(request: IUpdateProfileRequest): Observable<IMeResponse> {
    return this.http.patch<IMeResponse>(`${this.API_URL}/me`, request);
  }
}
