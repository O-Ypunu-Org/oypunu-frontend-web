import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { LanguagesRoutingModule } from './languages-routing.module';
import { SharedModule } from '../../shared/shared.module';

// Components
import { AddLanguageComponent } from './components/add-language/add-language.component';
import { LanguageManagementContainer } from '../admin/containers/language-management/language-management.container';

@NgModule({
  declarations: [
    AddLanguageComponent,
    LanguageManagementContainer,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    LanguagesRoutingModule,
    SharedModule
  ]
})
export class LanguagesModule { }