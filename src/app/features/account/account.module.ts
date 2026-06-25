import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AccountRoutingModule } from './account-routing.module';
import { AccountDeleteComponent } from './components/account-delete/account-delete.component';

@NgModule({
  declarations: [AccountDeleteComponent],
  imports: [CommonModule, RouterModule, AccountRoutingModule],
})
export class AccountModule {}
