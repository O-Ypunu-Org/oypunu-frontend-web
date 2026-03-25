/**
 * Constantes du module Profil O'Ypunu
 * Source de vérité pour les routes, labels et styles liés au profil utilisateur.
 * Miroir de adminNavigation.ts (mobile) adapté à Angular.
 */

// ===== ROUTES =====

export const PROFILE_ADMIN_ROUTES = {
  dashboard: '/admin/dashboard',
  moderation: '/admin/moderation',
  users: '/admin/users',
  analytics: '/admin/analytics',
  system: '/admin/system',
  manageLanguages: '/admin/languages',
  manageCategories: '/admin/categories',
} as const;

export const PROFILE_ROUTES = {
  favorites: '/favorites',
  dictionary: '/dictionary',
  communities: '/communities',
  addWord: '/dictionary/add',
  editProfile: '/profile/edit',
  contributorRequest: '/contributor-request',
  proposeLanguage: '/languages/add',
  proposeCategory: '/categories/add',
} as const;

// ===== TITRES DE SECTION =====

export const SECTION_TITLES = {
  userActions: 'Actions rapides',
  submissions: 'Soumissions récentes',
  actions: 'Actions',
  administration: 'Administration',
} as const;

// ===== STATUTS DE SOUMISSION =====

export const WORD_STATUS_LABELS: Record<string, string> = {
  approved: 'Approuvé',
  rejected: 'Rejeté',
  pending: 'En attente',
};

/** Classes Tailwind par statut (badge bg + text color) */
export const WORD_STATUS_CLASSES: Record<
  string,
  { badge: string; text: string }
> = {
  approved: { badge: 'bg-green-500/10', text: 'text-green-400' },
  rejected: { badge: 'bg-red-500/10', text: 'text-red-400' },
  pending: { badge: 'bg-yellow-500/10', text: 'text-yellow-400' },
};

// ===== NAVIGATION ADMIN =====

export type AdminNavVariant = 'default' | 'warning';

export interface AdminNavItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  variant?: AdminNavVariant;
}

/** Items de navigation par rôle — miroir de ADMIN_NAV_ITEMS mobile */
export const ADMIN_NAV_ITEMS: Record<'admin' | 'superadmin', AdminNavItem[]> = {
  admin: [
    {
      key: 'dashboard',
      label: 'Tableau de bord',
      icon: '🛡️',
      route: PROFILE_ADMIN_ROUTES.dashboard,
    },
    {
      key: 'languages',
      label: 'Gestion des langues',
      icon: '🌍',
      route: PROFILE_ADMIN_ROUTES.manageLanguages,
    },
    {
      key: 'categories',
      label: 'Gestion des catégories',
      icon: '🏷️',
      route: PROFILE_ADMIN_ROUTES.manageCategories,
    },
  ],
  superadmin: [
    {
      key: 'dashboard',
      label: 'Tableau de bord',
      icon: '🛡️',
      route: PROFILE_ADMIN_ROUTES.dashboard,
    },
    {
      key: 'languages',
      label: 'Gestion des langues',
      icon: '🌍',
      route: PROFILE_ADMIN_ROUTES.manageLanguages,
    },
    {
      key: 'categories',
      label: 'Gestion des catégories',
      icon: '🏷️',
      route: PROFILE_ADMIN_ROUTES.manageCategories,
    },
  ],
};
