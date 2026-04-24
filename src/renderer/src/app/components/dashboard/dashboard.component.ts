import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  public accessTokenSaved: boolean = !!localStorage.getItem('accessToken');
  public refreshTokenSaved: boolean = !!localStorage.getItem('refreshToken');

  constructor(private router: Router) {}

  public logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenType');

    this.router.navigate(['/login']);
  }
}