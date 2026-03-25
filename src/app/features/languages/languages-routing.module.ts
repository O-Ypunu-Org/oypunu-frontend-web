import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AddLanguageComponent } from './components/add-language/add-language.component';
import { LanguageManagementContainer } from '../admin/containers/language-management/language-management.container';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/admin';

const routes: Routes = [
  {
    path: '',
    component: LanguageManagementContainer,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      title: 'Gestion des langues',
      breadcrumb: 'Langues',
      minRole: UserRole.ADMIN,
      roles: [UserRole.ADMIN, UserRole.SUPERADMIN]
    }
  },
  {
    path: 'add',
    component: AddLanguageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      title: 'Proposer une nouvelle langue',
      breadcrumb: 'Ajouter une langue',
      minRole: UserRole.CONTRIBUTOR,
      roles: [UserRole.CONTRIBUTOR, UserRole.ADMIN, UserRole.SUPERADMIN]
    }
  },
  {
    path: 'edit/:id',
    component: AddLanguageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      title: 'Modifier une langue',
      breadcrumb: 'Modifier la langue',
      minRole: UserRole.CONTRIBUTOR,
      roles: [UserRole.CONTRIBUTOR, UserRole.ADMIN, UserRole.SUPERADMIN]
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LanguagesRoutingModule { }
