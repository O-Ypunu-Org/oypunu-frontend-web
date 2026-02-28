import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ProfileRoutingModule } from './profile-routing.module';
import { ProfileViewComponent } from './components/profile-view/profile-view.component';
import { ProfileEditComponent } from './components/profile-edit/profile-edit.component';
import { UserSectionComponent } from './components/sections/user-section/user-section.component';
import { ContributorSectionComponent } from './components/sections/contributor-section/contributor-section.component';
import { AdminSectionComponent } from './components/sections/admin-section/admin-section.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    ProfileViewComponent,
    ProfileEditComponent,
    UserSectionComponent,
    ContributorSectionComponent,
    AdminSectionComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ProfileRoutingModule,
    SharedModule,
  ],
})
export class ProfileModule {}
