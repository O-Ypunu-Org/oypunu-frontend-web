import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { HomeDataService } from '../../services/home-data.service';
import { RecommendationService } from '../../../../core/services/recommendation.service';
import { RecommendedWord, RecommendationFeedback } from '../../../../core/models/recommendation';
import { UserRole } from '../../../../core/models/admin';
import { ToastService } from '../../../../shared/services/toast.service';
import { IconName } from '../../../../shared/components/icon/icon-registry';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  route: string;
  color: string;
  gradient: string;
}

interface RecentWord {
  id: string;
  word: string;
  language: string;
  viewedAt?: Date;
  createdAt?: Date;
  lastViewedAt?: Date;
  definition: string;
  isFavorite?: boolean;
  isOwner?: boolean;
  viewCount?: number;
}

interface PersonalStats {
  wordsAdded: number;
  favoritesCount: number;
  languagesContributed: number;
  languagesExplored: number;
  contributionScore: number;
  streak: number;
}


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  isLoading = true;

  // Actions rapides - seront initialisées selon le rôle
  quickActions: QuickAction[] = [];

  // Données personnelles
  personalStats: PersonalStats = {
    wordsAdded: 0,
    favoritesCount: 0,
    languagesContributed: 0,
    languagesExplored: 0,
    contributionScore: 0,
    streak: 0
  };

  recentContributions: RecentWord[] = [];
  recentConsultations: RecentWord[] = [];
  // recommendedWords: RecommendedWord[] = [];
  
  // État de l'interface
  showWelcomeAnimation = false;
  showStats = false;
  showRecentWords = false;
  showRecommendations = false;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private dictionaryService: DictionaryService,
    private homeDataService: HomeDataService,
    private recommendationService: RecommendationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.initAnimations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initAnimations(): void {
    setTimeout(() => this.showWelcomeAnimation = true, 100);
    setTimeout(() => this.showStats = true, 300);
    setTimeout(() => this.showRecentWords = true, 500);
    setTimeout(() => this.showRecommendations = true, 700);
  }

  private initQuickActions(user: any): void {
    if (!user) {
      this.quickActions = [];
      return;
    }

    // Actions de base pour tous les utilisateurs connectés
    const baseActions: QuickAction[] = [
      {
        id: 'search',
        title: 'Rechercher',
        description: 'Explorez notre dictionnaire',
        icon: 'magnifying-glass',
        route: '/dictionary',
        color: 'purple',
        gradient: 'from-purple-500 to-blue-500'
      },
      {
        id: 'favorites',
        title: 'Mes favoris',
        description: 'Vos mots sauvegardés',
        icon: 'heart',
        route: '/favorites',
        color: 'red',
        gradient: 'from-red-500 to-pink-500'
      },
      {
        id: 'messaging',
        title: 'Messagerie',
        description: 'Conversations privées',
        icon: 'chat-bubble-left-right',
        route: '/messaging',
        color: 'indigo',
        gradient: 'from-indigo-500 to-purple-500'
      },
      {
        id: 'communities',
        title: 'Communautés',
        description: 'Rejoignez les discussions',
        icon: 'user-group',
        route: '/communities',
        color: 'blue',
        gradient: 'from-blue-500 to-cyan-500'
      }
    ];

    const userRole = user.role as UserRole;

    // Ajouter l'action spécifique selon le rôle
    if (this.hasContributorPermissions(userRole)) {
      // Utilisateur avec permissions de contributeur
      baseActions.splice(1, 0, {
        id: 'add-word',
        title: 'Ajouter un mot',
        description: 'Contribuez à la communauté',
        icon: 'plus',
        route: '/dictionary/add',
        color: 'green',
        gradient: 'from-green-500 to-teal-500'
      });
    } else {
      // Utilisateur normal - proposer de devenir contributeur
      baseActions.splice(1, 0, {
        id: 'become-contributor',
        title: 'Devenir contributeur',
        description: 'Demandez à contribuer',
        icon: 'pencil-square',
        route: '/contributor-request',
        color: 'emerald',
        gradient: 'from-emerald-500 to-green-500'
      });
    }

    this.quickActions = baseActions;
  }

  private hasContributorPermissions(userRole: UserRole): boolean {
    return [UserRole.CONTRIBUTOR, UserRole.ADMIN, UserRole.SUPERADMIN].includes(userRole);
  }

  getContributeAction(): QuickAction {
    return this.quickActions.find(action => 
      action.id === 'add-word' || action.id === 'become-contributor'
    ) || this.quickActions[1];
  }

  getContributeButtonText(): string {
    const userRole = this.currentUser?.role as UserRole;
    return this.hasContributorPermissions(userRole) 
      ? 'Ajouter votre premier mot' 
      : 'Demander à devenir contributeur';
  }

  getContributeButtonClass(): string {
    const userRole = this.currentUser?.role as UserRole;
    return this.hasContributorPermissions(userRole)
      ? 'bg-green-600 hover:bg-green-700'
      : 'bg-emerald-600 hover:bg-emerald-700';
  }

  private loadUserData(): void {
    this.authService.currentUser$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(user => {
          this.currentUser = user;
          this.initQuickActions(user);
          if (user) {
            return forkJoin({
              favorites: this.dictionaryService.getFavoriteWords(1, 5), 
              stats: this.loadPersonalStats(),
              contributions: this.loadRecentContributions(),
              consultations: this.loadRecentConsultations(),
              recommendations: of([])
            });
          }
          return forkJoin({
            favorites: of([]),
            stats: this.getDefaultStats(),
            contributions: of([]),
            consultations: of([]),
            recommendations: of([])
          });
        })
      )
      .subscribe({
        next: (data: any) => {
          this.personalStats = data.stats;
          this.recentContributions = data.contributions || [];
          this.recentConsultations = data.consultations || [];
          // this.recommendedWords = data.recommendations || [];
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.toastService.error('Erreur de chargement', 'Impossible de charger vos données personnelles');
        }
      });
  }

  private loadPersonalStats(): Promise<PersonalStats> {
    // Charger les vraies statistiques depuis l'API
    return this.authService.getUserStats().toPromise().then(stats => {
      if (!stats) {
        throw new Error('Pas de données reçues');
      }
      return {
        wordsAdded: stats.totalWordsAdded || 0,
        favoritesCount: stats.favoriteWordsCount || 0,
        languagesContributed: stats.languagesContributed || 0,
        languagesExplored: stats.languagesExplored || 0,
        contributionScore: stats.contributionScore || 0,
        streak: stats.streak || 0
      };
    }).catch(error => {
      // Fallback en cas d'erreur
      return {
        wordsAdded: 0,
        favoritesCount: 0,
        languagesContributed: 0,
        languagesExplored: 0,
        contributionScore: 0,
        streak: 0
      };
    });
  }

  private loadRecentContributions(): Promise<RecentWord[]> {
    return this.authService.getUserRecentContributions(3).toPromise().then(response => {
      if (!response || !response.contributions) {
        return [];
      }
      return response.contributions.map((contrib: any) => ({
        id: contrib.id,
        word: contrib.word,
        language: contrib.language,
        definition: contrib.definition,
        createdAt: new Date(contrib.createdAt),
        isOwner: contrib.isOwner,
        isFavorite: false // À implémenter avec le système de favoris
      }));
    }).catch(error => {
      return [];
    });
  }

  private loadRecentConsultations(): Promise<RecentWord[]> {
    return this.authService.getUserRecentConsultations(3).toPromise().then(response => {
      if (!response || !response.consultations) {
        return [];
      }
      
      const consultations = response.consultations.map((consult: any) => ({
        id: consult.id,
        word: consult.word,
        language: consult.language,
        definition: consult.definition,
        lastViewedAt: new Date(consult.lastViewedAt),
        viewCount: consult.viewCount,
        isOwner: consult.isOwner,
        isFavorite: false // À implémenter avec le système de favoris
      }));
      
      return consultations;
    }).catch(error => {
      return [];
    });
  }


  private getDefaultStats(): Promise<PersonalStats> {
    return Promise.resolve({
      wordsAdded: 0,
      favoritesCount: 0,
      languagesContributed: 0,
      languagesExplored: 0,
      contributionScore: 0,
      streak: 0
    });
  }

  // Actions
  navigateToAction(action: QuickAction): void {
    this.router.navigate([action.route]);
  }

  viewWord(wordId: string): void {
    this.router.navigate(['/dictionary/word', wordId]);
  }

  toggleFavorite(word: RecentWord): void {
    if (word.isFavorite) {
      this.dictionaryService.removeFromFavorites(word.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          word.isFavorite = false;
          this.personalStats.favoritesCount--;
          this.toastService.success('Supprimé', 'Mot retiré de vos favoris');
        });
    } else {
      this.dictionaryService.addToFavorites(word.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          word.isFavorite = true;
          this.personalStats.favoritesCount++;
          this.toastService.success('Ajouté', 'Mot ajouté à vos favoris');
        });
    }
  }

  getWordDate(word: RecentWord): Date {
    return word.createdAt || word.lastViewedAt || word.viewedAt || new Date();
  }

  exploreRecommendation(word: RecommendedWord): void {
    this.router.navigate(['/dictionary/word', word.id]);
  }

  // Utilitaires
  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours < 1) {
      return `il y a ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `il y a ${diffHours}h`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `il y a ${diffDays}j`;
    }
  }

  getLanguageName(code: string): string {
    const languages: { [key: string]: string } = {
      fr: 'Français',
      en: 'Anglais',
      es: 'Espagnol',
      de: 'Allemand',
      it: 'Italien',
      pt: 'Portugais',
      zu: 'Zoulou',
      da: 'Danois'
    };
    return languages[code] || code.toUpperCase();
  }

  getLanguageFlag(code: string): string {
    const flags: { [key: string]: string } = {
      fr: '🇫🇷',
      en: '🇺🇸',
      es: '🇪🇸',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      zu: '🇿🇦',
      da: '🇩🇰'
    };
    return flags[code] || '🌐';
  }

  getStreakMessage(): string {
    if (this.personalStats.streak >= 7) {
      return `🔥 Incroyable ! ${this.personalStats.streak} jours consécutifs !`;
    } else if (this.personalStats.streak >= 3) {
      return `✨ Super ! ${this.personalStats.streak} jours d'affilée !`;
    } else {
      return `🌱 ${this.personalStats.streak} jour${this.personalStats.streak > 1 ? 's' : ''} de suite`;
    }
  }

  getContributionLevel(): string {
    if (this.personalStats.contributionScore >= 1000) {
      return 'Expert';
    } else if (this.personalStats.contributionScore >= 500) {
      return 'Avancé';
    } else if (this.personalStats.contributionScore >= 100) {
      return 'Intermédiaire';
    } else {
      return 'Débutant';
    }
  }

  getUserGreeting(): string {
    const hour = new Date().getHours();
    const name = this.currentUser?.username || 'ami';
    
    if (hour < 12) {
      return `Bonjour ${name} !`;
    } else if (hour < 18) {
      return `Bon après-midi ${name} !`;
    } else {
      return `Bonsoir ${name} !`;
    }
  }

  // Track functions pour les ngFor
  trackByActionId(index: number, action: QuickAction): string {
    return action.id;
  }

  trackByWordId(index: number, word: RecentWord): string {
    return word.id;
  }

  trackByRecommendationId(index: number, word: RecommendedWord): string {
    return word.id;
  }

  // ======= NOUVELLES MÉTHODES POUR LES RECOMMANDATIONS INTELLIGENTES =======

  /**
   * Gestionnaire pour la sélection d'une recommandation
   */
  onRecommendationSelected(recommendation: RecommendedWord): void {
    // La navigation est déjà gérée par le composant de recommandations
    // On peut ici ajouter des analytics ou d'autres traitements
  }

  /**
   * Gestionnaire pour le feedback sur une recommandation
   */
  onRecommendationFeedback(feedback: RecommendationFeedback): void {
    // Ici on peut mettre à jour l'interface utilisateur
    // ou effectuer d'autres actions basées sur le feedback
    
    switch (feedback.feedbackType) {
      case 'like':
        // Pourrait afficher une notification positive
        break;
      case 'favorite':
        // Pourrait mettre à jour le compteur de favoris
        this.personalStats.favoritesCount++;
        break;
      case 'not_interested':
        // Pourrait logger pour améliorer les futures recommandations
        break;
      case 'view':
        // Pourrait incrémenter des compteurs locaux
        break;
    }
  }
}