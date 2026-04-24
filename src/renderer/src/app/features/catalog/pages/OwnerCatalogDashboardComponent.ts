import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { forkJoin } from 'rxjs';

import { RestaurantApiService } from '../services/RestaurantApiService';
import { BranchApiService } from '../services/BranchApiService';
import { CategoryApiService } from '../services/CategoryApiService';
import { ProductApiService } from '../services/ProductApiService';

import { IRestaurantResponse } from '../models/restaurant/IRestaurantResponse';
import { IBranchResponse } from '../models/branch/IBranchResponse';
import { ICategoryResponse } from '../models/category/ICategoryResponse';
import { IProductResponse } from '../models/product/IProductResponse';

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
  categories: ICategoryResponse[] = [];
  products: IProductResponse[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private readonly restaurantApiService: RestaurantApiService,
    private readonly branchApiService: BranchApiService,
    private readonly categoryApiService: CategoryApiService,
    private readonly productApiService: ProductApiService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
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
          this.restaurant = restaurant;

          forkJoin({
            branches: this.branchApiService.getByRestaurantId(restaurant.id),
            categories: this.categoryApiService.getByRestaurantId(restaurant.id),
            products: this.productApiService.getByRestaurantId(restaurant.id)
          }).subscribe({
            next: ({ branches, categories, products }) => {
              this.branches = branches;
              this.categories = categories;
              this.products = products;
              this.loading = false;
              this.changeDetectorRef.detectChanges();
            },
            error: (error) => {
              console.error('Catalog details load error:', error);
              this.loading = false;
              this.errorMessage = 'No se pudo cargar la información del catálogo.';
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