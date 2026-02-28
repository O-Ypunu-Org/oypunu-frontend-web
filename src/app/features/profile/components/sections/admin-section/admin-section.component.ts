import { Component, Input } from '@angular/core';
import {
  ADMIN_NAV_ITEMS,
  SECTION_TITLES,
  type AdminNavItem,
} from '../../../constants/profile.constants';

/**
 * Section administration — miroir de AdminSection.tsx + SuperAdminSection.tsx (mobile).
 * Un seul composant gérant les deux rôles via @Input isSuperAdmin.
 */
@Component({
  selector: 'app-admin-section',
  standalone: false,
  templateUrl: './admin-section.component.html',
})
export class AdminSectionComponent {
  @Input() isSuperAdmin: boolean = false;

  readonly title = SECTION_TITLES.administration;

  get navItems(): AdminNavItem[] {
    return ADMIN_NAV_ITEMS[this.isSuperAdmin ? 'superadmin' : 'admin'];
  }

  isWarning(item: AdminNavItem): boolean {
    return item.variant === 'warning';
  }
}
