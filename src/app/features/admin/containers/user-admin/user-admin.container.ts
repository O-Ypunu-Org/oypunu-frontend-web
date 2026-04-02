/**
 * @fileoverview Container pour la gestion des utilisateurs
 *
 * Container intelligent qui gère l'affichage et les actions sur les utilisateurs.
 * Intègre les 7 routes backend de gestion utilisateur.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserManagementTableComponent } from '../../components/user-management/user-management-table.component';
import { DropdownOption } from '../../../../shared/components/custom-dropdown/custom-dropdown.component';
import { Observable, Subject, BehaviorSubject, forkJoin } from 'rxjs';
import {
  takeUntil,
  map,
  catchError,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';

import { Router } from '@angular/router';
import { AdminApiService } from '../../services/admin-api.service';
import { PermissionService } from '../../services/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  User,
  UserRole,
  UserFilters,
  PaginatedResponse,
} from '../../models/admin.models';
import { Permission } from '../../models/permissions.models';
import {
  UserTableAction,
  UserTableSort,
} from '../../components/user-management/user-management-table.component';
import { ConfirmationConfig } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';

/**
 * Interface pour l'état de la gestion utilisateur
 */
interface UserAdminState {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly users: User[];
  readonly totalUsers: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly filters: UserFilters;
  readonly selectedUsers: string[];
  readonly sort: UserTableSort | null;
}

/**
 * Container UserAdmin - Single Responsibility Principle
 */
