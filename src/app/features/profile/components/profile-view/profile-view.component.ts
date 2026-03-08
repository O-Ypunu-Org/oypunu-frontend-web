import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
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
  avatarError  = false;

  userRole:            UserRole         = UserRole.USER;
  recentContributions: ProfileRecentWord[] = [];
  contributionScore:   number | undefined  = undefined;
  fullStats:           any                 = null;

  private subscriptions = new Subscription();

  constructor(
    private profileService: ProfileService,
    private authService:    AuthService,
    private route:          ActivatedRoute,
    private router:         Router
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
        this.avatarError = false;
        this.userStats = {
          totalWordsAdded:     (profile as any).totalWordsAdded     || 0,
          totalCommunityPosts: (profile as any).totalCommunityPosts || 0,
          favoriteWordsCount:  (profile as any).favoriteWords?.length || 0,
          joinDate:            (profile as any).createdAt            || new Date(),
        };
        // Détecter le rôle
        this.userRole = (this.user?.role as UserRole) ?? UserRole.USER;
        this.isLoading = false;

        // Charger les statistiques complètes
        const statsSub = this.profileService.getUserStats().subscribe({
          next: (stats) => {
            this.fullStats = stats;
            this.contributionScore = (stats as any)?.contributionScore ?? 0;
            // Mettre à jour userStats avec les données réelles de l'API
            if (this.userStats) {
              this.userStats = {
                ...this.userStats,
                totalWordsAdded:     (stats as any).totalWordsAdded     ?? this.userStats.totalWordsAdded,
                totalCommunityPosts: (stats as any).totalCommunityPosts ?? this.userStats.totalCommunityPosts,
                favoriteWordsCount:  (stats as any).favoriteWordsCount  ?? this.userStats.favoriteWordsCount,
              };
            }
          },
          error: () => { /* silencieux */ },
        });
        this.subscriptions.add(statsSub);

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
        this.user        = user;
        this.avatarError = false;
        this.isLoading   = false;
      },
      error: () => {
        this.error    = 'Utilisateur non trouvé';
        this.isLoading = false;
      },
    });

    this.subscriptions.add(profileSub);
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

  getRoleLabel(): string {
    const labels: Record<string, string> = {
      superadmin: 'Super Admin',
      admin: 'Admin',
      contributor: 'Contributeur',
      user: 'Utilisateur',
    };
    return labels[this.user?.role || 'user'] || 'Utilisateur';
  }

  getRoleEmoji(): string {
    const emojis: Record<string, string> = {
      superadmin: '👑',
      admin: '🛡️',
      contributor: '✏️',
      user: '👤',
    };
    return emojis[this.user?.role || 'user'] || '👤';
  }

  getRoleBadgeClass(): string {
    const classes: Record<string, string> = {
      superadmin: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      admin:       'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      contributor: 'bg-green-500/20  text-green-300  border border-green-500/30',
      user:        'bg-gray-600/50   text-gray-300',
    };
    return classes[this.user?.role || 'user'] || 'bg-gray-600/50 text-gray-300';
  }

  get isOnline(): boolean {
    return !!this.user?.isOnline;
  }

  getLocationText(): string {
    const u = this.user as any;
    const city    = u?.city    || '';
    const country = u?.country || '';
    if (city && country) return `${city}, ${country}`;
    if (country) return country;
    if (city)    return city;
    return this.user?.location || '';
  }

  getActivityStatus(): string {
    if (this.isOnline) return 'En ligne';
    const lastActive = this.user?.lastActive || (this.user as any)?.lastLoginAt;
    if (!lastActive) return '';
    const date = new Date(lastActive);
    return 'Actif ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getContributionLevelInfo(): { name: string; icon: string; minScore: number } | null {
    if (this.contributionScore === undefined) return null;
    const levels = [
      { name: 'Débutant',     minScore: 0,     maxScore: 99,       icon: '🌱' },
      { name: 'Apprenti',     minScore: 100,   maxScore: 499,      icon: '🌿' },
      { name: 'Contributeur', minScore: 500,   maxScore: 1999,     icon: '⭐' },
      { name: 'Expert',       minScore: 2000,  maxScore: 4999,     icon: '💎' },
      { name: 'Maître',       minScore: 5000,  maxScore: 9999,     icon: '🏆' },
      { name: 'Légende',      minScore: 10000, maxScore: Infinity, icon: '👑' },
    ];
    return levels.find(l => this.contributionScore! >= l.minScore && this.contributionScore! <= l.maxScore) || null;
  }

  getStatValue(key: string): number {
    return (this.fullStats as any)?.[key] ?? 0;
  }

  formatTimeSpent(): string {
    const minutes = (this.fullStats as any)?.totalTimeSpent ?? 0;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  /** Utilisé pour le profil public (vue simplifiée) */
  get canProposeLanguages(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return !!(currentUser?.role && ['contributor', 'admin', 'superadmin'].includes(currentUser.role));
  }
}
