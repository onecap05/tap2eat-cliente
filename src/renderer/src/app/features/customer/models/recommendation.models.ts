export interface RecommendationBranchResponse {
  restaurantId: string;
  restaurantName: string;
  restaurantImageUrl?: string | null;
  branchId: string;
  branchName: string;
  branchAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  reason: string;
  score: number;
  warning?: string | null;
}

export interface CustomerLocation {
  latitude: number;
  longitude: number;
}
