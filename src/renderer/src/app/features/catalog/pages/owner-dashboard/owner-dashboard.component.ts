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
import { IUpdateRestaurantRequest } from '../../models/restaurant/IUpdateRestaurantRequest';
import { ICreateBranchRequest } from '../../models/branch/ICreateBranchRequest';
import { ICreateCategoryRequest } from '../../models/category/ICreateCategoryRequest';
import { ICreateProductRequest } from '../../models/product/ICreateProductRequest';
import { IUpdateProductRequest } from '../../models/product/IUpdateProductRequest';
import { IPauseProductRequest } from '../../models/product/IPauseProductRequest';
import { IReorderProductsRequest } from '../../models/product/IReorderProductsRequest';
import { IUpdateCategoryRequest } from '../../models/category/IUpdateCategoryRequest';
import { IUpdateBranchRequest } from '../../models/branch/IUpdateBranchRequest';
import { OwnerModalComponent } from '../../components/shared/owner-modal/owner-modal.component';

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

const OWNER_RESTAURANT_STATE_LABELS = {
  deletedTitle: 'Restaurante eliminado',
  deletedDescription:
    'Este restaurante está desactivado. Para volver a administrar sucursales, menú y pedidos, primero debes restaurarlo.',
  restoreButton: 'Restaurar restaurante',
  editButton: 'Editar datos',
  deletedHint:
    'Mientras esté eliminado, no se podrán gestionar sucursales ni catálogo.'
};

const OWNER_DASHBOARD_MESSAGES = {
  restaurantRequired: 'Primero debes crear un restaurante.',
  accountNotFound: 'No se pudo identificar la cuenta del restaurante.',
  createRestaurantFailed: 'No se pudo crear el restaurante.',
  updateRestaurantFailed: 'No se pudo actualizar el restaurante.',
  deleteRestaurantFailed: 'No se pudo eliminar el restaurante.',
  restoreRestaurantFailed: 'No se pudo restaurar el restaurante.',
  loadRestaurantFailed: 'No se pudo cargar el restaurante.',
  deleteRestaurantWithBranchesBlocked: 'Primero elimina todas las sucursales antes de eliminar el restaurante.',
  deleteRestaurantConfirmation: (restaurantName: string) =>
    `¿Seguro que deseas eliminar el restaurante "${restaurantName}"?`,
  createBranchFailed: 'No se pudo crear la sucursal.',
  updateBranchFailed: 'No se pudo actualizar la sucursal.',
  deleteBranchFailed: 'No se pudo eliminar la sucursal.',
  createCategoryFailed: 'No se pudo crear la categoría.',
  updateCategoryFailed: 'No se pudo actualizar la categoría.',
  deleteCategoryFailed: 'No se pudo eliminar la categoría. Verifica que no tenga productos asociados.',
  createProductFailed: 'No se pudo crear el producto.',
  updateProductFailed: 'No se pudo actualizar el producto.',
  deactivateProductFailed: 'No se pudo desactivar el producto.',
  pauseProductFailed: 'No se pudo pausar el producto.',
  resumeProductFailed: 'No se pudo reactivar el producto.',
  deleteProductFailed: 'No se pudo eliminar el producto.',
  reorderProductsFailed: 'No se pudo guardar el orden de los productos.',
  loadCatalogDetailsFailed: 'No se pudo cargar la información del catálogo.'
};

