import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin } from 'rxjs';
import { ICreateBranchRequest } from '../models/branch/ICreateBranchRequest';

import { RestaurantApiService } from '../services/RestaurantApiService';
import { BranchApiService } from '../services/BranchApiService';
import { CategoryApiService } from '../services/CategoryApiService';
import { ProductApiService } from '../services/ProductApiService';
import { ICreateProductRequest } from '../models/product/ICreateProductRequest';

import { ICreateCategoryRequest } from '../models/category/ICreateCategoryRequest';

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

  creatingBranch = false;
showCreateBranchForm = false;

branchForm = {
  name: '',
  phoneNumber: '',
  formattedAddress: '',
  latitude: '',
  longitude: '',
  googlePlaceId: '',
  isMainBranch: false
};

  creatingCategory = false;
showCreateCategoryForm = false;

categoryForm = {
  name: '',
  description: '',
  displayOrder: ''
};

creatingProduct = false;
showCreateProductForm = false;

productForm = {
  categoryId: '',
  name: '',
  description: '',
  productType: 'SIMPLE',
  price: '',
  imageUrl: '',
  imageObjectKey: '',
  displayOrder: '',
  featured: false,
  tags: '',
  dietaryFlags: '',
  allergens: ''
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

  toggleCreateBranchForm(): void {
  this.showCreateBranchForm = !this.showCreateBranchForm;
}

createBranch(): void {
  if (!this.restaurant) {
    this.errorMessage = 'Primero debes tener un restaurante creado.';
    return;
  }

  if (!this.branchForm.name.trim()) {
    this.errorMessage = 'El nombre de la sucursal es obligatorio.';
    return;
  }

  if (!this.branchForm.formattedAddress.trim()) {
    this.errorMessage = 'La dirección de la sucursal es obligatoria.';
    return;
  }

  const latitude = Number(this.branchForm.latitude);
  const longitude = Number(this.branchForm.longitude);

  if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
    this.errorMessage = 'La latitud debe estar entre -90 y 90.';
    return;
  }

  if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
    this.errorMessage = 'La longitud debe estar entre -180 y 180.';
    return;
  }

  this.creatingBranch = true;
  this.errorMessage = '';

  const request: ICreateBranchRequest = {
    restaurantId: this.restaurant.id,
    name: this.branchForm.name.trim(),
    phoneNumber: this.branchForm.phoneNumber.trim() || null,
    formattedAddress: this.branchForm.formattedAddress.trim(),
    latitude,
    longitude,
    googlePlaceId: this.branchForm.googlePlaceId.trim() || null,
    isMainBranch: this.branchForm.isMainBranch,
    availability: {
      status: 'AVAILABLE',
      temporaryReason: null,
      temporaryReasonDetail: null,
      weeklySchedule: []
    }
  };

  this.branchApiService.createBranch(request)
    .pipe(
      finalize(() => {
        this.creatingBranch = false;
        this.changeDetectorRef.detectChanges();
      })
    )
    .subscribe({
      next: (branch) => {
        this.branches = [...this.branches, branch];
        this.showCreateBranchForm = false;
        this.resetBranchForm();
      },
      error: (error) => {
        console.error('Create branch error:', error);

        if (error.status === 409) {
          this.errorMessage = 'Ya existe una sucursal principal activa para este restaurante. Desmarca la opción de principal o cambia la sucursal principal actual.';
          return;
        }

        if (error.status === 400) {
          this.errorMessage = 'Los datos de la sucursal no son válidos. Revisa nombre, dirección, latitud y longitud.';
          return;
        }

        this.errorMessage = 'No se pudo crear la sucursal. Inténtalo nuevamente.';
      }
    });
}

private resetBranchForm(): void {
  this.branchForm = {
    name: '',
    phoneNumber: '',
    formattedAddress: '',
    latitude: '',
    longitude: '',
    googlePlaceId: '',
    isMainBranch: false
  };
}
toggleCreateCategoryForm(): void {
  this.showCreateCategoryForm = !this.showCreateCategoryForm;
}

