/**
 * @fileoverview Composant présentationnel Moderation Categories - SOLID Principles
 *
 * Composant pur qui affiche les catégories de modération avec navigation et statistiques.
 * Ne contient aucune logique métier, uniquement la présentation.
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
  ChangeDetectionStrategy,
} from '@angular/core';

import {
  ModerableContentType,
  ReportSeverity,
  PendingWord,
  PendingCommunityPost,
  ReportedPrivateMessage,
  ReportedUserProfile,
  ReportedComment,
  ReportedMediaContent,
  AIFlaggedContent,
} from '../../models/admin.models';
import { IconName } from '../../../../shared/components/icon/icon-registry';

/**
 * Interface pour les statistiques par catégorie
 */
export interface ModerationCategoryStats {
  readonly contentType: ModerableContentType;
  readonly label: string;
  readonly icon: IconName;
  readonly color: string;
  readonly totalCount: number;
  readonly pendingCount: number;
  readonly priorityCount: number;
  readonly averageWaitTime: number; // en minutes
  readonly lastUpdate: Date;
}

/**
 * Interface pour la navigation entre catégories
 */
export interface CategoryNavigationEvent {
  readonly contentType: ModerableContentType;
  readonly filters?: {
    readonly severity?: ReportSeverity;
    readonly priority?: boolean;
  };
}

/**
 * Composant ModerationCategories - Single Responsibility Principle
 *
 * Responsabilité unique : Afficher les catégories de modération avec leurs statistiques
 */
