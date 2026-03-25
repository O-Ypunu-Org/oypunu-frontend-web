import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { DictionaryService } from '../../../../../core/services/dictionary.service';
import { AdminApiService } from '../../../../admin/services/admin-api.service';
import { PROFILE_ROUTES, PROFILE_ADMIN_ROUTES } from '../../../constants/profile.constants';

@Component({
  selector: 'app-profile-categories-section',
  standalone: false,
  templateUrl: './profile-categories-section.component.html',
})
export class ProfileCategoriesSectionComponent implements OnInit {
  @Input() isAdmin = false;

  categories: any[] = [];
  isLoading = false;
  error: string | null = null;

  readonly proposeRoute = PROFILE_ROUTES.proposeCategory;
  readonly manageRoute = PROFILE_ADMIN_ROUTES.manageCategories;

  readonly statusLabels: Record<string, string> = {
    proposed:   'En attente',
    pending:    'En attente',
    active:     'Approuvée',
    approved:   'Approuvée',
    deprecated: 'Rejetée',
    rejected:   'Rejetée',
  };

  readonly statusClasses: Record<string, { badge: string; text: string }> = {
    proposed:   { badge: 'bg-yellow-500/10', text: 'text-yellow-400' },
    pending:    { badge: 'bg-yellow-500/10', text: 'text-yellow-400' },
    active:     { badge: 'bg-green-500/10',  text: 'text-green-400'  },
    approved:   { badge: 'bg-green-500/10',  text: 'text-green-400'  },
    deprecated: { badge: 'bg-red-500/10',    text: 'text-red-400'    },
    rejected:   { badge: 'bg-red-500/10',    text: 'text-red-400'    },
  };

  constructor(
    private dictionaryService: DictionaryService,
    private adminApiService: AdminApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.isLoading = true;
    this.error = null;

    const source$: Observable<any> = this.isAdmin
      ? this.adminApiService.getCategories()
      : this.dictionaryService.getMyProposalCategories();

    source$.subscribe({
      next: (data: any) => {
        this.categories = Array.isArray(data) ? data : (data.categories ?? []);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les catégories.';
        this.isLoading = false;
      },
    });
  }

  getStatusLabel(cat: any): string {
    const status = cat.systemStatus ?? cat.status ?? '';
    return this.statusLabels[status] ?? status;
  }

  getStatusClass(cat: any): string {
    const status = cat.systemStatus ?? cat.status ?? '';
    const cls = this.statusClasses[status];
    return cls ? `${cls.badge} ${cls.text}` : 'bg-gray-500/10 text-gray-400';
  }

  getLanguageName(cat: any): string {
    if (cat.languageId && typeof cat.languageId === 'object') {
      return cat.languageId.name ?? '';
    }
    return cat.language ?? '';
  }

  onManage(): void {
    this.router.navigate([this.manageRoute]);
  }

  onPropose(): void {
    this.router.navigate([this.proposeRoute]);
  }
}
