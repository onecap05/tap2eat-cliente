import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, Subscription, switchMap } from 'rxjs';

import { IModifierGroupResponse } from '../../../catalog/models/commons/IModifierGroupResponse';
import { IModifierOptionResponse } from '../../../catalog/models/commons/IModifierOptionResponse';
import { CustomerNotificationBellComponent } from '../../components/customer-notification-bell/customer-notification-bell.component';
import { ICartItem, ICartState, IProductModifierSelection } from '../../models/cart.models';
import {
  CustomerBranchResponse,
  CustomerCategoryResponse,
  CustomerProductResponse,
  CustomerRestaurantResponse
} from '../../models/customer-catalog.models';
import { RecommendationBranchResponse } from '../../models/recommendation.models';
import { CartService } from '../../services/cart.service';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';
import { CustomerLocationService } from '../../services/customer-location.service';
import { RecommendationApiService } from '../../services/recommendation-api.service';

const CUSTOMER_RESTAURANT_DETAIL_TEXT = {
  back: 'Restaurantes',
  allCategories: 'Todo',
  branches: 'Sucursales',
  menu: 'Menu',
  addToCart: 'Agregar al carrito',
  cart: 'Carrito',
  checkoutPending: 'Checkout proximamente',
  checkout: 'Ir a pagar',
  emptyCart: 'Tu carrito esta vacio.',
  selectBranch: 'Selecciona una sucursal antes de continuar.',
  mixedCart: 'Tu carrito tiene productos de otro restaurante. Puedes vaciarlo y empezar uno nuevo.',
  replaceCart: 'Vaciar carrito y agregar',
  cancel: 'Cancelar',
  requiredGroup: 'Selecciona las opciones requeridas.',
  maxReached: 'Maximo de opciones alcanzado.',
  open: 'Abierto',
  closed: 'Cerrado',
  branchOpen: 'Abierta',
  branchClosed: 'Cerrada',
  recommendedBranch: 'Sucursal sugerida',
  changeBranch: 'Cambiar sucursal',
  distancePrefix: 'A',
  distanceSuffix: 'km de ti',
  closedRestaurant: 'Este restaurante esta cerrado ahora. Puedes consultar el menu, pero no agregar productos.',
  unavailableProduct: 'Este producto no esta disponible ahora.',
  unavailableCart: 'El carrito queda bloqueado mientras el restaurante este cerrado.',
  loading: 'Cargando restaurante...',
  error: 'No pudimos cargar este restaurante.'
};

@Component({
  selector: 'app-customer-restaurant-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomerNotificationBellComponent],
  templateUrl: './customer-restaurant-detail.component.html',
  styleUrls: [
    './customer-restaurant-detail.component.css',
    './customer-restaurant-detail.modal.css'
  ]
})
export class CustomerRestaurantDetailComponent implements OnInit, OnDestroy {
  public readonly text = CUSTOMER_RESTAURANT_DETAIL_TEXT;
  public restaurant: CustomerRestaurantResponse | null = null;
  public branches: CustomerBranchResponse[] = [];
  public categories: CustomerCategoryResponse[] = [];
  public products: CustomerProductResponse[] = [];
  public selectedCategoryId = 'all';
  public selectedBranchId: string | null = null;
  public selectedProduct: CustomerProductResponse | null = null;
  public selectedOptionsByGroup = new Map<string, IModifierOptionResponse[]>();
  public groupErrors = new Map<string, string>();
  public productQuantity = 1;
  public isLoading = true;
  public errorMessage = '';
  public availabilityMessage = '';
  public cartState: ICartState;
  public recommendedBranch: RecommendationBranchResponse | null = null;
  public recommendationWarning = '';
  public showBranchList = false;
  public pendingAddRequest: {
    product: CustomerProductResponse;
    selections: IProductModifierSelection[];
    quantity: number;
  } | null = null;

