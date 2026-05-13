import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { IRestaurantResponse } from '../../../models/restaurant/IRestaurantResponse';
import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { IProductResponse } from '../../../models/product/IProductResponse';

import { RecentOrdersPreviewComponent } from '../recent-orders-preview/recent-orders-preview.component';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, RecentOrdersPreviewComponent],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.css'
})
export class DashboardOverviewComponent {
  @Input({ required: true }) restaurant!: IRestaurantResponse;
  @Input() branches: IBranchResponse[] = [];
  @Input() categories: ICategoryResponse[] = [];
  @Input() products: IProductResponse[] = [];
}