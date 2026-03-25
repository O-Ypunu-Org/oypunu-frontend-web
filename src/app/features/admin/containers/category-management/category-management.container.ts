/**
 * @fileoverview Container pour la gestion des catégories
 *
 * Container principal qui gère l'état, la logique métier et la coordination
 * entre les composants de gestion des catégories.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { map, takeUntil, finalize } from 'rxjs/operators';

import { AdminApiService } from '../../services/admin-api.service';
import {
  CategoryAdmin,
  CreateCategoryData,
  UpdateCategoryData,
  PaginatedResponse,
  ApiResponse,
} from '../../models/admin.models';

/**
 * États de la vue
 */
export type CategoryViewState = 'list' | 'create' | 'edit';

/**
 * Filtres de catégories
 */
export interface CategoryFilters {
  readonly languageId?: string;
  readonly search?: string;
  readonly isActive?: boolean;
}

/**
 * Container principal pour la gestion des catégories
 *
 * Responsabilités:
 * - Gestion de l'état des catégories
 * - Coordination entre les composants enfants
 * - Appels API centralisés
 * - Gestion des erreurs et du loading
 */
@Component({
  selector: 'app-category-management-container',
  standalone: false,
  template: `
    <div class="category-management-container">
      <!-- ===== VUE LISTE ===== -->
      <ng-container *ngIf="(currentView$ | async) === 'list'">
        <!-- HEADER -->
        <div class="container-header">
          <div class="header-content">
            <h1 class="header-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style="color:#C85528;flex-shrink:0"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Gestion des Catégories
            </h1>
            <p class="header-subtitle">
              Créer, modifier et gérer les catégories du dictionnaire O'Ypunu
            </p>
          </div>
          <div class="header-actions">
            <button
              class="btn btn-primary"
              (click)="onCreateCategory()"
              [disabled]="isLoading$ | async"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style="flex-shrink:0"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Nouvelle Catégorie
            </button>
          </div>
        </div>

        <!-- STATS RAPIDES -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">{{ totalCategories$ | async }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-item stat-active">
            <span class="stat-value">{{ activeCategories$ | async }}</span>
            <span class="stat-label">Actives</span>
          </div>
          <div class="stat-item stat-inactive">
            <span class="stat-value">{{ inactiveCategories$ | async }}</span>
            <span class="stat-label">Inactives</span>
          </div>
        </div>

        <!-- FILTRES -->
        <div class="filters-section">
          <app-category-filters
            [filters]="currentFilters$ | async"
            [isLoading]="(isLoading$ | async) || false"
            (filtersChange)="onFiltersChange($event)"
            (reset)="onResetFilters()"
          ></app-category-filters>
        </div>

        <!-- ALERTES -->
        <div
          *ngIf="error$ | async as error"
          class="alert alert-danger"
          role="alert"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{{ error }}</span>
          <button class="btn-close" (click)="clearError()">✕</button>
        </div>
        <div
          *ngIf="successMessage$ | async as message"
          class="alert alert-success"
          role="alert"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{{ message }}</span>
          <button class="btn-close" (click)="clearSuccess()">✕</button>
        </div>

        <!-- CONTENU PRINCIPAL -->
        <div class="main-content">
          <div *ngIf="isLoading$ | async" class="loading-container">
            <div class="spinner-border"></div>
            <p class="loading-text">Chargement des catégories...</p>
          </div>
          <div *ngIf="!(isLoading$ | async)">
            <app-category-list
              [categories]="categories$ | async"
              [pagination]="pagination$ | async"
              [isLoading]="(isLoading$ | async) || false"
              [selectedCategories]="(selectedCategories$ | async) || []"
              (categoryEdit)="onEditCategory($event)"
              (categoryDelete)="onDeleteCategory($event)"
              (categoryToggleActive)="onToggleActiveCategory($event)"
              (selectionChange)="onSelectionChange($event)"
              (pageChange)="onPageChange($event)"
              (sortChange)="onSortChange($event)"
            ></app-category-list>
          </div>
        </div>

        <!-- ACTIONS EN LOT -->
        <div *ngIf="hasSelectedCategories$ | async" class="bulk-actions-bar">
          <span class="selected-count"
            >{{ (selectedCategories$ | async)?.length }} catégorie(s)
            sélectionnée(s)</span
          >
          <div class="bulk-buttons">
            <button
              class="btn btn-outline-success"
              (click)="onBulkActivate()"
              [disabled]="isLoading$ | async"
            >
              Activer
            </button>
            <button
              class="btn btn-outline-warning"
              (click)="onBulkDeactivate()"
              [disabled]="isLoading$ | async"
            >
              Désactiver
            </button>
            <button
              class="btn btn-outline-danger"
              (click)="onBulkDelete()"
              [disabled]="isLoading$ | async"
            >
              Supprimer
            </button>
            <button
              class="btn btn-outline-secondary"
              (click)="onClearSelection()"
            >
              Annuler
            </button>
          </div>
        </div>
      </ng-container>

      <!-- ===== VUE CRÉATION ===== -->
      <ng-container *ngIf="(currentView$ | async) === 'create'">
        <div class="form-view">
          <div class="form-header-back">
            <button class="back-btn" (click)="onCancelCreate()">
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Retour à la liste
            </button>
          </div>
          <div class="form-card">
            <app-category-form
              [isLoading]="(isLoading$ | async) || false"
              (submit)="onCreateSubmit($event)"
              (cancel)="onCancelCreate()"
            ></app-category-form>
          </div>
        </div>
      </ng-container>

      <!-- ===== VUE ÉDITION ===== -->
      <ng-container *ngIf="(currentView$ | async) === 'edit'">
        <div class="form-view">
          <div class="form-header-back">
            <button class="back-btn" (click)="onCancelEdit()">
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Retour à la liste
            </button>
          </div>
          <div class="form-card">
            <app-category-form
              [category]="selectedCategory$ | async"
              [isLoading]="(isLoading$ | async) || false"
              [isEditMode]="true"
              (submit)="onEditSubmit($event)"
              (cancel)="onCancelEdit()"
            ></app-category-form>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styleUrls: ['./category-management.container.scss'],
})
export class CategoryManagementContainer implements OnInit, OnDestroy {
  // Sujets pour la gestion d'état
  private readonly destroy$ = new Subject<void>();
  private readonly _isLoading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _successMessage$ = new BehaviorSubject<string | null>(null);

  // État des catégories
  private readonly _categories$ = new BehaviorSubject<CategoryAdmin[]>([]);
  private readonly _pagination$ = new BehaviorSubject<any>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // État de la vue
  private readonly _currentView$ = new BehaviorSubject<CategoryViewState>(
    'list',
  );
  private readonly _selectedCategory$ =
    new BehaviorSubject<CategoryAdmin | null>(null);
  private readonly _selectedCategories$ = new BehaviorSubject<string[]>([]);
  private readonly _currentFilters$ = new BehaviorSubject<CategoryFilters>({});

  // Observables publics pour les templates
  readonly isLoading$ = this._isLoading$.asObservable();
  readonly error$ = this._error$.asObservable();
  readonly successMessage$ = this._successMessage$.asObservable();
  readonly categories$ = this._categories$.asObservable();
  readonly pagination$ = this._pagination$.asObservable();
  readonly currentView$ = this._currentView$.asObservable();
  readonly selectedCategory$ = this._selectedCategory$.asObservable();
  readonly selectedCategories$ = this._selectedCategories$.asObservable();
  readonly currentFilters$ = this._currentFilters$.asObservable();

  // Observables dérivés
  readonly hasSelectedCategories$ = this._selectedCategories$.pipe(
    map((selected) => selected.length > 0),
  );

  readonly totalCategories$ = this._pagination$.pipe(map((p) => p.total));
  readonly activeCategories$ = this._categories$.pipe(
    map((cats) => cats.filter((c) => c.isActive).length),
  );
  readonly inactiveCategories$ = this._categories$.pipe(
    map((cats) => cats.filter((c) => !c.isActive).length),
  );

  constructor(private adminApiService: AdminApiService) {}

  ngOnInit(): void {
    console.log('🏗️ CategoryManagementContainer - Initialisation');
    this.loadCategories();

    // Surveiller les changements de filtres pour recharger automatiquement
    this._currentFilters$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this._currentView$.value === 'list') {
        this.loadCategories();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== MÉTHODES DE CHARGEMENT =====

  /**
   * Charge les catégories avec filtres et pagination
   */
  private loadCategories(): void {
    console.log('📥 CategoryManagementContainer - Chargement des catégories');

    const currentFilters = this._currentFilters$.value;
    const currentPagination = this._pagination$.value;

    this.setLoading(true);
    this.clearError();

    this.adminApiService
      .getCategories(
        currentPagination.page,
        currentPagination.limit,
        currentFilters.languageId,
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: (response: PaginatedResponse<CategoryAdmin>) => {
          console.log('✅ Catégories chargées:', response);
          this._categories$.next(response.data);
          this._pagination$.next({
            page: response.page,
            limit: response.limit,
            total: response.total,
            totalPages: response.totalPages,
            hasNextPage: response.hasNextPage,
            hasPrevPage: response.hasPrevPage,
          });
        },
        error: (error) => {
          console.error('❌ Erreur chargement catégories:', error);
          this.setError('Erreur lors du chargement des catégories');
        },
      });
  }

  // ===== HANDLERS D'ÉVÉNEMENTS =====

  /**
   * Gestion du changement de filtres
   */
  onFiltersChange(filters: CategoryFilters): void {
    console.log('🔍 Filtres changés:', filters);
    this._currentFilters$.next(filters);
    // Reset de la pagination lors du changement de filtres
    this._pagination$.next({ ...this._pagination$.value, page: 1 });
  }

  /**
   * Reset des filtres
   */
  onResetFilters(): void {
    console.log('🔄 Reset des filtres');
    this._currentFilters$.next({});
  }

  /**
   * Changement de page
   */
  onPageChange(page: number): void {
    console.log('📄 Changement de page:', page);
    this._pagination$.next({ ...this._pagination$.value, page });
    this.loadCategories();
  }

  /**
   * Changement de tri
   */
  onSortChange(sort: { field: string; direction: 'asc' | 'desc' }): void {
    console.log('🔤 Changement de tri:', sort);
    // Implémenter le tri côté client ou server selon les besoins
    this.loadCategories();
  }

  /**
   * Création d'une nouvelle catégorie
   */
  onCreateCategory(): void {
    console.log("➕ Création d'une catégorie");
    this._currentView$.next('create');
    this._selectedCategory$.next(null);
  }

  /**
   * Édition d'une catégorie
   */
  onEditCategory(category: CategoryAdmin): void {
    console.log('✏️ Édition de la catégorie:', category.name);
    this._selectedCategory$.next(category);
    this._currentView$.next('edit');
  }

  /**
   * Suppression d'une catégorie
   */
  onDeleteCategory(category: CategoryAdmin): void {
    console.log('🗑️ Suppression de la catégorie:', category.name);

    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`,
      )
    ) {
      return;
    }

    this.setLoading(true);
    this.adminApiService
      .deleteCategory(category.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: () => {
          this.setSuccessMessage(
            `Catégorie "${category.name}" supprimée avec succès`,
          );
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur suppression:', error);
          this.setError('Erreur lors de la suppression de la catégorie');
        },
      });
  }

  /**
   * Basculer le statut actif d'une catégorie
   */
  onToggleActiveCategory(category: CategoryAdmin): void {
    console.log('🔄 Toggle statut actif:', category.name, !category.isActive);

    const updateData: UpdateCategoryData = {
      isActive: !category.isActive,
    };

    this.setLoading(true);
    this.adminApiService
      .updateCategory(category.id, updateData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: () => {
          const status = !category.isActive ? 'activée' : 'désactivée';
          this.setSuccessMessage(
            `Catégorie "${category.name}" ${status} avec succès`,
          );
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur toggle statut:', error);
          this.setError('Erreur lors de la modification du statut');
        },
      });
  }

  /**
   * Gestion de la sélection multiple
   */
  onSelectionChange(selectedIds: string[]): void {
    console.log('✅ Sélection changée:', selectedIds);
    this._selectedCategories$.next(selectedIds);
  }

  /**
   * Effacer la sélection
   */
  onClearSelection(): void {
    this._selectedCategories$.next([]);
  }

  /**
   * Soumission du formulaire de création
   */
  onCreateSubmit(categoryData: CreateCategoryData | UpdateCategoryData): void {
    console.log('💾 Création de catégorie:', categoryData);

    // Convertir en CreateCategoryData si nécessaire
    const createData: CreateCategoryData = {
      name: categoryData.name || '',
      description: categoryData.description,
      languageId: categoryData.languageId || '',
      order: categoryData.order || 0,
      isActive: categoryData.isActive ?? true,
    };

    this.setLoading(true);
    this.adminApiService
      .createCategory(createData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: (newCategory) => {
          console.log('✅ Catégorie créée:', newCategory);
          this.setSuccessMessage(
            `Catégorie "${newCategory.name}" créée avec succès`,
          );
          this._currentView$.next('list');
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur création:', error);
          this.setError('Erreur lors de la création de la catégorie');
        },
      });
  }

  /**
   * Annulation de la création
   */
  onCancelCreate(): void {
    console.log('❌ Annulation création');
    this._currentView$.next('list');
    this._selectedCategory$.next(null);
  }

  /**
   * Soumission du formulaire d'édition
   */
  onEditSubmit(updateData: CreateCategoryData | UpdateCategoryData): void {
    const currentCategory = this._selectedCategory$.value;
    if (!currentCategory) return;

    console.log('💾 Modification de catégorie:', updateData);

    // Convertir en UpdateCategoryData si nécessaire
    const updateCategoryData: UpdateCategoryData = {
      name: updateData.name,
      description: updateData.description,
      languageId: updateData.languageId,
      order: updateData.order,
      isActive: updateData.isActive,
    };

    this.setLoading(true);
    this.adminApiService
      .updateCategory(currentCategory.id, updateCategoryData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: (updatedCategory) => {
          console.log('✅ Catégorie modifiée:', updatedCategory);
          this.setSuccessMessage(
            `Catégorie "${updatedCategory.name}" modifiée avec succès`,
          );
          this._currentView$.next('list');
          this._selectedCategory$.next(null);
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur modification:', error);
          this.setError('Erreur lors de la modification de la catégorie');
        },
      });
  }

  /**
   * Annulation de l'édition
   */
  onCancelEdit(): void {
    console.log('❌ Annulation édition');
    this._currentView$.next('list');
    this._selectedCategory$.next(null);
  }

  /**
   * Actions en lot - Activation
   */
  onBulkActivate(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('🔢 Activation en lot:', selectedIds);

    if (
      !confirm(`Activer ${selectedIds.length} catégorie(s) sélectionnée(s) ?`)
    ) {
      return;
    }

    this.performBulkAction(
      selectedIds,
      'activate',
      'Catégories activées avec succès',
    );
  }

  /**
   * Actions en lot - Désactivation
   */
  onBulkDeactivate(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('🔢 Désactivation en lot:', selectedIds);

    if (
      !confirm(
        `Désactiver ${selectedIds.length} catégorie(s) sélectionnée(s) ?`,
      )
    ) {
      return;
    }

    this.performBulkAction(
      selectedIds,
      'deactivate',
      'Catégories désactivées avec succès',
    );
  }

  /**
   * Actions en lot - Suppression
   */
  onBulkDelete(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('🔢 Suppression en lot:', selectedIds);

    if (
      !confirm(
        `Supprimer définitivement ${selectedIds.length} catégorie(s) sélectionnée(s) ?`,
      )
    ) {
      return;
    }

    this.performBulkAction(
      selectedIds,
      'delete',
      'Catégories supprimées avec succès',
    );
  }

  /**
   * Actions en lot - Approbation (pour les contributeurs)
   */
  onBulkApprove(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('✅ Approbation en lot:', selectedIds);

    if (
      !confirm(`Approuver ${selectedIds.length} catégorie(s) sélectionnée(s) ?`)
    ) {
      return;
    }

    this.performBulkAction(
      selectedIds,
      'approve',
      'Catégories approuvées avec succès',
    );
  }

  /**
   * Actions en lot - Rejet (pour les contributeurs)
   */
  onBulkReject(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('❌ Rejet en lot:', selectedIds);

    const reason = prompt('Raison du rejet (optionnel):');
    if (reason === null) return; // User cancelled

    if (
      !confirm(`Rejeter ${selectedIds.length} catégorie(s) sélectionnée(s) ?`)
    ) {
      return;
    }

    this.performBulkActionWithReason(
      selectedIds,
      'reject',
      reason,
      'Catégories rejetées avec succès',
    );
  }

  /**
   * Exécute une action en lot
   */
  private performBulkAction(
    categoryIds: string[],
    action: 'activate' | 'deactivate' | 'approve' | 'reject' | 'delete',
    successMessage: string,
  ): void {
    this.setLoading(true);

    this.adminApiService
      .bulkModerateCategories(categoryIds, action)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: () => {
          this.setSuccessMessage(successMessage);
          this._selectedCategories$.next([]);
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur action en lot:', error);
          this.setError(`Erreur lors de l'action en lot`);
        },
      });
  }

  /**
   * Exécute une action en lot avec raison (pour reject)
   */
  private performBulkActionWithReason(
    categoryIds: string[],
    action: 'approve' | 'reject',
    reason: string,
    successMessage: string,
  ): void {
    this.setLoading(true);

    this.adminApiService
      .bulkModerateCategories(categoryIds, action, reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false)),
      )
      .subscribe({
        next: () => {
          this.setSuccessMessage(successMessage);
          this._selectedCategories$.next([]);
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur action en lot avec raison:', error);
          this.setError(`Erreur lors de l'action en lot`);
        },
      });
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Définit l'état de chargement
   */
  private setLoading(loading: boolean): void {
    this._isLoading$.next(loading);
  }

  /**
   * Définit un message d'erreur
   */
  private setError(message: string): void {
    this._error$.next(message);
    this._successMessage$.next(null);
  }

  /**
   * Efface les erreurs
   */
  clearError(): void {
    this._error$.next(null);
  }

  /**
   * Définit un message de succès
   */
  private setSuccessMessage(message: string): void {
    this._successMessage$.next(message);
    this._error$.next(null);
  }

  /**
   * Efface les messages de succès
   */
  clearSuccess(): void {
    this._successMessage$.next(null);
  }
}
