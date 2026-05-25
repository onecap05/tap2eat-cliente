import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { ICreateProductRequest } from '../../../models/product/ICreateProductRequest';
import { IProductResponse } from '../../../models/product/IProductResponse';
import { ImageUploadApiService } from '../../../services/ImageUploadApiService';
import { ProductFormComponent } from './product-form.component';

class FakeImageUploadApiService {
  uploadProductImage() {
    return of({
      url: 'https://cdn.test/product.png',
      objectKey: 'product.png',
      provider: 'LOCAL'
    });
  }
}

describe('ProductFormComponent', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;

  const categories: ICategoryResponse[] = [
    {
      id: 'category-1',
      restaurantId: 'restaurant-1',
      name: 'Hamburguesas',
      description: null,
      active: true,
      displayOrder: 1,
      createdAt: null,
      updatedAt: null,
      deletedAt: null
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        { provide: ImageUploadApiService, useClass: FakeImageUploadApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    component.categories = categories;
    fixture.detectChanges();
  });

  it('should send selected tags when creating a product', async () => {
    const request = await submitCreateProduct();

    component.toggleRecommendationTag('hamburguesa');
    component.toggleRecommendationTag('bbq');

    const taggedRequest = await submitCreateProduct();

    expect(request.tags).toEqual([]);
    expect(taggedRequest.tags).toEqual(['hamburguesa', 'bbq']);
  });

  it('should load existing tags when editing a product', () => {
    const product = createProductResponse({
      tags: ['Pizza', 'Café', 'pizza']
    });

    component.productToEdit = product;
    component.ngOnChanges({
      productToEdit: new SimpleChange(null, product, true)
    });

    expect(component.form.tags).toEqual(['pizza', 'cafe']);
  });

  it('should normalize custom tag text', () => {
    component.form.customTagInput = '  Tacos Dorados  ';

    component.addCustomTag();

    expect(component.form.tags).toContain('tacos-dorados');

    component.form.customTagInput = 'Café';
    component.addCustomTag();

    expect(component.form.tags).toContain('cafe');
  });

  it('should not allow duplicate tags', () => {
    component.toggleRecommendationTag('pizza');
    component.form.customTagInput = 'Pizza';

    component.addCustomTag();

    expect(component.form.tags).toEqual(['pizza']);
    expect(component.tagMessage).toBe('Este tag ya está agregado.');
  });

  it('should try to add custom tag when Enter is pressed', () => {
    const input = fixture.nativeElement.querySelector('input[name="customRecommendationTag"]') as HTMLInputElement;

    input.value = 'malteada';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(component.form.tags).toContain('malteada');
  });

  it('should remove a tag from the request', async () => {
    component.toggleRecommendationTag('sushi');
    component.removeRecommendationTag('sushi');

    const request = await submitCreateProduct();

    expect(request.tags).not.toContain('sushi');
  });

  it('should suggest hamburguesa for burger alias', () => {
    component.form.customTagInput = 'burger';

    component.addCustomTag();

    expect(component.pendingTagSuggestion).toEqual({
      originalTag: 'burger',
      suggestedTag: 'hamburguesa'
    });
    expect(component.form.tags).toEqual([]);
  });

  it('should suggest tacos for taquitos alias', () => {
    component.form.customTagInput = 'taquitos';

    component.addCustomTag();

    expect(component.pendingTagSuggestion?.suggestedTag).toBe('tacos');
  });

  it('should suggest tacos for tacoz typo', () => {
    component.form.customTagInput = 'tacoz';

    component.addCustomTag();

    expect(component.pendingTagSuggestion).toEqual({
      originalTag: 'tacoz',
      suggestedTag: 'tacos'
    });
  });

  it('should add canonical tag when accepting suggestion', () => {
    component.form.customTagInput = 'burger';
    component.addCustomTag();

    component.acceptTagSuggestion();

    expect(component.form.tags).toEqual(['hamburguesa']);
    expect(component.pendingTagSuggestion).toBeNull();
  });

  it('should add normalized original tag when ignoring suggestion', () => {
    component.form.customTagInput = 'taquitos';
    component.addCustomTag();

    component.addPendingTagAnyway();

    expect(component.form.tags).toEqual(['taquitos']);
    expect(component.pendingTagSuggestion).toBeNull();
  });

  it('should keep dietary flags and allergens working', async () => {
    component.toggleDietaryFlag('VEGETARIAN');
    component.toggleAllergen('GLUTEN');

    const request = await submitCreateProduct();

    expect(request.dietaryFlags).toEqual(['VEGETARIAN']);
    expect(request.allergens).toEqual(['GLUTEN']);
  });

  async function submitCreateProduct(): Promise<Omit<ICreateProductRequest, 'restaurantId'>> {
    let emittedRequest: Omit<ICreateProductRequest, 'restaurantId'> | undefined;
    const subscription = component.createProduct.subscribe(request => {
      emittedRequest = request;
    });

    component.form.categoryId = 'category-1';
    component.form.name = 'Hamburguesa clásica';
    component.form.price = '120';

    await component.submit();

    subscription.unsubscribe();

    if (!emittedRequest) {
      throw new Error('Expected createProduct to emit a request.');
    }

    return emittedRequest;
  }
});

function createProductResponse(overrides: Partial<IProductResponse> = {}): IProductResponse {
  return {
    id: 'product-1',
    restaurantId: 'restaurant-1',
    categoryId: 'category-1',
    name: 'Pizza',
    description: null,
    productType: 'SIMPLE',
    price: 100,
    image: null,
    displayOrder: 1,
    featured: false,
    availability: {
      status: 'AVAILABLE',
      temporaryReason: null,
      temporaryReasonDetail: null,
      weeklySchedule: []
    },
    active: true,
    tags: [],
    dietaryFlags: [],
    allergens: [],
    modifierGroups: [],
    createdAt: null,
    updatedAt: null,
    deletedAt: null,
    ...overrides
  };
}
