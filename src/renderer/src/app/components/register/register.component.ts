import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { IRegisterRequest } from '../../models/IRegisterRequest';
import { FormsModule } from '@angular/forms'; // Very important for ngModel

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [FormsModule], // We import FormsModule here
    templateUrl: './register.component.html',
    
})
export class RegisterComponent {
    public request: IRegisterRequest = {
        email: '',
        password: '',
        role: 'CUSTOMER'
    };

    constructor(private authService: AuthService) {}

    public onSubmit(): void {
        this.authService.registerAccount(this.request).subscribe({
            next: (response: string) => {
                alert('Success: ' + response);
            },
            error: (error: any) => {
                alert('Error connecting to backend!');
                console.error(error);
            }
        });
    }
}