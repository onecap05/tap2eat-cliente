import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReportService, OwnerDashboardReport } from '../../services/report.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  public accessTokenSaved: boolean = !!localStorage.getItem('accessToken');
  public refreshTokenSaved: boolean = !!localStorage.getItem('refreshToken');

  public report?: OwnerDashboardReport;
  public loadingReport: boolean = false;
  public reportError: string = '';

  private readonly fallbackRestaurantId = '6a1293e567579ad6a5a51d14';

  constructor(
    private router: Router,
    private reportService: ReportService
  ) {}

  public ngOnInit(): void {
    this.loadDashboardReport();
  }

  public loadDashboardReport(): void {
    const restaurantId = localStorage.getItem('restaurantId') || this.fallbackRestaurantId;

    if (!restaurantId) {
      this.reportError = 'No se encontró el restaurante asociado al usuario.';
      return;
    }

    this.loadingReport = true;
    this.reportError = '';

    this.reportService.getOwnerDashboard(restaurantId).subscribe({
      next: (report: OwnerDashboardReport) => {
        this.report = report;
        this.loadingReport = false;
      },
      error: (error) => {
        console.error('Error loading dashboard report:', error);
        this.reportError = 'No se pudieron cargar las métricas del dashboard.';
        this.loadingReport = false;
      }
    });
  }

  public logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenType');

    this.router.navigate(['/login']);
  }
}