@Component({
  selector: 'app-moderation-categories',
  standalone: false,
  templateUrl: './moderation-categories.component.html',
  styleUrls: ['./moderation-categories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationCategoriesComponent {
  // ===== INPUTS =====

  @Input() categories: ModerationCategoryStats[] = [];
  @Input() selectedCategory: ModerableContentType | null = null;
  @Input() isLoading: boolean = false;
  @Input() errorMessage: string | null = null;

  // ===== OUTPUTS =====

  @Output() categorySelected = new EventEmitter<CategoryNavigationEvent>();
  @Output() refreshRequested = new EventEmitter<void>();
  @Output() priorityQueueRequested = new EventEmitter<ModerableContentType>();

  // ===== PROPRIÉTÉS INTERNES =====

  public readonly defaultCategories: Omit<
    ModerationCategoryStats,
    | 'totalCount'
    | 'pendingCount'
    | 'priorityCount'
    | 'averageWaitTime'
    | 'lastUpdate'
  >[] = [
    {
      contentType: ModerableContentType.WORD,
      label: 'Mots',
      icon: 'document-text',
      color: 'bg-blue-500',
    },
    {
      contentType: ModerableContentType.COMMUNITY_POST,
      label: 'Posts Communauté',
      icon: 'chat-bubble-left-right',
      color: 'bg-green-500',
    },
    {
      contentType: ModerableContentType.PRIVATE_MESSAGE,
      label: 'Messages Privés',
      icon: 'envelope',
      color: 'bg-purple-500',
    },
    {
      contentType: ModerableContentType.USER_PROFILE,
      label: 'Profils Utilisateurs',
      icon: 'user',
      color: 'bg-orange-500',
    },
    {
      contentType: ModerableContentType.COMMENT,
      label: 'Commentaires',
      icon: 'chat-bubble-oval-left',
      color: 'bg-yellow-500',
    },
    {
      contentType: ModerableContentType.MEDIA_CONTENT,
      label: 'Contenu Multimédia',
      icon: 'musical-note',
      color: 'bg-pink-500',
    },
    {
      contentType: ModerableContentType.REPORT,
      label: 'IA Auto-détectée',
      icon: 'cpu-chip',
      color: 'bg-red-500',
    },
    {
      contentType: ModerableContentType.LANGUAGE,
      label: 'Langues',
      icon: 'globe-alt',
      color: 'bg-indigo-500',
    },
    {
      contentType: ModerableContentType.CATEGORY,
      label: 'Catégories',
      icon: 'folder',
      color: 'bg-orange-500',
    },
    {
      contentType: ModerableContentType.CONTRIBUTOR_REQUEST,
      label: 'Demandes de Contributeur',
      icon: 'hand-raised',
      color: 'bg-emerald-500',
    },
  ];

  // ===== MÉTHODES PUBLIQUES =====

  /**
   * Gestion de la sélection d'une catégorie
   */
  public onCategorySelect(
    contentType: ModerableContentType,
    priority?: boolean
  ): void {
    const event: CategoryNavigationEvent = {
      contentType,
      filters: priority ? { priority: true } : undefined,
    };
    this.categorySelected.emit(event);
  }

  /**
   * Gestion de la demande de file prioritaire
   */
  public onPriorityQueueSelect(contentType: ModerableContentType): void {
    this.priorityQueueRequested.emit(contentType);
  }

  /**
   * Gestion du rafraîchissement des données
   */
  public onRefresh(): void {
    this.refreshRequested.emit();
  }

  /**
   * Vérifie si une catégorie est sélectionnée
   */
  public isCategorySelected(contentType: ModerableContentType): boolean {
    return this.selectedCategory === contentType;
  }

  /**
   * Obtient les statistiques d'une catégorie ou valeurs par défaut
   */
  public getCategoryStats(
    contentType: ModerableContentType
  ): ModerationCategoryStats {
    const existing = this.categories.find(
      (cat) => cat.contentType === contentType
    );
    const defaultCategory = this.defaultCategories.find(
      (cat) => cat.contentType === contentType
    )!;

    return (
      existing || {
        ...defaultCategory,
        totalCount: 0,
        pendingCount: 0,
        priorityCount: 0,
        averageWaitTime: 0,
        lastUpdate: new Date(),
      }
    );
  }

  /**
   * Obtient la classe CSS pour la priorité
   */
  public getPriorityClass(priorityCount: number): string {
    if (priorityCount === 0) return 'text-gray-500';
    if (priorityCount < 5) return 'text-yellow-500';
    if (priorityCount < 10) return 'text-orange-500';
    return 'text-red-500';
  }

  /**
   * Formate le temps d'attente
   */
  public formatWaitTime(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.round(minutes % 60);

    if (hours < 24) {
      return remainingMins > 0 ? `${hours}h${remainingMins}` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours > 0 ? `${days}j${remainingHours}h` : `${days}j`;
  }

  /**
   * Formate une date relative
   */
  public formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `il y a ${diffMins}min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `il y a ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR');
  }

  /**
   * Obtient l'indicateur de charge de travail
   */
  public getWorkloadIndicator(pendingCount: number): {
    label: string;
    color: string;
  } {
    if (pendingCount === 0) {
      return { label: 'À jour', color: 'text-green-500' };
    }
    if (pendingCount < 10) {
      return { label: 'Faible', color: 'text-yellow-500' };
    }
    if (pendingCount < 50) {
      return { label: 'Modéré', color: 'text-orange-500' };
    }
    return { label: 'Élevé', color: 'text-red-500' };
  }

  /**
   * TrackBy function pour optimiser les performances
   */
  public trackByCategoryType(
    index: number,
    category: ModerationCategoryStats
  ): ModerableContentType {
    return category.contentType;
  }

  /**
   * TrackBy function pour les catégories par défaut
   */
  public trackByDefaultCategory(
    index: number,
    category: Omit<
      ModerationCategoryStats,
      | 'totalCount'
      | 'pendingCount'
      | 'priorityCount'
      | 'averageWaitTime'
      | 'lastUpdate'
    >
  ): ModerableContentType {
    return category.contentType;
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Vérifie s'il y a des éléments en attente
   */
  public hasPendingItems(): boolean {
    return this.categories.some((cat) => cat.pendingCount > 0);
  }

  /**
   * Obtient le total des éléments en attente
   */
  public getTotalPending(): number {
    return this.categories.reduce((total, cat) => total + cat.pendingCount, 0);
  }

  /**
   * Obtient le total des éléments prioritaires
   */
  public getTotalPriority(): number {
    return this.categories.reduce((total, cat) => total + cat.priorityCount, 0);
  }

  /**
   * Obtient la catégorie avec le plus d'éléments en attente
   */
  public getHighestPendingCategory(): ModerationCategoryStats | null {
    if (this.categories.length === 0) return null;

    return this.categories.reduce((highest, current) =>
      current.pendingCount > highest.pendingCount ? current : highest
    );
  }

  /**
   * Vérifie si les données sont récentes (moins de 5 minutes)
   */
  public areStatsRecent(): boolean {
    if (this.categories.length === 0) return false;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.categories.some((cat) => cat.lastUpdate > fiveMinutesAgo);
  }
}
