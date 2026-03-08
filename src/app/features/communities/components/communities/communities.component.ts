import { Component, OnInit } from '@angular/core';
import {
  CommunitiesService,
  CommunityFilters,
} from '../../../../core/services/communities.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GuestLimitsService } from '../../../../core/services/guest-limits.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Router } from '@angular/router';
import { DropdownOption } from '../../../../shared/components/custom-dropdown/custom-dropdown.component';

@Component({
  selector: 'app-communities',
  standalone: false,
  templateUrl: './communities.component.html',
  styleUrl: './communities.component.scss',
})
export class CommunitiesComponent implements OnInit {
  filters: CommunityFilters = {
    language: '',
    sortBy: 'memberCount',
    sortOrder: 'desc',
  };
  communities: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  userCommunities: string[] = [];
  isAuthenticated = false;

  // Langues disponibles chargées depuis l'API
  availableLanguages: Array<{ _id: string; name: string; nativeName: string; iso639_1?: string }> = [];

  sortOptions: DropdownOption[] = [
    { value: 'memberCount|desc', label: 'Les plus populaires' },
    { value: 'createdAt|desc', label: 'Les plus récentes' },
    { value: 'name|asc', label: 'Alphabétique' },
  ];

  selectedSort = 'memberCount|desc';

  get languageOptions(): DropdownOption[] {
    return [
      { value: '', label: 'Toutes les langues' },
      ...this.availableLanguages.map((lang) => ({
        value: lang._id,
        label: lang.nativeName || lang.name,
      })),
    ];
  }

  // Pagination
  page = 1;
  limit = 9;
  total = 0;
  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Gestion des limitations pour visiteurs
  showSignupModal = false;
  guestLimits: any = null;

  constructor(
    private _communitiesService: CommunitiesService,
    private _authService: AuthService,
    private _guestLimitsService: GuestLimitsService,
    private _toastService: ToastService,
    private _router: Router
  ) {
    // S'abonner aux communautés de l'utilisateur
    this._communitiesService.userCommunities$.subscribe((communities) => {
      this.userCommunities = communities.map((c) => c._id);
    });

    // Vérifier l'état d'authentification
    this._authService.currentUser$.subscribe((user) => {
      this.isAuthenticated = !!user;
    });
  }

  ngOnInit(): void {
    this.loadLanguages();
    this.loadCommunities();
  }

  loadLanguages(): void {
    this._communitiesService.getLanguages().subscribe({
      next: (languages) => (this.availableLanguages = languages),
      error: () => (this.availableLanguages = []),
    });
  }

  onSortChange(): void {
    const [sortBy, sortOrder] = this.selectedSort.split('|');
    this.filters.sortBy = sortBy as any;
    this.filters.sortOrder = sortOrder as any;
    this.page = 1;
    this.loadCommunities();
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadCommunities();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadCommunities();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadCommunities(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Vérifier les limitations pour les visiteurs non authentifiés
    if (!this.isAuthenticated) {
      const limitResult = this._guestLimitsService.canViewCommunity();
      if (!limitResult.allowed) {
        this.showSignupModal = true;
        this.guestLimits = this._guestLimitsService.getCurrentLimits();
        this.errorMessage = limitResult.message || 'Limite de consultation atteinte';
        this.isLoading = false;
        return;
      }
    }

    this._communitiesService.getAll({ ...this.filters, page: this.page, limit: this.limit }).subscribe({
      next: (response) => {
        this.communities = response.communities;
        this.total = response.total ?? 0;
        this.isLoading = false;
        
        // Donner du feedback discret sur les consultations restantes pour les visiteurs
        if (!this.isAuthenticated && response.communities.length > 0) {
          const stats = this._guestLimitsService.getCurrentStats();
          if (stats.communitiesRemaining === 1) {
            this._toastService.warning(
              'Dernière visite communauté gratuite',
              'Rejoignez la communauté gratuitement pour participer aux discussions !',
              4000
            );
          } else if (stats.communitiesRemaining === 0) {
            this._toastService.info(
              'Découverte des communautés terminée',
              'Créez votre compte pour rejoindre les communautés et échanger !',
              5000
            );
          }
        }
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement des communautés';
        this.isLoading = false;
      },
    });
  }

  isMember(communityId: string): boolean {
    return this.userCommunities.includes(communityId);
  }

  joinCommunity(communityId: string): void {
    this._communitiesService.join(communityId).subscribe({
      next: () => this.loadCommunities(),
      error: () =>
        (this.errorMessage =
          'Erreur lors de la tentative de rejoindre la communauté'),
    });
  }

  /**
   * Fermer la modal d'inscription
   */
  closeSignupModal(): void {
    this.showSignupModal = false;
  }

  /**
   * Naviguer vers la page d'inscription
   */
  goToSignup(): void {
    this._router.navigate(['/auth/register']);
  }

  /**
   * Naviguer vers la page de connexion
   */
  goToLogin(): void {
    this._router.navigate(['/auth/login']);
  }
}
