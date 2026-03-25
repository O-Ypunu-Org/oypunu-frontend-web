import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { LanguagesService } from '../../../../../core/services/languages.service';
import { AdminApiService } from '../../../../admin/services/admin-api.service';
import { PROFILE_ROUTES, PROFILE_ADMIN_ROUTES } from '../../../constants/profile.constants';

@Component({
  selector: 'app-profile-languages-section',
  standalone: false,
  templateUrl: './profile-languages-section.component.html',
})
export class ProfileLanguagesSectionComponent implements OnInit {
  @Input() isAdmin = false;

  languages: any[] = [];
  isLoading = false;
  error: string | null = null;

  readonly proposeRoute = PROFILE_ROUTES.proposeLanguage;
  readonly manageRoute = PROFILE_ADMIN_ROUTES.manageLanguages;

  readonly statusLabels: Record<string, string> = {
    proposed: 'En attente',
    active: 'Approuvée',
    deprecated: 'Rejetée',
    pending: 'En attente',
    approved: 'Approuvée',
    rejected: 'Rejetée',
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
    private languagesService: LanguagesService,
    private adminApiService: AdminApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadLanguages();
  }

  private loadLanguages(): void {
    this.isLoading = true;
    this.error = null;

    const source$: Observable<any> = this.isAdmin
      ? this.adminApiService.getLanguagesAdmin()
      : this.languagesService.getMyProposals();

    source$.subscribe({
      next: (data: any) => {
        // getLanguagesAdmin retourne { languages, total, ... } ou tableau direct
        this.languages = Array.isArray(data) ? data : (data.languages ?? []);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les langues.';
        this.isLoading = false;
      },
    });
  }

  getStatusLabel(lang: any): string {
    const status = lang.systemStatus ?? lang.status ?? '';
    return this.statusLabels[status] ?? status;
  }

  getStatusClass(lang: any): string {
    const status = lang.systemStatus ?? lang.status ?? '';
    const cls = this.statusClasses[status];
    return cls ? `${cls.badge} ${cls.text}` : 'bg-gray-500/10 text-gray-400';
  }

  onManage(): void {
    this.router.navigate([this.manageRoute]);
  }

  onPropose(): void {
    this.router.navigate([this.proposeRoute]);
  }

  onEdit(language: any): void {
    const id = language._id || language.id;
    this.router.navigate(['/languages/edit', id]);
  }
}
