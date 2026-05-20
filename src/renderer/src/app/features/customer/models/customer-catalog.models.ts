import { IBranchResponse } from '../../catalog/models/branch/IBranchResponse';
import { ICategoryResponse } from '../../catalog/models/category/ICategoryResponse';
import { IProductResponse } from '../../catalog/models/product/IProductResponse';
import { IRestaurantResponse } from '../../catalog/models/restaurant/IRestaurantResponse';

export type CustomerRestaurantResponse = Omit<IRestaurantResponse, 'ownerAccountId' | 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  open: boolean;
};

export type CustomerBranchResponse = Omit<IBranchResponse, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  open: boolean;
};

export type CustomerCategoryResponse = Omit<ICategoryResponse, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  available: boolean;
};

export type CustomerProductResponse = Omit<IProductResponse, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  available: boolean;
};
