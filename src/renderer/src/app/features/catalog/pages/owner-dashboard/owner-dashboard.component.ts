import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin } from 'rxjs';

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
import { IUpdateProductRequest } from '../../models/product/IUpdateProductRequest';
import { IPauseProductRequest } from '../../models/product/IPauseProductRequest';
import { IReorderProductsRequest } from '../../models/product/IReorderProductsRequest';
import { IUpdateCategoryRequest } from '../../models/category/IUpdateCategoryRequest';

import {
  OwnerSidebarComponent,
  OwnerPanelSection
} from '../../components/layout/owner-sidebar/owner-sidebar.component';
import { RestaurantSummaryCardComponent } from '../../components/restaurant/restaurant-summary-card/restaurant-summary-card.component';
import {
  RestaurantFormComponent,
  RestaurantFormValue
} from '../../components/restaurant/restaurant-form/restaurant-form.component';
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
  updatingCategory = false;
  creatingProduct = false;

  updatingProduct = false;
  deactivatingProduct = false;
  pausingProduct = false;
  savingProductOrder = false;

  productOperationVersion = 0;

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
      logo: this.buildRestaurantLogoRequest(formValue)
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
        this.productOperationVersion++;
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

  updateProduct(event: { productId: string; request: IUpdateProductRequest }): void {
    if (!this.restaurant) {
      this.errorMessage = 'Primero debes crear un restaurante.';
      return;
    }

    this.updatingProduct = true;
    this.errorMessage = '';

    this.productApiService.updateProduct(
      event.productId,
      this.restaurant.id,
      event.request
    ).subscribe({
      next: (updatedProduct) => {
        this.products = this.replaceProduct(updatedProduct);
        this.updatingProduct = false;
        this.productOperationVersion++;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Update product error:', error);
        this.updatingProduct = false;
        this.errorMessage = 'No se pudo actualizar el producto.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  deactivateProduct(product: IProductResponse): void {
    if (!this.restaurant) {
      this.errorMessage = 'Primero debes crear un restaurante.';
      return;
    }

    this.deactivatingProduct = true;
    this.errorMessage = '';

    this.productApiService.deactivateProduct(product.id, this.restaurant.id).subscribe({
      next: (updatedProduct) => {
        this.products = this.products.filter(existingProduct =>
          existingProduct.id !== updatedProduct.id
        );

        this.deactivatingProduct = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Deactivate product error:', error);
        this.deactivatingProduct = false;
        this.errorMessage = 'No se pudo desactivar el producto.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  pauseProduct(event: { productId: string; request: IPauseProductRequest }): void {
    if (!this.restaurant) {
      this.errorMessage = 'Primero debes crear un restaurante.';
      return;
    }

    this.pausingProduct = true;
    this.errorMessage = '';

    this.productApiService.pauseProduct(
      event.productId,
      this.restaurant.id,
      event.request
    ).subscribe({
      next: (updatedProduct) => {
        this.products = this.replaceProduct(updatedProduct);
        this.pausingProduct = false;
        this.productOperationVersion++;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Pause product error:', error);
        this.pausingProduct = false;
        this.errorMessage = 'No se pudo pausar el producto.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  resumeProduct(product: IProductResponse): void {
    if (!this.restaurant) {
      this.errorMessage = 'Primero debes crear un restaurante.';
      return;
    }

    this.pausingProduct = true;
    this.errorMessage = '';

    this.productApiService.resumeProduct(product.id, this.restaurant.id).subscribe({
      next: (updatedProduct) => {
        this.products = this.replaceProduct(updatedProduct);
        this.pausingProduct = false;
        this.productOperationVersion++;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Resume product error:', error);
        this.pausingProduct = false;
        this.errorMessage = 'No se pudo reactivar el producto.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  deleteProduct(product: IProductResponse): void {
    if (!this.restaurant) {
      this.errorMessage = 'Primero debes crear un restaurante.';
      return;
    }

    this.deactivatingProduct = true;
    this.errorMessage = '';

    this.productApiService.deleteProduct(product.id, this.restaurant.id).subscribe({
      next: (deletedProduct) => {
        this.products = this.products.filter(existingProduct =>
          existingProduct.id !== deletedProduct.id
        );

        this.deactivatingProduct = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Delete product error:', error);
        this.deactivatingProduct = false;
        this.errorMessage = 'No se pudo eliminar el producto.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  onReorderProducts(request: Omit<IReorderProductsRequest, 'restaurantId'>): void {
    if (!this.restaurant || this.savingProductOrder) {
      return;
    }

    this.savingProductOrder = true;
    this.errorMessage = '';

    const finalRequest: IReorderProductsRequest = {
      ...request,
      restaurantId: this.restaurant.id
    };

    this.productApiService.reorderProducts(finalRequest)
      .pipe(
        finalize(() => {
          this.savingProductOrder = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: (updatedProducts) => {
          this.products = this.products.map(product => {
            const updatedProduct = updatedProducts.find(item => item.id === product.id);
            return updatedProduct ?? product;
          });

          this.productOperationVersion++;
        },
        error: (error) => {
          console.error('Reorder products error:', error);
          this.errorMessage = 'No se pudo guardar el orden de los productos.';

          if (this.restaurant) {
            this.loadCatalogDetails(this.restaurant.id);
          }
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

  private buildRestaurantLogoRequest(formValue: RestaurantFormValue) {
    if (!formValue.logoUrl) {
      return null;
    }

    return {
      url: formValue.logoUrl,
      objectKey: formValue.logoObjectKey || 'restaurants/default-logo.jpg',
      provider: formValue.logoProvider || 'CLOUDINARY'
    };
  }

  private replaceProduct(updatedProduct: IProductResponse): IProductResponse[] {
    return this.products.map(product =>
      product.id === updatedProduct.id ? updatedProduct : product
    );
  }

  updateCategory(event: { categoryId: string; request: IUpdateCategoryRequest }): void {
  if (!this.restaurant) {
    this.errorMessage = 'Primero debes crear un restaurante.';
    return;
  }

  this.updatingCategory = true;
  this.errorMessage = '';

  this.categoryApiService.updateCategory(
    event.categoryId,
    this.restaurant.id,
    event.request
  ).subscribe({
    next: (updatedCategory) => {
      this.categories = this.categories.map(category =>
        category.id === updatedCategory.id ? updatedCategory : category
      );

      this.updatingCategory = false;
      this.changeDetectorRef.detectChanges();
    },
    error: (error) => {
      console.error('Update category error:', error);
      this.updatingCategory = false;
      this.errorMessage = 'No se pudo actualizar la categoría.';
      this.changeDetectorRef.detectChanges();
    }
  });
}
}