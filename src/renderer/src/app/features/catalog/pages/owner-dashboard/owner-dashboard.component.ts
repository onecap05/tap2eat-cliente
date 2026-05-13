import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';

import { RestaurantApiService } from '../../services/RestaurantApiService';
import { BranchApiService } from '../../services/BranchApiService';
import { CategoryApiService } from '../../services/CategoryApiService';
import { ProductApiService } from '../../services/ProductApiService';

import { IRestaurantResponse } from '../../models/restaurant/IRestaurantResponse';
import { IBranchResponse } from '../../models/branch/IBranchResponse';
import { ICategoryResponse } from '../../models/category/ICategoryResponse';
import { IProductResponse } from '../../models/product/IProductResponse';

import { ICreateRestaurantRequest } from '../../models/restaurant/ICreateRestaurantRequest';
import { ICreateBranchRequest } from '../../models/branch/ICreateBranchRequest';
import { ICreateCategoryRequest } from '../../models/category/ICreateCategoryRequest';
import { ICreateProductRequest } from '../../models/product/ICreateProductRequest';

import { OwnerSidebarComponent, OwnerPanelSection } from '../../components/layout/owner-sidebar/owner-sidebar.component';
import { RestaurantSummaryCardComponent } from '../../components/restaurant/restaurant-summary-card/restaurant-summary-card.component';
import { RestaurantFormComponent, RestaurantFormValue } from '../../components/restaurant/restaurant-form/restaurant-form.component';
import { DashboardOverviewComponent } from '../../components/dashboard/dashboard-overview/dashboard-overview.component';
import { MenuManagementComponent } from '../../components/menu/menu-management/menu-management.component';
import { BranchManagementComponent } from '../../components/branches/branch-management/branch-management.component';
import { OrdersPreviewComponent } from '../../components/orders/orders-preview/orders-preview.component';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    OwnerSidebarComponent,
    RestaurantSummaryCardComponent,
    RestaurantFormComponent,
    DashboardOverviewComponent,
    MenuManagementComponent,
    BranchManagementComponent,
    OrdersPreviewComponent
  ],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.css'
})
export class OwnerDashboardComponent implements OnInit {
  activeSection: OwnerPanelSection = 'dashboard';

  restaurant: IRestaurantResponse | null = null;
  branches: IBranchResponse[] = [];
  categories: ICategoryResponse[] = [];
  products: IProductResponse[] = [];

  loading = false;
  errorMessage = '';
  showCreateRestaurantForm = false;

  creatingRestaurant = false;
  creatingBranch = false;
  creatingCategory = false;
  creatingProduct = false;

  constructor(
    private readonly restaurantApiService: RestaurantApiService,
    private readonly branchApiService: BranchApiService,
    private readonly categoryApiService: CategoryApiService,
    private readonly productApiService: ProductApiService,
    private readonly authService: AuthService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadCatalog();
  }

  setSection(section: OwnerPanelSection): void {
    this.activeSection = section;
  }

  createRestaurant(formValue: RestaurantFormValue): void {
    const ownerAccountId = this.getOwnerAccountId();

    if (!ownerAccountId) {
      return;
    }

    this.creatingRestaurant = true;
    this.errorMessage = '';

    const request: ICreateRestaurantRequest = {
      ownerAccountId,
      name: formValue.name,
      description: formValue.description || null,
      logo: formValue.logoUrl
        ? {
            url: formValue.logoUrl,
            objectKey: formValue.logoObjectKey || 'restaurants/default-logo.jpg',
            provider: formValue.logoProvider || 'CLOUDINARY'
          }
        : null
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

  createBranch(request: Omit<ICreateBranchRequest, 'restaurantId'>): void {
    if (!this.restaurant) {
      this.errorMessage = 'Primero debes crear un restaurante.';
      return;
    }

    this.creatingBranch = true;
    this.errorMessage = '';

    const finalRequest: ICreateBranchRequest = {
      ...request,
      restaurantId: this.restaurant.id
    };

    this.branchApiService.createBranch(finalRequest).subscribe({
      next: (branch) => {
        this.branches = [...this.branches, branch];
        this.creatingBranch = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Create branch error:', error);
        this.creatingBranch = false;
        this.errorMessage = 'No se pudo crear la sucursal.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  createCategory(request: Omit<ICreateCategoryRequest, 'restaurantId'>): void {
    if (!this.restaurant) {
      this.errorMessage = 'Primero debes crear un restaurante.';
      return;
    }

    this.creatingCategory = true;
    this.errorMessage = '';

    const finalRequest: ICreateCategoryRequest = {
      ...request,
      restaurantId: this.restaurant.id
    };

    this.categoryApiService.createCategory(finalRequest).subscribe({
      next: (category) => {
        this.categories = [...this.categories, category];
        this.creatingCategory = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Create category error:', error);
        this.creatingCategory = false;
        this.errorMessage = 'No se pudo crear la categoría.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  createProduct(request: Omit<ICreateProductRequest, 'restaurantId'>): void {
    if (!this.restaurant) {
      this.errorMessage = 'Primero debes crear un restaurante.';
      return;
    }

    this.creatingProduct = true;
    this.errorMessage = '';

    const finalRequest: ICreateProductRequest = {
      ...request,
      restaurantId: this.restaurant.id
    };

    this.productApiService.createProduct(finalRequest).subscribe({
      next: (product) => {
        this.products = [...this.products, product];
        this.creatingProduct = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Create product error:', error);
        this.creatingProduct = false;
        this.errorMessage = 'No se pudo crear el producto.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  private loadCatalog(): void {
    this.loading = true;
    this.errorMessage = '';
    this.showCreateRestaurantForm = false;

    const ownerAccountId = this.getOwnerAccountId();

    if (!ownerAccountId) {
      this.loading = false;
      this.changeDetectorRef.detectChanges();
      return;
    }

    this.restaurantApiService.getByOwnerAccountId(ownerAccountId).subscribe({
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

  private getOwnerAccountId(): string | null {
    const ownerAccountId = this.authService.getAccountId();

    if (!ownerAccountId) {
      this.errorMessage = 'No se pudo identificar la cuenta del restaurante.';
      return null;
    }

    return ownerAccountId;
  }
}