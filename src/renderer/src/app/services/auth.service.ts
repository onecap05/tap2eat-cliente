import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IRegisterRequest } from '../models/IRegisterRequest';
import { environment } from '../../environments/environment'; // <-- Import the environment

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    
    // Now it reads dynamically based on where the app is running!
    private readonly API_URL = environment.apiUrl; 

    constructor(private http: HttpClient) {}

    public registerAccount(request: IRegisterRequest): Observable<string> {
        return this.http.post(this.API_URL + '/register', request, { responseType: 'text' });
    }
}