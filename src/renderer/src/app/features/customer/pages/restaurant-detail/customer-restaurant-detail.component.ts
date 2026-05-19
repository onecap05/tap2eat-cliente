import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';

import { IBranchResponse } from '../../../catalog/models/branch/IBranchResponse';
import { ICategoryResponse } from '../../../catalog/models/category/ICategoryResponse';
import { IModifierGroupResponse } from '../../../catalog/models/commons/IModifierGroupResponse';
import { IModifierOptionResponse } from '../../../catalog/models/commons/IModifierOptionResponse';
import { IProductResponse } from '../../../catalog/models/product/IProductResponse';
import { IRestaurantResponse } from '../../../catalog/models/restaurant/IRestaurantResponse';
import { ICartItem, ICartState, IProductModifierSelection } from '../../models/cart.models';
import { CartService } from '../../services/cart.service';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';

const CUSTOMER_RESTAURANT_DETAIL_TEXT = {
  back: 'Restaurantes',
  allCategories: 'Todo',
  branches: 'Sucursales',
  menu: 'Menú',
  addToCart: 'Agregar al carrito',
  cart: 'Carrito',
  checkout: 'Continuar al checkout',
  checkoutPending: 'Checkout próximamente',
  emptyCart: 'Tu carrito está vacío.',
  mixedCart: 'Tu carrito tiene productos de otro restaurante. Puedes vaciarlo y empezar uno nuevo.',
  replaceCart: 'Vaciar carrito y agregar',
  cancel: 'Cancelar',
  requiredGroup: 'Selecciona las opciones requeridas.',
  maxReached: 'Máximo de opciones alcanzado.',
  loading: 'Cargando restaurante...',
  error: 'No pudimos cargar este restaurante.'
};

@Component({
  selector: 'app-customer-restaurant-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customer-restaurant-detail.component.html',
  styleUrl: './customer-restaurant-detail.component.css'
})
export class CustomerRestaurantDetailComponent implements OnInit, OnDestroy {
  public readonly text = CUSTOMER_RESTAURANT_DETAIL_TEXT;
  public restaurant: IRestaurantResponse | null = null;
  public branches: IBranchResponse[] = [];
  public categories: ICategoryResponse[] = [];
  public products: IProductResponse[] = [];
  public selectedCategoryId = 'all';
  public selectedProduct: IProductResponse | null = null;
  public selectedOptionsByGroup = new Map<string, IModifierOptionResponse[]>();
  public groupErrors = new Map<string, string>();
  public productQuantity = 1;
  public isLoading = true;
  public errorMessage = '';
  public cartState: ICartState;
  public pendingAddRequest: { product: IProductResponse; selections: IProductModifierSelection[]; quantity: number } | null = null;

  private cartSubscription?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly customerCatalogApiService: CustomerCatalogApiService,
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

  public get filteredProducts(): IProductResponse[] {
    if (this.selectedCategoryId === 'all') {
      return this.products;
    }

    return this.products.filter(product => product.categoryId === this.selectedCategoryId);
  }

  public openProduct(product: IProductResponse): void {
    this.customerCatalogApiService.getProduct(product.id).subscribe({
      next: loadedProduct => {
        this.selectedProduct = loadedProduct;
        this.selectedOptionsByGroup = new Map();
        this.groupErrors = new Map();
        this.productQuantity = 1;
      },
      error: () => {
        this.errorMessage = this.text.error;
      }
    });
  }

  public closeProduct(): void {
    this.selectedProduct = null;
    this.pendingAddRequest = null;
  }

  public selectCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
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
    if (!this.selectedProduct || !this.validateModifierSelections()) {
      return;
    }

    const selections = this.getModifierSelections();
    const request = {
      product: this.selectedProduct,
      selections,
      quantity: this.productQuantity
    };

    const wasAdded = this.cartService.addItem({
      product: request.product,
      quantity: request.quantity,
      modifierSelections: request.selections
    }, replaceRestaurantCart);

    if (!wasAdded) {
      this.pendingAddRequest = request;
      return;
    }

    this.closeProduct();
  }

  public replaceCartAndAdd(): void {
    if (!this.pendingAddRequest) {
      return;
    }

    this.cartService.addItem({
      product: this.pendingAddRequest.product,
      quantity: this.pendingAddRequest.quantity,
      modifierSelections: this.pendingAddRequest.selections
    }, true);
    this.closeProduct();
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

  public getGroupId(group: IModifierGroupResponse): string {
    return group.id ?? group.name;
  }

  public getGroupError(group: IModifierGroupResponse): string {
    return this.groupErrors.get(this.getGroupId(group)) ?? '';
  }

  public getProductUnitPreview(product: IProductResponse): number {
    if (this.selectedProduct?.id !== product.id) {
      return product.price;
    }

    return product.price + this.getModifierSelections()
      .flatMap(selection => selection.options)
      .reduce((total, option) => total + (option.additionalPrice ?? 0), 0);
  }

  public getActiveModifierGroups(product: IProductResponse): IModifierGroupResponse[] {
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

    forkJoin({
      restaurant: this.customerCatalogApiService.getRestaurant(restaurantId),
      branches: this.customerCatalogApiService.getBranches(restaurantId),
      categories: this.customerCatalogApiService.getCategories(restaurantId),
      products: this.customerCatalogApiService.getProducts(restaurantId)
    }).subscribe({
      next: response => {
        this.restaurant = response.restaurant;
        this.branches = response.branches;
        this.categories = response.categories;
        this.products = response.products;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = this.text.error;
        this.isLoading = false;
      }
    });
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
}
