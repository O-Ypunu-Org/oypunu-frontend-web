/**
 * @fileoverview Composant de liste des catégories
 *
 * Composant responsable de l'affichage de la liste des catégories avec
 * fonctionnalités de tri, recherche, sélection et actions.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';

import { CategoryAdmin } from '../../models/admin.models';

/**
 * Interface pour la pagination
 */
export interface PaginationInfo {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
}

/**
 * Interface pour le tri
 */
export interface SortConfig {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * Composant de liste des catégories avec fonctionnalités avancées
 */
@Component({
  selector: 'app-category-list',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss'],
})
export class CategoryListComponent implements OnInit, OnChanges {
  // Données d'entrée
  @Input() categories: CategoryAdmin[] | null = null;
  @Input() pagination: PaginationInfo | null = null;
  @Input() isLoading: boolean = false;
  @Input() selectedCategories: string[] = [];

  // Événements de sortie
  @Output() categoryEdit = new EventEmitter<CategoryAdmin>();
  @Output() categoryDelete = new EventEmitter<CategoryAdmin>();
  @Output() categoryToggleActive = new EventEmitter<CategoryAdmin>();
  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() sortChange = new EventEmitter<SortConfig>();

  // État local
  currentSort: SortConfig | null = null;

  ngOnInit(): void {
    console.log('📋 CategoryListComponent - Initialisation');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories'] && changes['categories'].currentValue) {
      console.log('📋 Catégories mises à jour:', this.categories?.length);
    }
  }

  // ===== PROPRIÉTÉS CALCULÉES =====

  /**
   * Nombre total de catégories
   */
  get totalCategories(): number {
    return this.categories?.length || 0;
  }

  /**
   * Nombre de catégories actives
   */
  get activeCategories(): number {
    return this.categories?.filter((cat) => cat.isActive).length || 0;
  }

  /**
   * Nombre de catégories inactives
   */
  get inactiveCategories(): number {
    return this.categories?.filter((cat) => !cat.isActive).length || 0;
  }

  /**
   * Nombre de catégories sélectionnées
   */
  get selectedCount(): number {
    return this.selectedCategories.length;
  }

  /**
   * Toutes les catégories sont-elles sélectionnées ?
   */
  get allSelected(): boolean {
    if (!this.categories || this.categories.length === 0) return false;
    return this.categories.every((cat) =>
      this.selectedCategories.includes(cat.id)
    );
  }

  /**
   * Certaines catégories sont-elles sélectionnées ?
   */
  get someSelected(): boolean {
    return this.selectedCount > 0 && !this.allSelected;
  }

  // ===== GESTION DE LA SÉLECTION =====

  /**
   * Vérifie si une catégorie est sélectionnée
   */
  isSelected(categoryId: string): boolean {
    return this.selectedCategories.includes(categoryId);
  }

  /**
   * Basculer la sélection d'une catégorie
   */
  onToggleSelection(categoryId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    let newSelection: string[];

    if (target.checked) {
      newSelection = [...this.selectedCategories, categoryId];
    } else {
      newSelection = this.selectedCategories.filter((id) => id !== categoryId);
    }

    console.log('✅ Sélection basculée:', categoryId, target.checked);
    this.selectionChange.emit(newSelection);
  }

  /**
   * Basculer la sélection globale
   */
  onToggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    let newSelection: string[];

    if (target.checked && this.categories) {
      newSelection = this.categories.map((cat) => cat.id);
    } else {
      newSelection = [];
    }

    console.log('✅ Sélection globale:', target.checked);
    this.selectionChange.emit(newSelection);
  }

  // ===== GESTION DES ACTIONS =====

  /**
   * Modifier une catégorie
   */
  onEdit(category: CategoryAdmin): void {
    console.log('✏️ Modification de catégorie:', category.name);
    this.categoryEdit.emit(category);
  }

  /**
   * Supprimer une catégorie
   */
  onDelete(category: CategoryAdmin): void {
    console.log('🗑️ Suppression de catégorie:', category.name);
    this.categoryDelete.emit(category);
  }

  /**
   * Basculer le statut actif d'une catégorie
   */
  onToggleActive(category: CategoryAdmin): void {
    console.log('🔄 Toggle statut actif:', category.name);
    this.categoryToggleActive.emit(category);
  }

  /**
   * Actions en lot - Activation
   */
  onBulkActivate(): void {
    console.log('🔢 Activation en lot:', this.selectedCategories);
    // Émettre un événement personnalisé pour les actions en lot
    // ou déléguer au container parent
  }

  /**
   * Actions en lot - Désactivation
   */
  onBulkDeactivate(): void {
    console.log('🔢 Désactivation en lot:', this.selectedCategories);
    // Émettre un événement personnalisé pour les actions en lot
    // ou déléguer au container parent
  }

  // ===== GESTION DE LA PAGINATION =====

  /**
   * Changer de page
   */
  onPageChange(page: number): void {
    if (this.pagination && page >= 1 && page <= this.pagination.totalPages) {
      console.log('📄 Changement de page:', page);
      this.pageChange.emit(page);
    }
  }

  /**
   * Génère les numéros de page à afficher
   */
  getPageNumbers(): number[] {
    if (!this.pagination) return [];

    const current = this.pagination.page;
    const total = this.pagination.totalPages;
    const delta = 2; // Pages à afficher de chaque côté

    const range: number[] = [];
    const rangeWithDots: number[] = [];

    for (
      let i = Math.max(2, current - delta);
      i <= Math.min(total - 1, current + delta);
      i++
    ) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, -1); // -1 représente les points de suspension
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
      rangeWithDots.push(-1, total);
    } else {
      rangeWithDots.push(total);
    }

    return rangeWithDots.filter((page) => page > 0); // Enlever les points de suspension pour l'instant
  }

  // ===== GESTION DU TRI =====

  /**
   * Trier par colonne
   */
  onSort(field: string): void {
    let direction: 'asc' | 'desc' = 'asc';

    if (this.currentSort?.field === field) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    this.currentSort = { field, direction };
    console.log('🔤 Tri appliqué:', this.currentSort);
    this.sortChange.emit(this.currentSort);
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Fonction de tracking pour ngFor
   */
  trackByFn(index: number, category: CategoryAdmin): string {
    return category.id;
  }

  /**
   * Obtient le nom de la langue d'une catégorie
   */
  getLanguageName(category: CategoryAdmin): string {
    const lang = category.language;
    if (lang) return lang;
    const id = category.languageId;
    if (!id) return '—';
    // Si c'est un ObjectId brut (24 hex), afficher tronqué
    return id.length === 24 ? id.slice(-6) : id;
  }

  /**
   * Formate une date
   */
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.warn('Erreur formatage date:', error);
      return 'Date invalide';
    }
  }
}
