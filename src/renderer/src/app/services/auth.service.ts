import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import { IRegisterRequest } from '../models/IRegisterRequest';
import { IRegisterResponse } from '../models/IRegisterResponse';
import { IVerifyEmailRequest } from '../models/IVerifyEmailRequest';
import { IVerifyEmailResponse } from '../models/IVerifyEmailResponse';
import { IResendVerificationCodeRequest } from '../models/IResendVerificationCodeRequest';
import { IResendVerificationCodeResponse } from '../models/IResendVerificationCodeResponse';
import { ILoginRequest } from '../models/ILoginRequest';
import { ILoginResponse } from '../models/ILoginResponse';
import { IForgotPasswordRequest } from '../models/IForgotPasswordRequest';
import { IForgotPasswordResponse } from '../models/IForgotPasswordResponse';
import { IResetPasswordRequest } from '../models/IResetPasswordRequest';
import { IResetPasswordResponse } from '../models/IResetPasswordResponse';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

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

public forgotPassword(request: IForgotPasswordRequest): Observable<IForgotPasswordResponse> {
  return this.http.post<IForgotPasswordResponse>(`${this.API_URL}/forgot-password`, request);
}

public resetPassword(request: IResetPasswordRequest): Observable<IResetPasswordResponse> {
  return this.http.post<IResetPasswordResponse>(`${this.API_URL}/reset-password`, request);
}
}