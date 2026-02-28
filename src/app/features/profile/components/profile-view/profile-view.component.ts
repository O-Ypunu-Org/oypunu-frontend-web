import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';

import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminApiService } from '../../../admin/services/admin-api.service';
import { User, UserStats } from '../../../../core/models/user';
import { UserRole } from '../../../../core/models/admin';
import { ProfileRecentWord } from '../sections/contributor-section/contributor-section.component';

@Component({
  selector: 'app-profile-view',
  standalone: false,
  templateUrl: './profile-view.component.html',
  styleUrls: ['./profile-view.component.scss'],
})
export class ProfileViewComponent implements OnInit, OnDestroy {
  user:       User | null     = null;
  userStats:  UserStats | null = null;
  isOwnProfile = false;
  isLoading    = true;
  error:       string | null  = null;

  userRole:            UserRole         = UserRole.USER;
  recentContributions: ProfileRecentWord[] = [];

  private subscriptions = new Subscription();

  constructor(
    private profileService:  ProfileService,
    private authService:     AuthService,
    private adminApiService: AdminApiService,
    private route:           ActivatedRoute,
    private router:          Router
  ) {}

  // ===== GETTERS DE RÔLE =====

  get isUser():        boolean { return this.userRole === UserRole.USER; }
  get isContributor(): boolean { return this.userRole === UserRole.CONTRIBUTOR; }
  get isAdmin():       boolean { return this.userRole === UserRole.ADMIN; }
  get isSuperAdmin():  boolean { return this.userRole === UserRole.SUPERADMIN; }
  get hasAdminAccess(): boolean { return this.isAdmin || this.isSuperAdmin; }

  // ===== LIFECYCLE =====

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const username = params['username'];
      if (username) {
        this.loadUserProfile(username);
      } else {
        this.loadOwnProfile();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== CHARGEMENT =====

  private loadOwnProfile(): void {
    this.isOwnProfile = true;
    this.isLoading    = true;

    const profileSub = this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.user = profile;
        this.userStats = {
          totalWordsAdded:     (profile as any).totalWordsAdded     || 0,
          totalCommunityPosts: (profile as any).totalCommunityPosts || 0,
          favoriteWordsCount:  (profile as any).favoriteWords?.length || 0,
          joinDate:            (profile as any).createdAt            || new Date(),
        };
        // Détecter le rôle
        this.userRole = (this.user?.role as UserRole) ?? UserRole.USER;
        this.isLoading = false;

        // Charger les soumissions récentes pour contributor+
        if (this.isContributor || this.hasAdminAccess) {
          this._loadRecentContributions();
        }
      },
      error: () => {
        this.error    = 'Erreur lors du chargement du profil';
        this.isLoading = false;
      },
    });

    this.subscriptions.add(profileSub);
  }

  private loadUserProfile(username: string): void {
    this.isOwnProfile = false;
    this.isLoading    = true;

    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.username === username) {
      this.loadOwnProfile();
      return;
    }

    const profileSub = this.profileService.getUserByUsername(username).subscribe({
      next: (user) => {
        this.user      = user;
        this.isLoading = false;
      },
      error: () => {
        this.error    = 'Utilisateur non trouvé';
        this.isLoading = false;
      },
    });

    this.subscriptions.add(profileSub);
  }

  private _loadRecentContributions(): void {
    const sub = this.adminApiService.getContributorDashboard().pipe(
      catchError(() => of(null))
    ).subscribe((dashboard) => {
      if (!dashboard) return;
      this.recentContributions = (dashboard.myRecentWords ?? []).map((w: any) => ({
        word:     w.word     || '',
        language: w.language || '',
        status:   w.status   || 'pending',
      }));
    });
    this.subscriptions.add(sub);
  }

  // ===== MÉTHODES PUBLIQUES =====

  editProfile(): void {
    this.router.navigate(['/profile/edit']);
  }

  getJoinDate(): string {
    if (!this.userStats?.joinDate) return '';
    return new Date(this.userStats.joinDate).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long',
    });
  }

  getLanguageDisplayName(code: string): string {
    const languages: Record<string, string> = {
      fr: 'Français', en: 'Anglais',  es: 'Espagnol',
      de: 'Allemand', it: 'Italien',  pt: 'Portugais',
    };
    return languages[code] || code;
  }

  getInitials(): string {
    if (!this.user?.username) return '';
    return this.user.username.charAt(0).toUpperCase();
  }

  /** Utilisé pour le profil public (vue simplifiée) */
  get canProposeLanguages(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return !!(currentUser?.role && ['contributor', 'admin', 'superadmin'].includes(currentUser.role));
  }
}
