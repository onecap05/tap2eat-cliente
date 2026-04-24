import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { RestaurantApiService } from '../services/RestaurantApiService';
import { BranchApiService } from '../services/BranchApiService';

import { IRestaurantResponse } from '../models/restaurant/IRestaurantResponse';
import { IBranchResponse } from '../models/branch/IBranchResponse';

import { DEV_CATALOG_CONTEXT } from '../../../core/config/dev-catalog-context';

@Component({
  selector: 'app-owner-catalog-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './OwnerCatalogDashboardComponent.html',
  styleUrl: './OwnerCatalogDashboardComponent.css'
})
export class OwnerCatalogDashboardComponent implements OnInit {
  restaurant: IRestaurantResponse | null = null;
  branches: IBranchResponse[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private readonly restaurantApiService: RestaurantApiService,
    private readonly branchApiService: BranchApiService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    console.log('Owner catalog dashboard loaded');

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadCatalog();
  }

  private loadCatalog(): void {
    this.loading = true;
    this.errorMessage = '';

    this.restaurantApiService
      .getByOwnerAccountId(DEV_CATALOG_CONTEXT.ownerAccountId)
      .subscribe({
        next: (restaurant) => {
          console.log('Restaurant loaded:', restaurant);
          this.restaurant = restaurant;

          this.branchApiService.getByRestaurantId(restaurant.id).subscribe({
            next: (branches) => {
              console.log('Branches loaded:', branches);

              this.branches = branches;
              this.loading = false;

              this.changeDetectorRef.detectChanges();
            },
            error: (error) => {
              console.error('Branches load error:', error);

              this.loading = false;
              this.errorMessage = 'No se pudieron cargar las sucursales.';

              this.changeDetectorRef.detectChanges();
            }
          });
        },
        error: (error) => {
          console.error('Restaurant load error:', error);

          this.loading = false;
          this.errorMessage = 'No se pudo cargar el restaurante.';

          this.changeDetectorRef.detectChanges();
        }
      });
  }
}