  private cartSubscription?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly customerCatalogApiService: CustomerCatalogApiService,
    private readonly recommendationApiService: RecommendationApiService,
    private readonly customerLocationService: CustomerLocationService,
    private readonly cartService: CartService
  ) {
    this.cartState = this.cartService.getSnapshot();
  }

  public ngOnInit(): void {
    this.cartSubscription = this.cartService.state$.subscribe(state => {
      this.cartState = state;
    });

    const restaurantId = this.route.snapshot.paramMap.get('restaurantId');

    if (!restaurantId) {
      this.errorMessage = this.text.error;
      this.isLoading = false;
      return;
    }

    this.loadRestaurant(restaurantId);
  }

  public ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
  }

  public get filteredProducts(): CustomerProductResponse[] {
    if (this.selectedCategoryId === 'all') {
      return this.products;
    }

    return this.products.filter(product => product.categoryId === this.selectedCategoryId);
  }

  public openProduct(product: CustomerProductResponse): void {
    this.availabilityMessage = '';

    if (!this.restaurant?.open) {
      this.availabilityMessage = this.text.closedRestaurant;
      return;
    }

    if (!product.available) {
      this.availabilityMessage = this.text.unavailableProduct;
      return;
    }

    this.customerCatalogApiService.getProduct(product.id).subscribe({
      next: loadedProduct => {
        if (!loadedProduct.available) {
          this.availabilityMessage = this.text.unavailableProduct;
          return;
        }

        this.selectedProduct = loadedProduct;
        this.selectedOptionsByGroup = new Map();
        this.groupErrors = new Map();
        this.productQuantity = 1;
      },
      error: () => {
        this.availabilityMessage = this.text.unavailableProduct;
      }
    });
  }

  public closeProduct(): void {
    this.selectedProduct = null;
    this.pendingAddRequest = null;
    this.availabilityMessage = '';
  }

  public selectCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
  }

  public selectBranch(branch: CustomerBranchResponse): void {
    if (!branch.open) {
      return;
    }

    this.selectedBranchId = branch.id;
    this.availabilityMessage = '';
    this.recommendedBranch = this.toRecommendationBranch(branch);
    this.recommendationWarning = '';
    this.showBranchList = false;
  }

  public showBranchesForChange(): void {
    this.showBranchList = true;
  }

  public increaseProductQuantity(): void {
    this.productQuantity += 1;
  }

  public decreaseProductQuantity(): void {
    this.productQuantity = Math.max(1, this.productQuantity - 1);
  }

  public toggleModifierOption(group: IModifierGroupResponse, option: IModifierOptionResponse): void {
    const groupId = this.getGroupId(group);
    const currentOptions = this.selectedOptionsByGroup.get(groupId) ?? [];

    if (group.selectionType === 'SINGLE') {
      this.selectedOptionsByGroup.set(groupId, [option]);
      this.groupErrors.delete(groupId);
      return;
    }

    const selected = currentOptions.some(currentOption => this.getOptionId(currentOption) === this.getOptionId(option));

    if (selected) {
      this.selectedOptionsByGroup.set(
        groupId,
        currentOptions.filter(currentOption => this.getOptionId(currentOption) !== this.getOptionId(option))
      );
      return;
    }

    if (currentOptions.length >= group.maxSelections) {
      this.groupErrors.set(groupId, this.text.maxReached);
      return;
    }

    this.selectedOptionsByGroup.set(groupId, [...currentOptions, option]);
    this.groupErrors.delete(groupId);
  }

  public isOptionSelected(group: IModifierGroupResponse, option: IModifierOptionResponse): boolean {
    const selectedOptions = this.selectedOptionsByGroup.get(this.getGroupId(group)) ?? [];

    return selectedOptions.some(selectedOption => this.getOptionId(selectedOption) === this.getOptionId(option));
  }

  public addSelectedProductToCart(replaceRestaurantCart = false): void {
    this.availabilityMessage = '';

    if (!this.selectedProduct || !this.validateModifierSelections()) {
      return;
    }

    if (!this.selectedBranchId) {
      this.availabilityMessage = this.text.selectBranch;
      return;
    }

    const selections = this.getModifierSelections();

    this.customerCatalogApiService.getProduct(this.selectedProduct.id).subscribe({
      next: latestProduct => {
        this.tryAddValidatedProduct(latestProduct, selections, this.productQuantity, replaceRestaurantCart);
      },
      error: () => {
        this.availabilityMessage = this.text.unavailableProduct;
      }
    });
  }

  public replaceCartAndAdd(): void {
    if (!this.pendingAddRequest) {
      return;
    }

    this.tryAddValidatedProduct(
      this.pendingAddRequest.product,
      this.pendingAddRequest.selections,
      this.pendingAddRequest.quantity,
      true
    );
  }

  public canAddSelectedProduct(): boolean {
    return Boolean(this.restaurant?.open && this.selectedProduct?.available);
  }

  public canCheckout(): boolean {
    return Boolean(this.restaurant?.open && this.cartState.items.length && this.cartState.branchId);
  }

  public goToCheckout(): void {
    if (!this.cartState.branchId) {
      this.availabilityMessage = this.text.selectBranch;
      return;
    }

    void this.router.navigate(['/customer/checkout']);
  }

  public increaseCartItem(item: ICartItem): void {
    this.cartService.increaseItem(item.id);
  }

  public decreaseCartItem(item: ICartItem): void {
    this.cartService.decreaseItem(item.id);
  }

  public removeCartItem(item: ICartItem): void {
    this.cartService.removeItem(item.id);
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  public formatDistance(distanceKm?: number | null): string {
    return distanceKm === null || distanceKm === undefined
      ? ''
      : `${this.text.distancePrefix} ${distanceKm.toFixed(2)} ${this.text.distanceSuffix}`;
  }

  public getGroupId(group: IModifierGroupResponse): string {
    return group.id ?? group.name;
  }

  public getGroupError(group: IModifierGroupResponse): string {
    return this.groupErrors.get(this.getGroupId(group)) ?? '';
  }

  public getProductUnitPreview(product: CustomerProductResponse): number {
    if (this.selectedProduct?.id !== product.id) {
      return product.price;
    }

    return product.price + this.getModifierSelections()
      .flatMap(selection => selection.options)
      .reduce((total, option) => total + (option.additionalPrice ?? 0), 0);
  }

  public getActiveModifierGroups(product: CustomerProductResponse): IModifierGroupResponse[] {
    return (product.modifierGroups ?? [])
      .filter(group => group.active)
      .sort((first, second) => (first.displayOrder ?? 999) - (second.displayOrder ?? 999));
  }

  public getActiveOptions(group: IModifierGroupResponse): IModifierOptionResponse[] {
    return (group.options ?? [])
      .filter(option => option.active)
      .sort((first, second) => (first.displayOrder ?? 999) - (second.displayOrder ?? 999));
  }

  private loadRestaurant(restaurantId: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.availabilityMessage = '';

    forkJoin({
      restaurant: this.customerCatalogApiService.getRestaurant(restaurantId),
      branches: this.customerCatalogApiService.getBranches(restaurantId),
      categories: this.customerCatalogApiService.getCategories(restaurantId),
      products: this.customerCatalogApiService.getProducts(restaurantId)
    }).subscribe({
      next: response => {
        this.restaurant = response.restaurant;
        this.branches = response.branches;
        this.selectedBranchId = this.getDefaultBranchId(response.branches);
        this.recommendedBranch = this.getSelectedBranchRecommendation();
        this.showBranchList = !this.recommendedBranch;
        this.categories = response.categories;
        this.products = response.products.filter(product => product.available);
        this.isLoading = false;
        this.loadNearestBranchRecommendation(restaurantId);
      },
      error: () => {
        this.errorMessage = this.text.error;
        this.isLoading = false;
      }
    });
  }

  private tryAddValidatedProduct(
    product: CustomerProductResponse,
    selections: IProductModifierSelection[],
    quantity: number,
    replaceRestaurantCart: boolean
  ): void {
    if (!this.restaurant?.open) {
      this.availabilityMessage = this.text.closedRestaurant;
      return;
    }

    if (!product.available) {
      this.availabilityMessage = this.text.unavailableProduct;
      return;
    }

    const request = { product, selections, quantity };
    const wasAdded = this.cartService.addItem({
      product: request.product,
      branchId: this.selectedBranchId,
      quantity: request.quantity,
      modifierSelections: request.selections
    }, replaceRestaurantCart);

    if (!wasAdded) {
      this.pendingAddRequest = request;
      return;
    }

    this.closeProduct();
  }

  private validateModifierSelections(): boolean {
    this.groupErrors = new Map();

    for (const group of this.getActiveModifierGroups(this.selectedProduct!)) {
      const groupId = this.getGroupId(group);
      const selectedCount = (this.selectedOptionsByGroup.get(groupId) ?? []).length;
      const minSelections = group.required ? Math.max(1, group.minSelections) : group.minSelections;

      if (selectedCount < minSelections || selectedCount > group.maxSelections) {
        this.groupErrors.set(groupId, this.text.requiredGroup);
      }
    }

    return this.groupErrors.size === 0;
  }

  private getModifierSelections(): IProductModifierSelection[] {
    if (!this.selectedProduct) {
      return [];
    }

    return this.getActiveModifierGroups(this.selectedProduct)
      .map(group => ({
        group,
        options: this.selectedOptionsByGroup.get(this.getGroupId(group)) ?? []
      }))
      .filter(selection => selection.options.length > 0);
  }

  private getOptionId(option: IModifierOptionResponse): string {
    return option.id ?? option.name;
  }

  private loadNearestBranchRecommendation(restaurantId: string): void {
    this.customerLocationService.getCurrentLocation()
      .pipe(
        switchMap(location => this.recommendationApiService.getNearestBranch(
          restaurantId,
          location?.latitude,
          location?.longitude
        )),
        catchError(() => of(null))
      )
      .subscribe(recommendation => {
        if (!recommendation?.branchId) {
          this.selectedBranchId = this.selectedBranchId ?? this.getDefaultBranchId(this.branches);
          this.recommendedBranch = this.getSelectedBranchRecommendation();
          this.showBranchList = !this.recommendedBranch;
          return;
        }

        const matchingBranch = this.branches.find(branch => branch.id === recommendation.branchId && branch.open);

        if (!matchingBranch) {
          this.selectedBranchId = this.selectedBranchId ?? this.getDefaultBranchId(this.branches);
          this.recommendedBranch = this.getSelectedBranchRecommendation();
          this.showBranchList = !this.recommendedBranch;
          return;
        }

        this.selectedBranchId = matchingBranch.id;
        this.recommendedBranch = recommendation;
        this.recommendationWarning = recommendation.warning ?? '';
        this.showBranchList = false;
      });
  }

  private getSelectedBranchRecommendation(): RecommendationBranchResponse | null {
    const branch = this.branches.find(item => item.id === this.selectedBranchId);

    return branch ? this.toRecommendationBranch(branch) : null;
  }

  private toRecommendationBranch(branch: CustomerBranchResponse): RecommendationBranchResponse {
    return {
      restaurantId: branch.restaurantId,
      restaurantName: this.restaurant?.name ?? '',
      restaurantImageUrl: this.restaurant?.logo?.url ?? null,
      branchId: branch.id,
      branchName: branch.name,
      branchAddress: branch.formattedAddress,
      latitude: branch.latitude,
      longitude: branch.longitude,
      distanceKm: null,
      reason: 'Sucursal disponible seleccionada automáticamente',
      score: 1,
      warning: null
    };
  }

  private getDefaultBranchId(branches: CustomerBranchResponse[]): string | null {
    return branches.find(branch => branch.open && branch.isMainBranch)?.id
      ?? branches.find(branch => branch.open)?.id
      ?? null;
  }
}
