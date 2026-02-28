import { Component, Input } from '@angular/core';
import {
  SECTION_TITLES,
  WORD_STATUS_LABELS,
  WORD_STATUS_CLASSES,
  PROFILE_ROUTES,
} from '../../../constants/profile.constants';

/** Mot soumis récemment par le contributeur — isomorphe à myRecentWords mobile. */
export interface ProfileRecentWord {
  word:     string;
  language: string;
  status:   string; // 'approved' | 'rejected' | 'pending'
}

/**
 * Section contributeur — miroir de ContributorSection.tsx (mobile).
 * Affiche les soumissions récentes + les actions rapides.
 */
@Component({
  selector: 'app-contributor-section',
  standalone: false,
  templateUrl: './contributor-section.component.html',
})
export class ContributorSectionComponent {
  @Input() recentWords: ProfileRecentWord[] = [];

  readonly titles  = SECTION_TITLES;
  readonly routes  = PROFILE_ROUTES;

  /** Retourne label + classes Tailwind pour un statut donné. */
  getStatusConfig(status: string): { label: string; badge: string; text: string } {
    const label   = WORD_STATUS_LABELS[status]    ?? status;
    const classes = WORD_STATUS_CLASSES[status]   ?? { badge: 'bg-gray-500/10', text: 'text-gray-400' };
    return { label, ...classes };
  }

  get visibleWords(): ProfileRecentWord[] {
    return this.recentWords.slice(0, 5);
  }
}
