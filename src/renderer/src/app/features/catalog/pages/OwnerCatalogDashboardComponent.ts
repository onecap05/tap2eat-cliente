import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { RestaurantApiService } from '../services/RestaurantApiService';
import { BranchApiService } from '../services/BranchApiService';
import { CategoryApiService } from '../services/CategoryApiService';
import { ProductApiService } from '../services/ProductApiService';

import { IRestaurantResponse } from '../models/restaurant/IRestaurantResponse';
import { IBranchResponse } from '../models/branch/IBranchResponse';
import { ICategoryResponse } from '../models/category/ICategoryResponse';
import { IProductResponse } from '../models/product/IProductResponse';
import { ICreateRestaurantRequest } from '../models/restaurant/ICreateRestaurantRequest';

import { DEV_CATALOG_CONTEXT } from '../../../core/config/dev-catalog-context';

@Component({
  selector: 'app-owner-catalog-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './OwnerCatalogDashboardComponent.html',
  styleUrl: './OwnerCatalogDashboardComponent.css'
})
export class OwnerCatalogDashboardComponent implements OnInit {
  restaurant: IRestaurantResponse | null = null;
  branches: IBranchResponse[] = [];
  categories: ICategoryResponse[] = [];
  products: IProductResponse[] = [];

  loading = false;
  creatingRestaurant = false;
  showCreateRestaurantForm = false;
  errorMessage = '';

  restaurantForm = {
    name: '',
    description: '',
    logoUrl: '',
    logoObjectKey: '',
    logoProvider: 'CLOUDINARY'
  };

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

  createRestaurant(): void {
    if (!this.restaurantForm.name.trim()) {
      this.errorMessage = 'El nombre del restaurante es obligatorio.';
      return;
    }

    this.creatingRestaurant = true;
    this.errorMessage = '';

    const request: ICreateRestaurantRequest = {
      ownerAccountId: DEV_CATALOG_CONTEXT.ownerAccountId,
      name: this.restaurantForm.name.trim(),
      description: this.restaurantForm.description.trim() || null,
      logo: this.buildLogoRequest()
    };

    this.restaurantApiService.createRestaurant(request).subscribe({
      next: (restaurant) => {
        this.restaurant = restaurant;
        this.showCreateRestaurantForm = false;
        this.creatingRestaurant = false;

        this.branches = [];
        this.categories = [];
        this.products = [];

        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Create restaurant error:', error);
        this.creatingRestaurant = false;
        this.errorMessage = 'No se pudo crear el restaurante.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  private loadCatalog(): void {
    this.loading = true;
    this.errorMessage = '';
    this.showCreateRestaurantForm = false;

    this.restaurantApiService
      .getByOwnerAccountId(DEV_CATALOG_CONTEXT.ownerAccountId)
      .subscribe({
        next: (restaurant) => {
          this.restaurant = restaurant;
          this.loadCatalogDetails(restaurant.id);
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;

          if (error.status === 404) {
            this.showCreateRestaurantForm = true;
            this.restaurant = null;
            this.branches = [];
            this.categories = [];
            this.products = [];
          } else {
            console.error('Restaurant load error:', error);
            this.errorMessage = 'No se pudo cargar el restaurante.';
          }

          this.changeDetectorRef.detectChanges();
        }
      });
  }

  private loadCatalogDetails(restaurantId: string): void {
    forkJoin({
      branches: this.branchApiService.getByRestaurantId(restaurantId),
      categories: this.categoryApiService.getByRestaurantId(restaurantId),
      products: this.productApiService.getByRestaurantId(restaurantId)
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
  }

  private buildLogoRequest() {
    if (!this.restaurantForm.logoUrl.trim()) {
      return null;
    }

    return {
      url: this.restaurantForm.logoUrl.trim(),
      objectKey: this.restaurantForm.logoObjectKey.trim() || 'restaurants/default-logo.jpg',
      provider: this.restaurantForm.logoProvider
    };
  }
}