const OWNER_DASHBOARD_LOGS = {
  createRestaurantError: 'Create restaurant error:',
  updateRestaurantError: 'Update restaurant error:',
  deleteRestaurantError: 'Delete restaurant error:',
  restoreRestaurantError: 'Restore restaurant error:',
  restaurantLoadError: 'Restaurant load error:',
  createBranchError: 'Create branch error:',
  updateBranchError: 'Update branch error:',
  deleteBranchError: 'Delete branch error:',
  createCategoryError: 'Create category error:',
  updateCategoryError: 'Update category error:',
  deleteCategoryError: 'Delete category error:',
  createProductError: 'Create product error:',
  updateProductError: 'Update product error:',
  deactivateProductError: 'Deactivate product error:',
  pauseProductError: 'Pause product error:',
  resumeProductError: 'Resume product error:',
  deleteProductError: 'Delete product error:',
  reorderProductsError: 'Reorder products error:',
  catalogDetailsLoadError: 'Catalog details load error:'
};

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
  OrdersPreviewComponent,
  OwnerModalComponent
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
  showEditRestaurantForm = false;

  creatingRestaurant = false;
  updatingRestaurant = false;
  deletingRestaurant = false;

  creatingBranch = false;
  updatingBranch = false;
  deletingBranch = false;

  creatingCategory = false;
  updatingCategory = false;
  deletingCategory = false;

  creatingProduct = false;
  updatingProduct = false;
  deactivatingProduct = false;
  pausingProduct = false;
  savingProductOrder = false;

  productOperationVersion = 0;

  readonly restaurantStateLabels = OWNER_RESTAURANT_STATE_LABELS;

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

  openEditRestaurantForm(): void {
    this.showEditRestaurantForm = true;
    this.changeDetectorRef.detectChanges();
  }

  closeEditRestaurantForm(): void {
    this.showEditRestaurantForm = false;
    this.changeDetectorRef.detectChanges();
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
      rfc: formValue.rfc,
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
        console.error(OWNER_DASHBOARD_LOGS.createRestaurantError, error);
        this.creatingRestaurant = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.createRestaurantFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  updateRestaurant(formValue: RestaurantFormValue): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
      return;
    }

    const ownerAccountId = this.getOwnerAccountId();

    if (!ownerAccountId) {
      return;
    }

    const request: IUpdateRestaurantRequest = {
      name: formValue.name,
      rfc: formValue.rfc,
      description: formValue.description || null,
      logo: this.buildRestaurantLogoRequest(formValue)
    };

    this.updatingRestaurant = true;
    this.errorMessage = '';

    this.restaurantApiService.updateRestaurant(
      this.restaurant.id,
      ownerAccountId,
      request
    ).subscribe({
      next: (updatedRestaurant) => {
        this.restaurant = updatedRestaurant;
        this.updatingRestaurant = false;
        this.showEditRestaurantForm = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error(OWNER_DASHBOARD_LOGS.updateRestaurantError, error);
        this.updatingRestaurant = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.updateRestaurantFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  deleteRestaurant(): void {
    if (!this.restaurant) {
      return;
    }

    if (this.branches.length > 0) {
      window.alert(OWNER_DASHBOARD_MESSAGES.deleteRestaurantWithBranchesBlocked);
      return;
    }

    const confirmed = window.confirm(
      OWNER_DASHBOARD_MESSAGES.deleteRestaurantConfirmation(this.restaurant.name)
    );

    if (!confirmed) {
      return;
    }

    const ownerAccountId = this.getOwnerAccountId();

    if (!ownerAccountId) {
      return;
    }

    this.deletingRestaurant = true;
    this.errorMessage = '';

    this.restaurantApiService.deleteRestaurant(
      this.restaurant.id,
      ownerAccountId
    ).subscribe({
      next: (deletedRestaurant) => {
        this.restaurant = deletedRestaurant;
        this.branches = [];
        this.categories = [];
        this.products = [];
        this.deletingRestaurant = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error(OWNER_DASHBOARD_LOGS.deleteRestaurantError, error);
        this.deletingRestaurant = false;

        this.errorMessage = error.status === 409
          ? OWNER_DASHBOARD_MESSAGES.deleteRestaurantWithBranchesBlocked
          : OWNER_DASHBOARD_MESSAGES.deleteRestaurantFailed;

        this.changeDetectorRef.detectChanges();
      }
    });
  }

  restoreRestaurant(): void {
    if (!this.restaurant) {
      return;
    }

    const ownerAccountId = this.getOwnerAccountId();

    if (!ownerAccountId) {
      return;
    }

    this.deletingRestaurant = true;
    this.errorMessage = '';

    this.restaurantApiService.restoreRestaurant(
      this.restaurant.id,
      ownerAccountId
    ).subscribe({
      next: (restoredRestaurant) => {
        this.restaurant = restoredRestaurant;
        this.deletingRestaurant = false;
        this.loadCatalogDetails(restoredRestaurant.id);
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error(OWNER_DASHBOARD_LOGS.restoreRestaurantError, error);
        this.deletingRestaurant = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.restoreRestaurantFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  createBranch(request: Omit<ICreateBranchRequest, 'restaurantId'>): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
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
        console.error(OWNER_DASHBOARD_LOGS.createBranchError, error);
        this.creatingBranch = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.createBranchFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  updateBranch(event: { branchId: string; request: IUpdateBranchRequest }): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
      return;
    }

    this.updatingBranch = true;
    this.errorMessage = '';

    this.branchApiService.updateBranch(
      event.branchId,
      this.restaurant.id,
      event.request
    ).subscribe({
      next: (updatedBranch) => {
        this.branches = this.branches.map(branch =>
          branch.id === updatedBranch.id ? updatedBranch : branch
        );

        this.updatingBranch = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error(OWNER_DASHBOARD_LOGS.updateBranchError, error);
        this.updatingBranch = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.updateBranchFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  deleteBranch(branch: IBranchResponse): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
      return;
    }

    this.deletingBranch = true;
    this.errorMessage = '';

    this.branchApiService.deactivateBranch(
      branch.id,
      this.restaurant.id
    ).subscribe({
      next: (deletedBranch) => {
        this.branches = this.branches.filter(existingBranch =>
          existingBranch.id !== deletedBranch.id
        );

        this.deletingBranch = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error(OWNER_DASHBOARD_LOGS.deleteBranchError, error);
        this.deletingBranch = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.deleteBranchFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  createCategory(request: Omit<ICreateCategoryRequest, 'restaurantId'>): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
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
        console.error(OWNER_DASHBOARD_LOGS.createCategoryError, error);
        this.creatingCategory = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.createCategoryFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  updateCategory(event: { categoryId: string; request: IUpdateCategoryRequest }): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
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
        console.error(OWNER_DASHBOARD_LOGS.updateCategoryError, error);
        this.updatingCategory = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.updateCategoryFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  deleteCategory(category: ICategoryResponse): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
      return;
    }

    this.deletingCategory = true;
    this.errorMessage = '';

    this.categoryApiService.deleteCategory(
      category.id,
      this.restaurant.id
    ).subscribe({
      next: (deletedCategory) => {
        this.categories = this.categories.filter(existingCategory =>
          existingCategory.id !== deletedCategory.id
        );

        this.deletingCategory = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error(OWNER_DASHBOARD_LOGS.deleteCategoryError, error);
        this.deletingCategory = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.deleteCategoryFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  createProduct(request: Omit<ICreateProductRequest, 'restaurantId'>): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
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
        console.error(OWNER_DASHBOARD_LOGS.createProductError, error);
        this.creatingProduct = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.createProductFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  updateProduct(event: { productId: string; request: IUpdateProductRequest }): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
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
        console.error(OWNER_DASHBOARD_LOGS.updateProductError, error);
        this.updatingProduct = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.updateProductFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  deactivateProduct(product: IProductResponse): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
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
        console.error(OWNER_DASHBOARD_LOGS.deactivateProductError, error);
        this.deactivatingProduct = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.deactivateProductFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  pauseProduct(event: { productId: string; request: IPauseProductRequest }): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
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
        console.error(OWNER_DASHBOARD_LOGS.pauseProductError, error);
        this.pausingProduct = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.pauseProductFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  resumeProduct(product: IProductResponse): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
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
        console.error(OWNER_DASHBOARD_LOGS.resumeProductError, error);
        this.pausingProduct = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.resumeProductFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  deleteProduct(product: IProductResponse): void {
    if (!this.restaurant) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.restaurantRequired;
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
        console.error(OWNER_DASHBOARD_LOGS.deleteProductError, error);
        this.deactivatingProduct = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.deleteProductFailed;
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
          console.error(OWNER_DASHBOARD_LOGS.reorderProductsError, error);
          this.errorMessage = OWNER_DASHBOARD_MESSAGES.reorderProductsFailed;

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
    this.showEditRestaurantForm = false;

    const ownerAccountId = this.getOwnerAccountId();

    if (!ownerAccountId) {
      this.loading = false;
      this.changeDetectorRef.detectChanges();
      return;
    }

    this.restaurantApiService.getByOwnerAccountId(ownerAccountId).subscribe({
      next: (restaurant) => {
        this.restaurant = restaurant;

        if (!restaurant.active) {
          this.branches = [];
          this.categories = [];
          this.products = [];
          this.loading = false;
          this.changeDetectorRef.detectChanges();
          return;
        }

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
          console.error(OWNER_DASHBOARD_LOGS.restaurantLoadError, error);
          this.errorMessage = OWNER_DASHBOARD_MESSAGES.loadRestaurantFailed;
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
        console.error(OWNER_DASHBOARD_LOGS.catalogDetailsLoadError, error);
        this.loading = false;
        this.errorMessage = OWNER_DASHBOARD_MESSAGES.loadCatalogDetailsFailed;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  private getOwnerAccountId(): string | null {
    const ownerAccountId = this.authService.getAccountId();

    if (!ownerAccountId) {
      this.errorMessage = OWNER_DASHBOARD_MESSAGES.accountNotFound;
      return null;
    }

    return ownerAccountId;
  }

  private buildRestaurantLogoRequest(
    formValue: RestaurantFormValue
  ): ICreateRestaurantRequest['logo'] {
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
}