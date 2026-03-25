/**
 * @fileoverview Container pour la gestion des langues (admin)
 *
 * Container principal qui gère l'état, la logique métier et la coordination
 * entre les composants de gestion des langues.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2026-03-24
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';
import {
  map,
  takeUntil,
  finalize,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';
import { FormControl } from '@angular/forms';

import { AdminApiService } from '../../services/admin-api.service';
import {
  LanguageAdmin,
  PaginatedResponse,
} from '../../models/admin.models';

export interface LanguageFilters {
  readonly search?: string;
  readonly isActive?: boolean | null;
}

/**
 * Container principal pour la gestion des langues (admin)
 */
@Component({
  selector: 'app-language-management-container',
  standalone: false,
  templateUrl: './language-management.container.html',
  styleUrls: ['./language-management.container.scss'],
})
export class LanguageManagementContainer implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly _isLoading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _successMessage$ = new BehaviorSubject<string | null>(null);
  private readonly _languages$ = new BehaviorSubject<LanguageAdmin[]>([]);
  private readonly _currentFilters$ = new BehaviorSubject<LanguageFilters>({});

  readonly isLoading$ = this._isLoading$.asObservable();
  readonly error$ = this._error$.asObservable();
  readonly successMessage$ = this._successMessage$.asObservable();
  readonly currentFilters$ = this._currentFilters$.asObservable();

  readonly filteredLanguages$ = this._languages$.pipe(
    map((languages) => {
      const filters = this._currentFilters$.value;
      let result = [...languages];

      if (filters.search && filters.search.trim().length > 0) {
        const q = filters.search.toLowerCase().trim();
        result = result.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.nativeName.toLowerCase().includes(q) ||
            (l.family || '').toLowerCase().includes(q),
        );
      }

      if (filters.isActive !== null && filters.isActive !== undefined) {
        result = result.filter((l) => l.isActive === filters.isActive);
      }

      return result;
    }),
  );

  readonly totalLanguages$ = this._languages$.pipe(map((l) => l.length));
  readonly activeCount$ = this._languages$.pipe(
    map((l) => l.filter((x) => x.isActive).length),
  );
  readonly inactiveCount$ = this._languages$.pipe(
    map((l) => l.filter((x) => !x.isActive).length),
  );

  // Contrôle de recherche pour debounce
  readonly searchControl = new FormControl('');

  constructor(
    private adminApiService: AdminApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadLanguages();

    // Debounce la recherche
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => {
        this._currentFilters$.next({
          ...this._currentFilters$.value,
          search: value || '',
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== CHARGEMENT =====

  private loadLanguages(): void {
    this.setLoading(true);
    this.clearError();

    this.adminApiService
      .getLanguagesAdmin(1, 200)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: (response: PaginatedResponse<LanguageAdmin>) => {
          this._languages$.next(response.data);
        },
        error: () => {
          this.setError('Erreur lors du chargement des langues');
        },
      });
  }

  // ===== FILTRES =====

  onFilterActiveChange(value: 'all' | 'active' | 'inactive'): void {
    let isActive: boolean | null = null;
    if (value === 'active') isActive = true;
    else if (value === 'inactive') isActive = false;

    this._currentFilters$.next({ ...this._currentFilters$.value, isActive });
  }

  onResetFilters(): void {
    this.searchControl.setValue('');
    this._currentFilters$.next({});
  }

  // ===== NAVIGATION =====

  onCreateLanguage(): void {
    this.router.navigate(['/languages/add']);
  }

  onEditLanguage(language: LanguageAdmin): void {
    this.router.navigate(['/languages/edit', language.id]);
  }

  // ===== ACTIONS =====

  onDeleteLanguage(language: LanguageAdmin): void {
    if (
      !confirm(
        `Supprimer définitivement la langue "${language.name}" ?\n\nCette action est irréversible. Impossible si la langue contient des mots.`,
      )
    ) {
      return;
    }

    this.setLoading(true);

    this.adminApiService
      .deleteLanguageAdmin(language.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: () => {
          this.setSuccessMessage(
            `Langue "${language.name}" supprimée avec succès`,
          );
          this.loadLanguages();
        },
        error: (err) => {
          this.setError(
            err.message || 'Erreur lors de la suppression de la langue',
          );
        },
      });
  }

  onToggleStatus(language: LanguageAdmin): void {
    const action = language.isActive ? 'désactiver' : 'activer';
    if (!confirm(`Voulez-vous ${action} la langue "${language.name}" ?`)) {
      return;
    }

    this.setLoading(true);

    this.adminApiService
      .toggleLanguageStatus(language.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: (updated) => {
          const status = updated.isActive ? 'activée' : 'désactivée';
          this.setSuccessMessage(
            `Langue "${updated.name}" ${status} avec succès`,
          );
          this.loadLanguages();
        },
        error: (err) => {
          this.setError(err.message || 'Erreur lors du changement de statut');
        },
      });
  }

  // ===== UTILITAIRES =====

  clearError(): void {
    this._error$.next(null);
  }

  clearSuccess(): void {
    this._successMessage$.next(null);
  }

  private setLoading(loading: boolean): void {
    this._isLoading$.next(loading);
  }

  private setError(message: string): void {
    this._error$.next(message);
    this._successMessage$.next(null);
  }

  private setSuccessMessage(message: string): void {
    this._successMessage$.next(message);
    this._error$.next(null);
    setTimeout(() => this._successMessage$.next(null), 4000);
  }

  trackByFn(_index: number, language: LanguageAdmin): string {
    return language.id;
  }

  getRegionsDisplay(regions: string[]): string {
    if (!regions || regions.length === 0) return '—';
    if (regions.length <= 2) return regions.join(', ');
    return `${regions.slice(0, 2).join(', ')} +${regions.length - 2}`;
  }

  onRecalculateStats(): void {
    this.setLoading(true);
    this.adminApiService
      .recalculateLanguageStats()
      .pipe(takeUntil(this.destroy$), finalize(() => this.setLoading(false)))
      .subscribe({
        next: () => {
          this.setSuccessMessage('Statistiques recalculées avec succès');
          this.loadLanguages();
        },
        error: () => this.setError('Erreur lors du recalcul des statistiques'),
      });
  }
}
