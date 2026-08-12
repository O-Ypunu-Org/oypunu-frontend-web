import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { IntelligentRecommendationsComponent } from '../../../shared/components/intelligent-recommendations/intelligent-recommendations.component';
import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  declarations: [
    IntelligentRecommendationsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
  ],
  exports: [
    IntelligentRecommendationsComponent,
  ],
})
export class RecommendationsModule {}