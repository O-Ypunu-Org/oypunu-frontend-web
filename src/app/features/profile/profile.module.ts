import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ProfileRoutingModule } from './profile-routing.module';
import { ProfileViewComponent } from './components/profile-view/profile-view.component';
import { ProfileEditComponent } from './components/profile-edit/profile-edit.component';
import { UserSectionComponent } from './components/sections/user-section/user-section.component';
import { ContributorSectionComponent } from './components/sections/contributor-section/contributor-section.component';
import { AdminSectionComponent } from './components/sections/admin-section/admin-section.component';
import { ProfileLanguagesSectionComponent } from './components/sections/profile-languages-section/profile-languages-section.component';
import { ProfileCategoriesSectionComponent } from './components/sections/profile-categories-section/profile-categories-section.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    ProfileViewComponent,
    ProfileEditComponent,
    UserSectionComponent,
    ContributorSectionComponent,
    AdminSectionComponent,
    ProfileLanguagesSectionComponent,
    ProfileCategoriesSectionComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    ProfileRoutingModule,
    SharedModule,
  ],
})
export class ProfileModule {}