@Component({
  selector: 'app-user-admin-container',
  standalone: false,
  templateUrl: './user-admin.container.html',
  styleUrls: ['./user-admin.container.scss'],
})
export class UserAdminContainer implements OnInit, OnDestroy {
  readonly roleFilterOptions: DropdownOption[] = [
    { value: '', label: 'Tous les rôles' },
    { value: 'user', label: 'Utilisateur' },
    { value: 'contributor', label: 'Contributeur' },
    { value: 'admin', label: 'Administrateur' },
    { value: 'superadmin', label: 'Super-Administrateur' },
  ];
  readonly statusFilterOptions: DropdownOption[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'active', label: 'Actif' },
    { value: 'suspended', label: 'Suspendu' },
    { value: 'banned', label: 'Banni' },
  ];

  private readonly destroy$ = new Subject<void>();

  // État de la gestion utilisateur
  public readonly userAdminState$: Observable<UserAdminState>;

  private readonly userAdminStateSubject = new BehaviorSubject<UserAdminState>({
    isLoading: true,
    error: null,
    users: [],
    totalUsers: 0,
    currentPage: 1,
    pageSize: 10,
    filters: {},
    selectedUsers: [],
    sort: null,
  });

  // Contrôles de recherche et filtres
  public searchTerm = '';
  private readonly searchSubject = new Subject<string>();

  // Modal de confirmation
  public showConfirmationModal = false;
  public confirmationConfig: ConfirmationConfig = {
    title: '',
    message: '',
  };
  private confirmationAction?: (inputValue?: string) => void;

  // Modal de détails utilisateur
  public showUserDetailsModal = false;
  public userForDetails: User | null = null;

  // Modal de changement de rôle
  public showRoleChangeModal = false;
  public roleChangeUser: User | null = null;
  public availableRoles: { value: UserRole; label: string }[] = [
    { value: UserRole.USER, label: 'Utilisateur' },
    { value: UserRole.CONTRIBUTOR, label: 'Contributeur' },
    { value: UserRole.ADMIN, label: 'Administrateur' },
    { value: UserRole.SUPERADMIN, label: 'Super-Administrateur' },
  ];

  constructor(
    private readonly router: Router,
    private readonly adminApiService: AdminApiService,
    private readonly permissionService: PermissionService,
    private readonly toastService: ToastService
  ) {
    this.userAdminState$ = this.userAdminStateSubject.asObservable();

    // Configuration de la recherche avec debounce
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.updateFilters({ search: searchTerm || undefined });
      });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.userAdminStateSubject.complete();
  }

  /**
   * Charge la liste des utilisateurs
   */
  private loadUsers(): void {
    const currentState = this.userAdminStateSubject.value;

    this.userAdminStateSubject.next({
      ...currentState,
      isLoading: true,
      error: null,
    });

    this.adminApiService
      .getUsers(
        currentState.currentPage,
        currentState.pageSize,
        currentState.filters
      )
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.userAdminStateSubject.next({
            ...currentState,
            isLoading: false,
            error: 'Erreur lors du chargement des utilisateurs',
          });
          throw error;
        })
      )
      .subscribe((response) => {
        this.userAdminStateSubject.next({
          ...currentState,
          isLoading: false,
          error: null,
          users: response.data,
          totalUsers: response.total,
          selectedUsers: [],
        });
      });
  }

  /**
   * Met à jour les filtres et recharge les données
   */
  private updateFilters(newFilters: Partial<UserFilters>): void {
    const currentState = this.userAdminStateSubject.value;
    this.userAdminStateSubject.next({
      ...currentState,
      filters: { ...currentState.filters, ...newFilters },
      currentPage: 1,
      selectedUsers: [],
    });
    this.loadUsers();
  }

  // ===== MÉTHODES PUBLIQUES POUR LE TEMPLATE =====

  /**
   * Gestion de la recherche
   */
  public onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.searchSubject.next(target.value);
  }

  /**
   * Gestion du filtre par rôle
   */
  public onRoleFilterValueChange(value: string): void {
    this.updateFilters({ role: (value as UserRole) || undefined });
  }

  public onStatusFilterValueChange(value: string): void {
    this.updateFilters({ status: (value as 'active' | 'suspended' | 'banned' | '') || undefined });
  }

  public onRoleFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const role = target.value as UserRole | '';
    this.updateFilters({ role: role || undefined });
  }

  /**
   * Gestion du filtre par statut
   */
  public onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const status = target.value as
      | 'active'
      | 'suspended'
      | 'banned'
      | 'all'
      | '';
    this.updateFilters({ status: status || undefined });
  }

  /**
   * Efface tous les filtres
   */
  public clearFilters(): void {
    this.searchTerm = '';
    this.updateFilters({
      search: undefined,
      role: undefined,
      status: undefined,
    });
  }

  /**
   * Vérifie s'il y a des filtres actifs
   */
  public hasActiveFilters(filters: UserFilters): boolean {
    return !!(filters.search || filters.role || filters.status);
  }

  /**
   * Actions sur les utilisateurs
   */
  public viewUserDetails(user: User): void {
    this.userForDetails = user;
    this.showUserDetailsModal = true;
  }

  public closeUserDetails(): void {
    this.showUserDetailsModal = false;
    this.userForDetails = null;
  }

  public editUserFromDetails(): void {
    const user = this.userForDetails;
    this.showUserDetailsModal = false;
    this.userForDetails = null;
    if (user) this.openRoleChangeModal(user.id, user);
  }

  public editUser(user: User): void {
    this.openRoleChangeModal(user.id, user);
  }

  /**
   * Export de tous les utilisateurs
   */
  public exportUsers(): void {
    this.adminApiService
      .exportUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const blob = new Blob([data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.toastService.success('Export réussi', 'Le fichier CSV a été téléchargé.');
        },
        error: () => {
          this.toastService.error("Erreur d'export", "Une erreur est survenue lors de l'export.");
        },
      });
  }

  /**
   * Pagination
   */
  public goToPage(page: number): void {
    const currentState = this.userAdminStateSubject.value;
    this.userAdminStateSubject.next({
      ...currentState,
      currentPage: page,
    });
    this.loadUsers();
  }

  public hasNextPage(state: UserAdminState): boolean {
    return state.currentPage * state.pageSize < state.totalUsers;
  }

  public getTotalPages(state: UserAdminState): number {
    return Math.ceil(state.totalUsers / state.pageSize);
  }

  /**
   * Méthodes utilitaires
   */
  public trackByUserId(index: number, user: User): string {
    return user.id;
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Actif',
      suspended: 'Suspendu',
      banned: 'Banni',
    };
    return labels[status] || status;
  }

  public retryLoad(): void {
    this.loadUsers();
  }

  // ===== MÉTHODES POUR USERHANDLETABLE COMPONENT =====

  /**
   * Gère les actions individuelles sur les utilisateurs
   */
  public handleUserAction(action: UserTableAction): void {
    const userId = action.user.id;
    console.log('🎯 Action reçue:', {
      type: action.type,
      userId,
      payload: action.payload,
    });

    switch (action.type) {
      case 'view':
        this.viewUserDetails(action.user);
        break;
      case 'edit':
        this.editUser(action.user);
        break;
      case 'suspend':
        this.suspendUser(userId);
        break;
      case 'activate':
        this.activateUser(userId);
        break;
      case 'change_role':
        this.openRoleChangeModal(userId, action.user);
        break;
      case 'permissions':
        this.manageUserPermissions(userId);
        break;
      case 'ban':
        this.banUser(userId);
        break;
      case 'unban':
        this.unbanUser(userId);
        break;
      case 'delete':
        this.deleteUser(userId);
        break;
      default:
        console.warn('Action utilisateur non gérée:', action.type);
    }
  }

  /**
   * Gère les actions en lot sur les utilisateurs
   */
  public handleBulkAction(event: { type: string; users: string[] }): void {
    switch (event.type) {
      case 'suspend':
        this.bulkSuspendUsers(event.users);
        break;
      case 'activate':
        this.bulkActivateUsers(event.users);
        break;
      case 'delete':
        this.bulkDeleteUsers(event.users);
        break;
      case 'export':
        this.exportSelectedUsers(event.users);
        break;
      default:
        console.warn('Action en lot non gérée:', event.type);
    }
  }

  /**
   * Gère les changements de sélection des utilisateurs
   */
  public handleSelectionChange(selectedUsers: string[]): void {
    const currentState = this.userAdminStateSubject.value;
    this.userAdminStateSubject.next({
      ...currentState,
      selectedUsers,
    });
  }

  /**
   * Gère les changements de tri
   */
  public handleSortChange(sort: UserTableSort): void {
    const currentState = this.userAdminStateSubject.value;
    this.userAdminStateSubject.next({
      ...currentState,
      sort,
      currentPage: 1, // Reset to first page when sorting changes
    });
    this.loadUsers();
  }

  /**
   * Gère les changements de filtres depuis le tableau
   */
  public handleFilterChange(filters: UserFilters): void {
    this.updateFilters(filters);
  }

  // ===== ACTIONS SPÉCIFIQUES SUR LES UTILISATEURS =====

  private suspendUser(userId: string): void {
    this.confirmationConfig = {
      title: 'Confirmer la suspension',
      message: 'Êtes-vous sûr de vouloir suspendre cet utilisateur ?',
      confirmText: 'Suspendre',
      cancelText: 'Annuler',
      type: 'warning',
      showInput: true,
      inputLabel: 'Raison de la suspension (obligatoire)',
      inputPlaceholder: 'Expliquez pourquoi vous suspendez cet utilisateur...',
      minInputLength: 10,
    };

    this.confirmationAction = (inputValue?: string) => {
      this.adminApiService
        .suspendUser(userId, inputValue || '')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Utilisateur suspendu:', userId);
            this.toastService.success(
              'Utilisateur suspendu',
              "L'utilisateur a été suspendu avec succès."
            );
            this.loadUsers();
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suspension:', error);
            this.toastService.error(
              'Erreur de suspension',
              "Vérifiez que vous avez les permissions nécessaires et que l'utilisateur n'est pas un superadmin."
            );
          },
        });
    };

    this.showConfirmationModal = true;
  }

  private activateUser(userId: string): void {
    this.confirmationConfig = {
      title: 'Confirmer la réactivation',
      message: 'Êtes-vous sûr de vouloir réactiver cet utilisateur ?',
      confirmText: 'Réactiver',
      cancelText: 'Annuler',
      type: 'info',
      showInput: true,
      inputLabel: 'Raison de la réactivation (optionnel)',
      inputPlaceholder: 'Expliquez pourquoi vous réactivez cet utilisateur...',
    };

    this.confirmationAction = (inputValue?: string) => {
      this.adminApiService
        .reactivateUser(userId, inputValue || '')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Utilisateur activé:', userId);
            this.toastService.success(
              'Utilisateur réactivé',
              "L'utilisateur a été réactivé avec succès."
            );
            this.loadUsers();
          },
          error: (error) => {
            console.error("❌ Erreur lors de l'activation:", error);
            this.toastService.error(
              'Erreur de réactivation',
              'Vérifiez que vous avez les permissions nécessaires.'
            );
          },
        });
    };

    this.showConfirmationModal = true;
  }

  private openRoleChangeModal(userId: string, user: User): void {
    this.roleChangeUser = user;
    this.showRoleChangeModal = true;
  }

  public onRoleChangeConfirm(newRole: UserRole): void {
    if (!this.roleChangeUser) return;

    const userId = this.roleChangeUser.id;
    const roleLabels = {
      [UserRole.USER]: 'Utilisateur',
      [UserRole.CONTRIBUTOR]: 'Contributeur',
      [UserRole.ADMIN]: 'Administrateur',
      [UserRole.SUPERADMIN]: 'Super-Administrateur',
    };

    this.confirmationConfig = {
      title: 'Confirmer le changement de rôle',
      message: `Êtes-vous sûr de vouloir changer le rôle de "${this.roleChangeUser.username}" vers "${roleLabels[newRole]}" ?`,
      confirmText: 'Changer le rôle',
      cancelText: 'Annuler',
      type: 'warning',
    };

    this.confirmationAction = (inputValue?: string) => {
      this.adminApiService
        .updateUserRole(userId, newRole)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success(
              'Rôle modifié',
              "Le rôle de l'utilisateur a été modifié avec succès."
            );
            this.loadUsers();
            this.showRoleChangeModal = false;
            this.roleChangeUser = null;
          },
          error: () => {
            this.toastService.error(
              'Erreur de changement de rôle',
              'Vérifiez que vous avez les permissions nécessaires.'
            );
          },
        });
    };

    this.showRoleChangeModal = false;
    this.showConfirmationModal = true;
  }

  public onRoleChangeCancel(): void {
    this.showRoleChangeModal = false;
    this.roleChangeUser = null;
  }

  private manageUserPermissions(userId: string): void {
    this.toastService.warning(
      'Fonctionnalité à venir',
      'La gestion des permissions individuelles sera disponible dans une prochaine version.'
    );
  }

  private banUser(userId: string): void {
    this.confirmationConfig = {
      title: 'Bannir définitivement',
      message:
        'Êtes-vous sûr de vouloir bannir définitivement cet utilisateur ? Il ne pourra plus se connecter avec ce compte.',
      confirmText: 'Bannir définitivement',
      cancelText: 'Annuler',
      type: 'danger',
      showInput: true,
      inputLabel: 'Raison du bannissement (obligatoire)',
      inputPlaceholder: 'Violation grave des conditions d\'utilisation...',
      minInputLength: 10,
    };

    this.confirmationAction = (inputValue?: string) => {
      const reason = inputValue?.trim() || 'Bannissement par un administrateur';
      this.adminApiService
        .banUser(userId, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success(
              'Utilisateur banni',
              "L'utilisateur a été banni définitivement."
            );
            this.loadUsers();
          },
          error: () => {
            this.toastService.error(
              'Erreur de bannissement',
              "Vérifiez que vous avez les permissions nécessaires et que l'utilisateur n'est pas un superadmin."
            );
          },
        });
    };

    this.showConfirmationModal = true;
  }

  private unbanUser(userId: string): void {
    this.confirmationConfig = {
      title: 'Lever le bannissement',
      message:
        "Êtes-vous sûr de vouloir lever le bannissement de cet utilisateur ? Il pourra à nouveau se connecter.",
      confirmText: 'Lever le bannissement',
      cancelText: 'Annuler',
      type: 'warning',
    };

    this.confirmationAction = () => {
      this.adminApiService
        .unbanUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success(
              'Bannissement levé',
              "L'utilisateur peut à nouveau se connecter."
            );
            this.loadUsers();
          },
          error: () => {
            this.toastService.error(
              'Erreur',
              "Seul un super-administrateur peut lever un bannissement."
            );
          },
        });
    };

    this.showConfirmationModal = true;
  }

  private deleteUser(userId: string): void {
    this.confirmationConfig = {
      title: 'Confirmer la suppression',
      message:
        'Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible.',
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger',
      showInput: true,
      inputLabel: 'Raison de la suppression (obligatoire)',
      inputPlaceholder: 'Expliquez pourquoi vous supprimez cet utilisateur...',
      minInputLength: 10,
    };

    this.confirmationAction = () => {
      this.adminApiService
        .deleteUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Utilisateur supprimé', "L'utilisateur a été supprimé.");
            this.loadUsers();
          },
          error: () => {
            this.toastService.error('Non disponible', "La suppression d'utilisateurs n'est pas encore disponible côté backend.");
          },
        });
    };

    this.showConfirmationModal = true;
  }

  // ===== ACTIONS EN LOT =====

  private bulkSuspendUsers(userIds: string[]): void {
    const currentState = this.userAdminStateSubject.value;
    const activeIds = userIds.filter(id => {
      const user = currentState.users.find(u => u.id === id || u._id === id);
      return user?.status === 'active';
    });

    if (activeIds.length === 0) {
      this.toastService.warning('Aucune action', "Aucun des utilisateurs sélectionnés n'est actif.");
      return;
    }

    forkJoin(activeIds.map(id => this.adminApiService.suspendUser(id, 'Suspension en lot')))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Suspension réussie', `${activeIds.length} utilisateur(s) suspendu(s).`);
          this.loadUsers();
        },
        error: () => {
          this.toastService.error('Erreur', 'Erreur lors de la suspension en lot.');
          this.loadUsers();
        },
      });
  }

  private bulkActivateUsers(userIds: string[]): void {
    const currentState = this.userAdminStateSubject.value;
    const suspendedIds = userIds.filter(id => {
      const user = currentState.users.find(u => u.id === id || u._id === id);
      return user?.status === 'suspended' || user?.status === 'banned';
    });

    if (suspendedIds.length === 0) {
      this.toastService.warning('Aucune action', "Aucun des utilisateurs sélectionnés n'est suspendu.");
      return;
    }

    forkJoin(suspendedIds.map(id => this.adminApiService.reactivateUser(id, 'Réactivation en lot')))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Réactivation réussie', `${suspendedIds.length} utilisateur(s) réactivé(s).`);
          this.loadUsers();
        },
        error: () => {
          this.toastService.error('Erreur', 'Erreur lors de la réactivation en lot.');
          this.loadUsers();
        },
      });
  }

  private bulkDeleteUsers(userIds: string[]): void {
    this.adminApiService
      .bulkDeleteUsers(userIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Suppression réussie', `${userIds.length} utilisateur(s) supprimé(s).`);
          this.loadUsers();
        },
        error: () => {
          this.toastService.error('Non disponible', "La suppression en lot n'est pas encore disponible côté backend.");
        },
      });
  }

  private exportSelectedUsers(userIds: string[]): void {
    this.adminApiService
      .exportUsers(userIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Créer et télécharger le fichier CSV
          const blob = new Blob([data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `users-export-${
            new Date().toISOString().split('T')[0]
          }.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error("Erreur lors de l'export:", error);
          this.toastService.error(
            "Erreur d'export",
            "Une erreur est survenue lors de l'export des utilisateurs."
          );
        },
      });
  }

  // ===== MÉTHODES POUR LA MODAL DE CONFIRMATION =====

  /**
   * Confirme l'action de la modal
   */
  public onConfirmAction(inputValue: string): void {
    this.showConfirmationModal = false;
    if (this.confirmationAction) {
      this.confirmationAction(inputValue);
      this.confirmationAction = undefined;
    }
  }

  /**
   * Annule l'action de la modal
   */
  public onCancelAction(): void {
    this.showConfirmationModal = false;
    this.confirmationAction = undefined;
  }

  /**
   * Obtient le libellé d'un rôle
   */
  public getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      [UserRole.USER]: 'Utilisateur',
      [UserRole.CONTRIBUTOR]: 'Contributeur',
      [UserRole.ADMIN]: 'Administrateur',
      [UserRole.SUPERADMIN]: 'Super-Administrateur',
    };
    return labels[role] || role;
  }

  /**
   * Obtient la description d'un rôle
   */
  public getroleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      [UserRole.USER]: 'Accès de base à la plateforme',
      [UserRole.CONTRIBUTOR]: 'Peut contribuer aux contenus',
      [UserRole.ADMIN]: 'Gestion avancée du système',
      [UserRole.SUPERADMIN]: 'Accès complet administrateur',
    };
    return descriptions[role] || '';
  }
}
