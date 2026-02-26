import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { HomeDataService } from '../../services/home-data.service';

// Seuils à partir desquels la preuve sociale est affichée
// La section reste invisible tant que ces seuils ne sont pas tous atteints
const THRESHOLDS = {
  words: 500,
  languages: 10,
  users: 100,
};

interface SocialStats {
  words: number;
  languages: number;
  users: number;
}

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
  standalone: false
})
export class LandingPageComponent implements OnInit, OnDestroy {

  // Stats affichées — null = chargement en cours ou seuils non atteints
  stats: SocialStats | null = null;

  private partialStats: SocialStats = { words: 0, languages: 0, users: 0 };
  private loadedCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private dictionaryService: DictionaryService,
    private homeDataService: HomeDataService,
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Vérifie si tous les seuils sont atteints et affiche la section
  private onStatLoaded(partial: Partial<SocialStats>): void {
    this.partialStats = { ...this.partialStats, ...partial };
    this.loadedCount++;

    // Attendre que les 3 appels soient terminés (succès ou échec)
    if (this.loadedCount < 3) return;

    const { words, languages, users } = this.partialStats;
    const allThresholdsMet =
      words >= THRESHOLDS.words &&
      languages >= THRESHOLDS.languages &&
      users >= THRESHOLDS.users;

    // Afficher uniquement si les vraies données dépassent les seuils
    this.stats = allThresholdsMet ? this.partialStats : null;
  }

  private loadStats(): void {
    // Nombre de mots approuvés
    this.dictionaryService.getWordsStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.onStatLoaded({ words: data.totalApprovedWords }),
        error: () => this.onStatLoaded({ words: 0 }),
      });

    // Nombre de langues actives
    this.homeDataService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.onStatLoaded({ languages: data.languages }),
        error: () => this.onStatLoaded({ languages: 0 }),
      });

    // Nombre de contributeurs actifs
    this.dictionaryService.getOnlineContributorsStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.onStatLoaded({ users: data.onlineContributors }),
        error: () => this.onStatLoaded({ users: 0 }),
      });
  }

  formatStat(num: number): string {
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K+';
    return num + '+';
  }

  // Navigation
  onLoginClick(): void { this.router.navigate(['/auth/login']); }
  onSignupClick(): void { this.router.navigate(['/auth/register']); }
  onExploreClick(): void { this.router.navigate(['/dictionary']); }
  onCommunityClick(): void { this.router.navigate(['/communities']); }
  onMessagingClick(): void { this.router.navigate(['/messaging']); }
}