createCategory(): void {
  if (!this.restaurant) {
    this.errorMessage = 'Primero debes tener un restaurante creado.';
    return;
  }

  if (!this.categoryForm.name.trim()) {
    this.errorMessage = 'El nombre de la categoría es obligatorio.';
    return;
  }

  const displayOrder = this.categoryForm.displayOrder
    ? Number(this.categoryForm.displayOrder)
    : 0;

  if (Number.isNaN(displayOrder) || displayOrder < 0) {
    this.errorMessage = 'El orden de la categoría debe ser un número mayor o igual a 0.';
    return;
  }

  this.creatingCategory = true;
  this.errorMessage = '';

  const request: ICreateCategoryRequest = {
    restaurantId: this.restaurant.id,
    name: this.categoryForm.name.trim(),
    description: this.categoryForm.description.trim() || null,
    displayOrder,
    image: null,
    availability: {
      status: 'AVAILABLE',
      temporaryReason: null,
      temporaryReasonDetail: null,
      weeklySchedule: []
    }
  };

  this.categoryApiService.createCategory(request)
    .pipe(
      finalize(() => {
        this.creatingCategory = false;
        this.changeDetectorRef.detectChanges();
      })
    )
    .subscribe({
      next: (category) => {
        this.categories = [...this.categories, category];
        this.showCreateCategoryForm = false;
        this.resetCategoryForm();
      },
      error: (error) => {
        console.error('Create category error:', error);

        if (error.status === 400) {
          this.errorMessage = 'Los datos de la categoría no son válidos.';
          return;
        }

        this.errorMessage = 'No se pudo crear la categoría. Inténtalo nuevamente.';
      }
    });
}

private resetCategoryForm(): void {
  this.categoryForm = {
    name: '',
    description: '',
    displayOrder: ''
  };
}

toggleCreateProductForm(): void {
  this.showCreateProductForm = !this.showCreateProductForm;
}

createProduct(): void {
  if (!this.restaurant) {
    this.errorMessage = 'Primero debes tener un restaurante creado.';
    return;
  }

  if (!this.productForm.categoryId) {
    this.errorMessage = 'Debes seleccionar una categoría.';
    return;
  }

  if (!this.productForm.name.trim()) {
    this.errorMessage = 'El nombre del producto es obligatorio.';
    return;
  }

  const price = Number(this.productForm.price);

  if (Number.isNaN(price) || price < 0) {
    this.errorMessage = 'El precio debe ser un número mayor o igual a 0.';
    return;
  }

  const displayOrder = this.productForm.displayOrder
    ? Number(this.productForm.displayOrder)
    : 0;

  if (Number.isNaN(displayOrder) || displayOrder < 0) {
    this.errorMessage = 'El orden debe ser un número mayor o igual a 0.';
    return;
  }

  this.creatingProduct = true;
  this.errorMessage = '';

  const request: ICreateProductRequest = {
    restaurantId: this.restaurant.id,
    categoryId: this.productForm.categoryId,
    name: this.productForm.name.trim(),
    description: this.productForm.description.trim() || null,
    productType: this.productForm.productType as 'SIMPLE' | 'CUSTOMIZABLE',
    price,
    image: this.buildProductImageRequest(),
    modifierGroups: [],
    availability: {
      status: 'AVAILABLE',
      temporaryReason: null,
      temporaryReasonDetail: null,
      weeklySchedule: []
    },
    active: true,
    displayOrder,
    featured: this.productForm.featured,
    tags: this.parseCsv(this.productForm.tags),
    dietaryFlags: this.parseCsv(this.productForm.dietaryFlags),
    allergens: this.parseCsv(this.productForm.allergens)
  };

  this.productApiService.createProduct(request)
    .pipe(
      finalize(() => {
        this.creatingProduct = false;
        this.changeDetectorRef.detectChanges();
      })
    )
    .subscribe({
      next: (product) => {
        this.products = [...this.products, product];
        this.showCreateProductForm = false;
        this.resetProductForm();
      },
      error: (error) => {
        console.error('Create product error:', error);

        if (error.status === 400) {
          this.errorMessage = 'Los datos del producto no son válidos.';
          return;
        }

        this.errorMessage = 'No se pudo crear el producto. Inténtalo nuevamente.';
      }
    });
}

private buildProductImageRequest() {
  if (!this.productForm.imageUrl.trim()) {
    return null;
  }

  return {
    url: this.productForm.imageUrl.trim(),
    objectKey: this.productForm.imageObjectKey.trim() || 'products/default-product.jpg',
    provider: 'CLOUDINARY'
  };
}

private parseCsv(value: string): string[] {
  if (!value.trim()) {
    return [];
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

private resetProductForm(): void {
  this.productForm = {
    categoryId: '',
    name: '',
    description: '',
    productType: 'SIMPLE',
    price: '',
    imageUrl: '',
    imageObjectKey: '',
    displayOrder: '',
    featured: false,
    tags: '',
    dietaryFlags: '',
    allergens: ''
  };
}

}