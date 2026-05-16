import { IProductReorderItemRequest } from './IProductReorderItemRequest';

export interface IReorderProductsRequest {
  restaurantId: string;
  categoryId: string;
  products: IProductReorderItemRequest[];
}