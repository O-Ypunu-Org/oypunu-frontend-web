import { Component } from '@angular/core';
import { PROFILE_ROUTES, SECTION_TITLES } from '../../../constants/profile.constants';

/**
 * Section utilisateur standard — miroir de UserSection.tsx (mobile).
 * Affiche uniquement l'action "Devenir contributeur".
 * Composant purement présentationnel, aucun @Input.
 */
@Component({
  selector: 'app-user-section',
  standalone: false,
  templateUrl: './user-section.component.html',
})
export class UserSectionComponent {
  readonly title   = SECTION_TITLES.userActions;
  readonly ctaRoute = PROFILE_ROUTES.contributorRequest;
}
