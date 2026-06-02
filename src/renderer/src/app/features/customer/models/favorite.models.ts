export interface FavoriteRestaurantResponse {
  restaurantId: string;
  restaurantName: string;
  restaurantImageUrl?: string | null;
  available: boolean;
  createdAt: string;
}

export interface FavoriteProductResponse {
  productId: string;
  productName: string;
  restaurantId: string;
  restaurantName: string;
  productImageUrl?: string | null;
  price: number;
  available: boolean;
  createdAt: string;
}

export interface CustomerFavoritesResponse {
  restaurants: FavoriteRestaurantResponse[];
  products: FavoriteProductResponse[];
}

export interface FavoriteStatusResponse {
  restaurantIds: string[];
  productIds: string[];
}

export interface FeaturedProductResponse {
  productId: string;
  productName: string;
  restaurantId: string;
  imageUrl?: string | null;
  price: number;
  favoriteCount: number;
}
