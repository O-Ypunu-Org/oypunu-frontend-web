import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountDeleteComponent } from './components/account-delete/account-delete.component';

const routes: Routes = [
  {
    path: 'delete',
    component: AccountDeleteComponent,
    data: { title: 'Supprimer mon compte' },
  },
  {
    path: '',
    redirectTo: 'delete',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccountRoutingModule {}
