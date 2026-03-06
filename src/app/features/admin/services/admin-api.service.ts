/**
 * @fileoverview Service API Admin - Intégration des 28 routes admin du backend
 *
 * Service principal pour toutes les interactions avec l'API d'administration.
 * Respecte les principes SOLID avec séparation claire des responsabilités.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  User,
  UserRole,
  UserSuspension,
  UserRoleChange,
  UserFilters,
  PendingWord,
  PendingWordFilters,
  ModerationAction,
  ModerationStatus,
  Community,
  CommunityFilters,
  SystemActivity,
  ActivityFilters,
  DashboardStats,
  ContributorDashboard,
  AdminDashboard,
  SuperAdminDashboard,
  WordRevision,
  RevisionStatistics,
  PaginatedResponse,
  ApiResponse,
  TimePeriod,
  ExportFormat,
  ExportType,
  // Nouveaux types de contenu modérable
  ModerableContentType,
  ReportReason,
  ReportSeverity,
  ReportStatus,
  PendingCommunityPost,
  ReportedPrivateMessage,
  ReportedUserProfile,
  ReportedComment,
  ReportedMediaContent,
  AIFlaggedContent,
  PendingLanguage,
  ModerableContent,
  // Catégories
  CategoryAdmin,
  CreateCategoryData,
  UpdateCategoryData,
  PendingCategory,
} from '../models/admin.models';

/**
 * Service API Admin - Single Responsibility Principle
 *
 * Ce service se concentre uniquement sur les appels API d'administration.
 * Il ne contient aucune logique métier, seulement les interactions HTTP.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminApiService {
  private readonly baseUrl = `${environment.apiUrl}/admin`;
  private readonly retryCount = 2;

  constructor(private readonly http: HttpClient) {}

  // ===== DASHBOARD ENDPOINTS =====

  /**
   * Récupère les statistiques du tableau de bord administrateur
   * GET /admin/dashboard
   */
  getDashboard(): Observable<DashboardStats> {
    return this.http
      .get<ApiResponse<DashboardStats>>(`${this.baseUrl}/dashboard`)
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère le tableau de bord spécialisé pour les contributeurs
   * GET /admin/dashboard/contributor
   */
  getContributorDashboard(): Observable<ContributorDashboard> {
    return this.http
      .get<ApiResponse<ContributorDashboard>>(
        `${this.baseUrl}/dashboard/contributor`
      )
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère le tableau de bord spécialisé pour les administrateurs
   * GET /admin/dashboard/admin
   */
  getAdminDashboard(): Observable<AdminDashboard> {
    return this.http
      .get<ApiResponse<AdminDashboard>>(`${this.baseUrl}/dashboard/admin`)
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère le tableau de bord spécialisé pour les superadministrateurs
   * GET /admin/dashboard/superadmin
   */
  getSuperAdminDashboard(): Observable<SuperAdminDashboard> {
    console.log(
      '📡 AdminApiService - Appel getSuperAdminDashboard, URL:',
      `${this.baseUrl}/dashboard/superadmin`
    );
    return this.http
      .get<SuperAdminDashboard>(`${this.baseUrl}/dashboard/superadmin`)
      .pipe(
        map((response) => {
          console.log(
            '✅ AdminApiService - Réponse getSuperAdminDashboard:',
            response
          );
          return response;
        }),
        retry(this.retryCount),
        catchError((error) => {
          console.error(
            '❌ AdminApiService - Erreur getSuperAdminDashboard:',
            error
          );
          return this.handleError(error);
        })
      );
  }

  // ===== USER MANAGEMENT ENDPOINTS =====

  /**
   * Récupère la liste paginée des utilisateurs avec filtres
   * GET /admin/users
   */
  getUsers(
    page: number = 1,
    limit: number = 20,
    filters?: UserFilters
  ): Observable<PaginatedResponse<User>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.role) {
      params = params.set('role', filters.role);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<any>(`${this.baseUrl}/users`, { params }).pipe(
      map((response) => {
        // Transformer la réponse backend vers l'interface frontend
        const transformedUsers = (response.users || []).map((user: any) => {
          // Dériver le statut depuis les champs booléens du backend
          let status: 'active' | 'suspended' | 'banned';
          if (user.isBanned) {
            status = 'banned';
          } else if (user.isSuspended) {
            status = 'suspended';
          } else if (user.isActive === false) {
            status = 'suspended'; // compte pas encore activé, pas un ban
          } else {
            status = 'active';
          }
          return {
            ...user,
            id: user._id || user.id,
            status,
          };
        });

        const transformedResponse: PaginatedResponse<User> = {
          data: transformedUsers, // Users transformés avec l'alias id
          total: response.total || 0,
          page: response.page || 1,
          limit: response.limit || 20,
          totalPages: response.totalPages || 1,
          hasNextPage: (response.page || 1) < (response.totalPages || 1),
          hasPrevPage: (response.page || 1) > 1,
        };
        return transformedResponse;
      }),
      retry(this.retryCount),
      catchError(this.handleError)
    );
  }

  /**
   * Suspend ou reactive un compte utilisateur
   * PATCH /admin/users/:id/suspension
   */
  toggleUserSuspension(
    userId: string,
    suspensionData: UserSuspension
  ): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(
        `${this.baseUrl}/users/${userId}/suspension`,
        suspensionData
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Modifie le rôle d'un utilisateur (superadmin uniquement)
   * PATCH /admin/users/:id/role
   */
  changeUserRole(
    userId: string,
    roleChange: UserRoleChange
  ): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/users/${userId}/role`, roleChange)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  // ===== WORD MODERATION ENDPOINTS =====

  /**
   * Récupère les mots en attente de modération
   * GET /admin/words/pending
   */
  getPendingWords(
    page: number = 1,
    limit: number = 20,
    filters?: PendingWordFilters
  ): Observable<PaginatedResponse<PendingWord>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.language) {
      params = params.set('language', filters.language);
    }

    return this.http
      .get<any>(`${this.baseUrl}/words/pending`, {
        params,
      })
      .pipe(
        map(response => {
          const currentPage = response.page || page;
          const totalItems = response.total || 0;
          const pageSize = response.limit || limit;
          const totalPagesCount = response.totalPages || Math.ceil(totalItems / pageSize);
          
          return {
            data: response.words?.map((word: any) => ({
              id: word._id,
              _id: word._id,
              word: word.word,
              language: word.language || word.languageId?.name || 'Langue inconnue',
              languageId: word.languageId,
              definition: word.meanings?.[0]?.definitions?.[0]?.definition || word.word,
              meanings: word.meanings || [],
              examples: word.meanings?.flatMap((m: any) => [
                ...(m.examples || []),
                ...(m.definitions?.flatMap((d: any) => d.examples || []) || []),
              ]) || [],
              pronunciation: word.pronunciation,
              audioFiles: word.audioFiles,
              etymology: word.etymology,
              categoryId: word.categoryId,
              translations: word.translations || [],
              status: word.status,
              submittedBy: {
                id: word.createdBy?._id || word.createdBy,
                _id: word.createdBy?._id || word.createdBy,
                username: word.createdBy?.username || 'Utilisateur inconnu',
                email: word.createdBy?.email || '',
                role: word.createdBy?.role || UserRole.USER,
                status: 'active' as const,
                isActive: true,
                createdAt: new Date(word.createdBy?.createdAt || Date.now()),
                updatedAt: new Date(word.createdBy?.updatedAt || Date.now())
              },
              createdBy: {
                id: word.createdBy?._id || word.createdBy,
                _id: word.createdBy?._id || word.createdBy,
                username: word.createdBy?.username || 'Utilisateur inconnu',
                email: word.createdBy?.email || '',
                role: word.createdBy?.role || UserRole.USER,
                status: 'active' as const,
                isActive: true,
                createdAt: new Date(word.createdBy?.createdAt || Date.now()),
                updatedAt: new Date(word.createdBy?.updatedAt || Date.now())
              },
              submittedAt: new Date(word.createdAt),
              createdAt: new Date(word.createdAt),
              moderatedBy: word.moderatedBy ? {
                id: word.moderatedBy._id,
                _id: word.moderatedBy._id,
                username: word.moderatedBy.username,
                email: word.moderatedBy.email || '',
                role: word.moderatedBy.role,
                status: 'active' as const,
                isActive: true,
                createdAt: new Date(word.moderatedBy.createdAt || Date.now()),
                updatedAt: new Date(word.moderatedBy.updatedAt || Date.now())
              } : undefined,
              moderatedAt: word.moderatedAt ? new Date(word.moderatedAt) : undefined,
              moderationReason: word.moderationReason
            })) || [],
            total: totalItems,
            page: currentPage,
            limit: pageSize,
            totalPages: totalPagesCount,
            hasNextPage: currentPage < totalPagesCount,
            hasPrevPage: currentPage > 1
          };
        }),
        retry(this.retryCount), 
        catchError(this.handleError)
      );
  }

  /**
   * Modère un mot en attente (approbation ou rejet)
   * PATCH /admin/words/:id/moderate
   */
  moderateWord(
    wordId: string,
    action: ModerationAction
  ): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/words/${wordId}/moderate`, action)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère les demandes de contributeur en attente
   * GET /contributor-requests
   */
  getPendingContributorRequests(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string;
      priority?: string;
      search?: string;
    }
  ): Observable<PaginatedResponse<any>> {
    let params = new HttpParams();

    // Seulement ajouter les paramètres si ils ne sont pas par défaut
    if (page && page !== 1) {
      params = params.set('page', page.toString());
    }
    if (limit && limit !== 20) {
      params = params.set('limit', limit.toString());
    }

    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.priority) {
      params = params.set('priority', filters.priority);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http
      .get<any>(`${environment.apiUrl}/contributor-requests`, {
        params,
      })
      .pipe(
        map(response => {
          console.log('🤝 Debug - Réponse brute API:', response);
          // Transform the response to match PaginatedResponse interface
          const requests = response.requests || response.data || response || [];
          // Ensure each request has an 'id' property for compatibility
          const normalizedRequests = requests.map((req: any) => ({
            ...req,
            id: req.id || req._id || req.requestId
          }));
          
          return {
            data: normalizedRequests,
            total: response.total || (response.requests ? response.requests.length : 0) || 0,
            page: response.page || page,
            limit: response.limit || limit,
            totalPages: response.totalPages || Math.ceil((response.total || 0) / limit),
            hasNextPage: response.hasNextPage || false,
            hasPrevPage: response.hasPrevPage || page > 1
          };
        }),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Modère une demande de contributeur (approbation ou rejet)
   * PATCH /contributor-requests/:id/review
   */
  moderateContributorRequest(
    requestId: string,
    action: {
      status: 'approved' | 'rejected' | 'under_review';
      reviewNotes?: string;
      rejectionReason?: string;
    }
  ): Observable<ApiResponse> {
    // Transform to match backend DTO format
    const body = {
      status: action.status,
      reviewNotes: action.reviewNotes,
      rejectionReason: action.rejectionReason,
    };

    return this.http
      .patch<ApiResponse>(`${environment.apiUrl}/contributor-requests/${requestId}/review`, body)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  // ===== COMMUNITY MANAGEMENT ENDPOINTS =====

  /**
   * Récupère la liste des communautés avec filtres
   * GET /admin/communities
   */
  getCommunities(
    page: number = 1,
    limit: number = 20,
    filters?: CommunityFilters
  ): Observable<PaginatedResponse<Community>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http
      .get<PaginatedResponse<Community>>(`${this.baseUrl}/communities`, {
        params,
      })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Supprime une communauté de la plateforme
   * DELETE /admin/communities/:id
   */
  deleteCommunity(communityId: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.baseUrl}/communities/${communityId}`)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  // ===== ACTIVITY & LOGS ENDPOINTS =====

  /**
   * Récupère l'activité récente de la plateforme
   * GET /admin/activity
   */
  getRecentActivity(limit: number = 50): Observable<SystemActivity[]> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http
      .get<ApiResponse<SystemActivity[]>>(`${this.baseUrl}/activity`, {
        params,
      })
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== ANALYTICS ENDPOINTS =====

  /**
   * Récupère les analytics détaillées des utilisateurs
   * GET /admin/analytics/users
   */
  getUserAnalytics(period: TimePeriod = '30d'): Observable<any> {
    const params = new HttpParams().set('period', period);

    return this.http
      .get<ApiResponse<any>>(`${this.baseUrl}/analytics/users`, { params })
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les analytics détaillées du contenu
   * GET /admin/analytics/content
   */
  getContentAnalytics(): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.baseUrl}/analytics/content`)
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les analytics détaillées des communautés
   * GET /admin/analytics/communities
   */
  getCommunityAnalytics(): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.baseUrl}/analytics/communities`)
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les métriques système
   * GET /admin/analytics/system
   */
  getSystemMetrics(): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.baseUrl}/analytics/system`)
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère une vue d'ensemble complète des analytics
   * GET /admin/analytics/overview
   */
  getAnalyticsOverview(period: TimePeriod = '30d'): Observable<any> {
    const params = new HttpParams().set('period', period);

    return this.http
      .get<ApiResponse<any>>(`${this.baseUrl}/analytics/overview`, { params })
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les statistiques des langues depuis /languages/stats
   * GET /languages/stats
   */
  getLanguageStatistics(): Observable<any> {
    return this.http
      .get<any>(`${environment.apiUrl}/languages/stats`)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère les statistiques des catégories depuis /categories/stats
   * GET /categories/stats
   */
  getCategoryStatistics(): Observable<any> {
    return this.http
      .get<any>(`${environment.apiUrl}/categories/stats`)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  // ===== REPORTS ENDPOINTS =====

  /**
   * Exporte un rapport détaillé
   * GET /admin/reports/export
   */
  exportReport(
    type: ExportType,
    format: ExportFormat = 'json',
    period: TimePeriod = '30d'
  ): Observable<any> {
    const params = new HttpParams()
      .set('type', type)
      .set('format', format)
      .set('period', period);

    return this.http
      .get<any>(`${this.baseUrl}/reports/export`, { params })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  // ===== PERMISSION VERIFICATION ENDPOINTS =====

  /**
   * Vérifie si un utilisateur est modérateur d'une communauté spécifique
   * GET /admin/permissions/community/:communityId/moderator/:userId
   */
  checkCommunityModerator(
    communityId: string,
    userId?: string
  ): Observable<{ isModerator: boolean; permissions?: string[] }> {
    const url = userId
      ? `${this.baseUrl}/permissions/community/${communityId}/moderator/${userId}`
      : `${this.baseUrl}/permissions/community/${communityId}/moderator`;

    return this.http
      .get<ApiResponse<{ isModerator: boolean; permissions?: string[] }>>(url)
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Vérifie si un utilisateur est l'auteur d'un contenu spécifique
   * GET /admin/permissions/content/:contentId/author/:userId
   */
  checkContentAuthor(
    contentId: string,
    userId?: string
  ): Observable<{ isAuthor: boolean; authorId?: string }> {
    const url = userId
      ? `${this.baseUrl}/permissions/content/${contentId}/author/${userId}`
      : `${this.baseUrl}/permissions/content/${contentId}/author`;

    return this.http
      .get<ApiResponse<{ isAuthor: boolean; authorId?: string }>>(url)
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les informations de rôle d'un utilisateur spécifique
   * GET /admin/permissions/user/:userId/role
   */
  getUserRole(
    userId: string
  ): Observable<{ role: UserRole; canManage: boolean }> {
    return this.http
      .get<ApiResponse<{ role: UserRole; canManage: boolean }>>(
        `${this.baseUrl}/permissions/user/${userId}/role`
      )
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les permissions contextuelles d'un utilisateur
   * GET /admin/permissions/user/:userId/contextual
   */
  getUserContextualPermissions(userId: string): Observable<any[]> {
    return this.http
      .get<ApiResponse<any[]>>(
        `${this.baseUrl}/permissions/user/${userId}/contextual`
      )
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== REVISION MANAGEMENT ENDPOINTS =====

  /**
   * Récupère les révisions en attente de modération
   * GET /admin/revisions/pending
   */
  getPendingRevisions(
    page: number = 1,
    limit: number = 10,
    status?: string,
    userId?: string
  ): Observable<PaginatedResponse<WordRevision>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }
    if (userId) {
      params = params.set('userId', userId);
    }

    return this.http
      .get<PaginatedResponse<WordRevision>>(
        `${this.baseUrl}/revisions/pending`,
        { params }
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Approuve une révision spécifique d'un mot
   * PATCH /admin/revisions/:wordId/:revisionId/approve
   */
  approveRevision(
    wordId: string,
    revisionId: string,
    notes?: string
  ): Observable<ApiResponse> {
    const body = { notes };

    return this.http
      .patch<ApiResponse>(
        `${this.baseUrl}/revisions/${wordId}/${revisionId}/approve`,
        body
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Rejette une révision spécifique d'un mot
   * PATCH /admin/revisions/:wordId/:revisionId/reject
   */
  rejectRevision(
    wordId: string,
    revisionId: string,
    reason?: string
  ): Observable<ApiResponse> {
    const body = { reason };

    return this.http
      .patch<ApiResponse>(
        `${this.baseUrl}/revisions/${wordId}/${revisionId}/reject`,
        body
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère les statistiques détaillées des révisions
   * GET /admin/revisions/statistics
   */
  getRevisionStatistics(
    period: 'week' | 'month' | 'year' = 'month',
    userId?: string
  ): Observable<RevisionStatistics> {
    let params = new HttpParams().set('period', period);

    if (userId) {
      params = params.set('userId', userId);
    }

    return this.http
      .get<ApiResponse<RevisionStatistics>>(
        `${this.baseUrl}/revisions/statistics`,
        { params }
      )
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== MÉTHODES UTILITAIRES PRIVÉES =====

  /**
   * Gestion centralisée des erreurs HTTP
   * Respecte le principe DRY (Don't Repeat Yourself)
   */
  private handleError = (error: any): Observable<never> => {
    console.error('AdminApiService Error:', error);

    let errorMessage = "Une erreur inconnue s'est produite";

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage =
        error.error?.message ||
        `Erreur serveur: ${error.status} ${error.statusText}`;
    }

    return throwError(() => new Error(errorMessage));
  };

  /**
   * Construit les paramètres HTTP de manière type-safe
   */
  private buildHttpParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();

    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return httpParams;
  }

  /**
   * Vérifie si une réponse API est valide
   */
  private isValidApiResponse<T>(response: ApiResponse<T>): boolean {
    return (
      response &&
      typeof response.success === 'boolean' &&
      response.data !== undefined
    );
  }

  // ===== NOUVEAUX ENDPOINTS MODÉRATION ÉTENDUE =====

  /**
   * Récupère tous les types de contenu signalé depuis l'endpoint existant
   * GET /moderation/reported-content
   */
  getAllPendingModerationContent(
    page: number = 1,
    limit: number = 20,
    contentType?: ModerableContentType,
    severity?: ReportSeverity
  ): Observable<PaginatedResponse<ModerableContent>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (contentType) {
      params = params.set(
        'type',
        this.mapContentTypeToBackendType(contentType)
      );
    }
    if (severity) {
      params = params.set('severity', severity);
    }

    // Utiliser l'endpoint existant du backend
    return this.http
      .get<any>(`${environment.apiUrl}/moderation/reported-content`, { params })
      .pipe(
        map((response) => ({
          data: response.reports || [],
          total: response.total || 0,
          page: response.page || 1,
          limit: response.limit || limit,
          totalPages: response.totalPages || 1,
          hasNextPage: (response.page || 1) < (response.totalPages || 1),
          hasPrevPage: (response.page || 1) > 1,
        })),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Convertit les types frontend vers les types backend
   */
  private mapContentTypeToBackendType(
    contentType: ModerableContentType
  ): string {
    switch (contentType) {
      case ModerableContentType.WORD:
        return 'word';
      case ModerableContentType.COMMENT:
        return 'comment';
      case ModerableContentType.USER_PROFILE:
        return 'user';
      case ModerableContentType.LANGUAGE:
        return 'language';
      default:
        return 'all';
    }
  }

  /**
   * Récupère les posts de communauté en attente de modération
   * GET /admin/moderation/community-posts
   */
  getPendingCommunityPosts(
    page: number = 1,
    limit: number = 20
  ): Observable<PaginatedResponse<PendingCommunityPost>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http
      .get<PaginatedResponse<PendingCommunityPost>>(
        `${this.baseUrl}/moderation/community-posts`,
        { params }
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère les messages privés signalés
   * GET /admin/moderation/private-messages
   */
  getReportedPrivateMessages(
    page: number = 1,
    limit: number = 20,
    status?: ReportStatus
  ): Observable<PaginatedResponse<ReportedPrivateMessage>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http
      .get<PaginatedResponse<ReportedPrivateMessage>>(
        `${this.baseUrl}/moderation/private-messages`,
        { params }
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère les profils utilisateurs signalés
   * GET /admin/moderation/user-profiles
   */
  getReportedUserProfiles(
    page: number = 1,
    limit: number = 20,
    severity?: ReportSeverity
  ): Observable<PaginatedResponse<ReportedUserProfile>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (severity) {
      params = params.set('severity', severity);
    }

    return this.http
      .get<PaginatedResponse<ReportedUserProfile>>(
        `${this.baseUrl}/moderation/user-profiles`,
        { params }
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère les commentaires signalés
   * GET /admin/moderation/comments
   */
  getReportedComments(
    page: number = 1,
    limit: number = 20,
    targetType?: 'word' | 'community_post' | 'user_profile'
  ): Observable<PaginatedResponse<ReportedComment>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (targetType) {
      params = params.set('targetType', targetType);
    }

    return this.http
      .get<PaginatedResponse<ReportedComment>>(
        `${this.baseUrl}/moderation/comments`,
        { params }
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère le contenu multimédia signalé
   * GET /admin/moderation/media-content
   */
  getReportedMediaContent(
    page: number = 1,
    limit: number = 20,
    mediaType?: 'image' | 'audio' | 'video' | 'document'
  ): Observable<PaginatedResponse<ReportedMediaContent>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (mediaType) {
      params = params.set('mediaType', mediaType);
    }

    return this.http
      .get<PaginatedResponse<ReportedMediaContent>>(
        `${this.baseUrl}/moderation/media-content`,
        { params }
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère le contenu auto-détecté par IA
   * GET /admin/moderation/ai-flagged
   */
  getAIFlaggedContent(
    page: number = 1,
    limit: number = 20,
    confidence?: number
  ): Observable<PaginatedResponse<AIFlaggedContent>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (confidence) {
      params = params.set('minConfidence', confidence.toString());
    }

    return this.http
      .get<PaginatedResponse<AIFlaggedContent>>(
        `${this.baseUrl}/moderation/ai-flagged`,
        { params }
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Modère un contenu spécifique en utilisant l'endpoint existant
   * PATCH /moderation/reports/:reportId
   */
  moderateContent(
    contentId: string,
    contentType: ModerableContentType,
    action: 'approve' | 'reject' | 'escalate',
    reason?: string,
    notes?: string
  ): Observable<ApiResponse> {
    // Mapper les actions frontend vers les actions backend
    let backendAction: string;
    let newStatus: string | undefined;

    switch (action) {
      case 'approve':
        backendAction = 'approve';
        newStatus = 'resolved';
        break;
      case 'reject':
        backendAction = 'reject';
        newStatus = 'dismissed';
        break;
      case 'escalate':
        backendAction = 'escalate';
        newStatus = 'escalated';
        break;
      default:
        backendAction = 'approve';
        newStatus = 'resolved';
        break;
    }

    const body = {
      action: backendAction,
      reason,
      notes,
      newStatus,
    };

    // Utiliser l'endpoint existant du backend
    return this.http
      .patch<ApiResponse>(
        `${environment.apiUrl}/moderation/reports/${contentId}`,
        body
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Actions de modération en lot pour tous types de contenu
   * PATCH /admin/moderation/bulk
   */
  bulkModerateContent(
    contentIds: string[],
    contentType: ModerableContentType,
    action: 'approve' | 'reject' | 'escalate',
    reason?: string
  ): Observable<ApiResponse> {
    const body = { contentIds, contentType, action, reason };

    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/moderation/bulk`, body)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère les statistiques de modération étendues depuis l'endpoint existant
   * GET /moderation/stats
   */
  getModerationStats(
    timeframe: 'day' | 'week' | 'month' | 'quarter' = 'week'
  ): Observable<{
    overview: {
      totalReports: number;
      pendingReports: number;
      resolvedReports: number;
      averageResolutionTime: number;
    };
    reportsByType: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    moderatorActivity: Array<{
      moderatorId: string;
      username: string;
      actionsCount: number;
      averageResponseTime: number;
    }>;
  }> {
    const params = new HttpParams().set('timeframe', timeframe);

    // Utiliser l'endpoint existant du backend
    return this.http
      .get<any>(`${environment.apiUrl}/moderation/stats`, { params })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère la file d'attente de modération prioritaire
   * GET /admin/moderation/queue
   */
  getModerationQueue(
    limit: number = 10,
    queueType:
      | 'high_priority'
      | 'reported'
      | 'auto_flagged'
      | 'pending_review' = 'high_priority'
  ): Observable<{
    queue: Array<{
      id: string;
      type: ModerableContentType;
      contentId: string;
      priority: ReportSeverity;
      reason: string;
      waitTime: number;
      content: any;
    }>;
    totalInQueue: number;
    averageWaitTime: number;
  }> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('type', queueType);

    return this.http
      .get<ApiResponse<any>>(`${this.baseUrl}/moderation/queue`, { params })
      .pipe(
        map((response) => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== MÉTHODES API MANQUANTES (STUBS TEMPORAIRES) =====

  /**
   * Suspend un utilisateur
   */
  suspendUser(userId: string, reason?: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/users/${userId}/suspension`, {
        suspend: true,
        reason: reason || 'Suspendu par un administrateur',
      })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Réactive un utilisateur
   */
  reactivateUser(userId: string, reason?: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/users/${userId}/suspension`, {
        suspend: false,
        reason: reason || 'Réactivé par un administrateur',
      })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Bannit définitivement un utilisateur
   */
  banUser(userId: string, reason: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/users/${userId}/ban`, { reason })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Lève le bannissement d'un utilisateur (superadmin uniquement)
   */
  unbanUser(userId: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/users/${userId}/unban`, {})
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Met à jour le rôle d'un utilisateur
   */
  updateUserRole(userId: string, role: UserRole): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/users/${userId}/role`, { role })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Supprime un utilisateur (NON IMPLÉMENTÉ CÔTÉ BACKEND)
   */
  deleteUser(userId: string): Observable<ApiResponse> {
    console.warn('⚠️ Endpoint deleteUser non implémenté côté backend');
    return this.http
      .delete<ApiResponse>(`${this.baseUrl}/users/${userId}`)
      .pipe(
        retry(this.retryCount),
        catchError((error) => {
          console.error(
            '❌ Erreur deleteUser (endpoint peut-être manquant):',
            error
          );
          return this.handleError(error);
        })
      );
  }

  /**
   * Suspend plusieurs utilisateurs
   */
  bulkSuspendUsers(userIds: string[]): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/users/bulk/suspend`, { userIds })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Réactive plusieurs utilisateurs
   */
  bulkReactivateUsers(userIds: string[]): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/users/bulk/reactivate`, { userIds })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Supprime plusieurs utilisateurs
   */
  bulkDeleteUsers(userIds: string[]): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.baseUrl}/users/bulk`, { body: { userIds } })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Exporte des utilisateurs
   */
  exportUsers(userIds?: string[]): Observable<string> {
    const body = userIds ? { userIds } : {};
    return this.http
      .post(`${this.baseUrl}/users/export`, body, { responseType: 'text' })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Exporte des mots
   */
  exportWords(wordIds?: string[]): Observable<string> {
    const body = wordIds ? { wordIds } : {};
    return this.http
      .post(`${this.baseUrl}/words/export`, body, { responseType: 'text' })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Actions de modération en lot
   */
  bulkModerateWords(
    wordIds: string[],
    status: any,
    reason?: string
  ): Observable<ApiResponse> {
    const body = { wordIds, status, reason };
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/words/bulk/moderate`, body)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  // ===== LANGUAGE MODERATION ENDPOINTS =====

  /**
   * Récupère les langues en attente de modération
   * GET /languages/admin/pending
   */
  getPendingLanguages(): Observable<PaginatedResponse<PendingLanguage>> {
    console.log(
      '🌍 AdminApiService - Appel getPendingLanguages, URL:',
      `${environment.apiUrl}/languages/admin/pending`
    );

    return this.http
      .get<any>(`${environment.apiUrl}/languages/admin/pending`)
      .pipe(
        map((response) => {
          console.log(
            '🌍 AdminApiService - Réponse getPendingLanguages:',
            response
          );

          // Transformer la réponse backend vers le format frontend
          const transformedLanguages = (response || []).map((lang: any) => ({
            ...lang,
            id: lang._id || lang.id, // Créer l'alias id à partir de _id
            status: this.mapLanguageSystemStatusToModerationStatus(
              lang.systemStatus
            ),
            submittedBy: lang.createdBy, // Alias pour cohérence avec les autres interfaces
            submittedAt: lang.createdAt, // Alias pour cohérence avec les autres interfaces
          }));

          const result = {
            data: transformedLanguages,
            total: transformedLanguages.length,
            page: 1,
            limit: transformedLanguages.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          };

          console.log('🌍 AdminApiService - Langues transformées:', result);
          return result;
        }),
        retry(this.retryCount),
        catchError((error) => {
          console.error(
            '❌ AdminApiService - Erreur getPendingLanguages:',
            error
          );
          return this.handleError(error);
        })
      );
  }

  /**
   * Modère une langue (approbation ou rejet)
   * POST /languages/:id/approve ou POST /languages/:id/reject
   */
  moderateLanguage(
    languageId: string,
    action: 'approve' | 'reject',
    reason?: string,
    notes?: string
  ): Observable<ApiResponse> {
    const endpoint = action === 'approve' ? 'approve' : 'reject';
    const body = { reason, notes };

    return this.http
      .post<ApiResponse>(
        `${environment.apiUrl}/languages/${languageId}/${endpoint}`,
        body
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Convertit le systemStatus des langues vers ModerationStatus
   */
  private mapLanguageSystemStatusToModerationStatus(
    systemStatus: string
  ): ModerationStatus {
    switch (systemStatus) {
      case 'pending_approval':
        return ModerationStatus.PENDING;
      case 'approved':
        return ModerationStatus.APPROVED;
      case 'rejected':
        return ModerationStatus.REJECTED;
      default:
        return ModerationStatus.PENDING;
    }
  }

  // ===== CATEGORY MANAGEMENT ENDPOINTS =====

  /**
   * Récupère toutes les catégories avec filtres
   * GET /categories
   */
  getCategories(
    page: number = 1,
    limit: number = 20,
    languageId?: string
  ): Observable<PaginatedResponse<CategoryAdmin>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (languageId) {
      params = params.set('language', languageId);
    }

    return this.http
      .get<any>(`${environment.apiUrl}/categories`, { params })
      .pipe(
        map((response) => {
          // Si la réponse est un tableau simple, l'encapsuler dans une structure paginée
          if (Array.isArray(response)) {
            const transformedCategories = response.map((cat: any) => ({
              ...cat,
              id: cat._id || cat.id,
            }));

            return {
              data: transformedCategories,
              total: transformedCategories.length,
              page: 1,
              limit: transformedCategories.length,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            };
          }

          // Sinon traiter comme une réponse paginée normale
          const transformedCategories = (
            response.data ||
            response.categories ||
            []
          ).map((cat: any) => ({
            ...cat,
            id: cat._id || cat.id,
          }));

          return {
            data: transformedCategories,
            total: response.total || transformedCategories.length,
            page: response.page || 1,
            limit: response.limit || limit,
            totalPages: response.totalPages || 1,
            hasNextPage: (response.page || 1) < (response.totalPages || 1),
            hasPrevPage: (response.page || 1) > 1,
          };
        }),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère une catégorie par son ID
   * GET /categories/:id
   */
  getCategoryById(categoryId: string): Observable<CategoryAdmin> {
    return this.http
      .get<any>(`${environment.apiUrl}/categories/${categoryId}`)
      .pipe(
        map((response) => ({
          ...response,
          id: response._id || response.id,
        })),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Crée une nouvelle catégorie
   * POST /categories
   */
  createCategory(categoryData: CreateCategoryData): Observable<CategoryAdmin> {
    return this.http
      .post<any>(`${environment.apiUrl}/categories`, categoryData)
      .pipe(
        map((response) => ({
          ...response,
          id: response._id || response.id,
        })),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Met à jour une catégorie existante
   * PATCH /categories/:id
   */
  updateCategory(
    categoryId: string,
    updateData: UpdateCategoryData
  ): Observable<CategoryAdmin> {
    return this.http
      .patch<any>(`${environment.apiUrl}/categories/${categoryId}`, updateData)
      .pipe(
        map((response) => ({
          ...response,
          id: response._id || response.id,
        })),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Supprime une catégorie
   * DELETE /categories/:id
   */
  deleteCategory(categoryId: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${environment.apiUrl}/categories/${categoryId}`)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Récupère les catégories en attente de modération
   * GET /categories/admin/pending
   */
  getPendingCategories(): Observable<PaginatedResponse<PendingCategory>> {
    return this.http
      .get<any>(`${environment.apiUrl}/categories/admin/pending`)
      .pipe(
        map((response) => {
          const transformedCategories = (response || []).map((cat: any) => ({
            ...cat,
            id: cat._id || cat.id,
            status: this.mapCategorySystemStatusToModerationStatus(
              cat.systemStatus || 'pending_approval'
            ),
            submittedBy: cat.createdBy,
            submittedAt: cat.createdAt,
          }));

          return {
            data: transformedCategories,
            total: transformedCategories.length,
            page: 1,
            limit: transformedCategories.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          };
        }),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Modère une catégorie (approbation ou rejet)
   * POST /categories/:id/moderate
   */
  moderateCategory(
    categoryId: string,
    action: 'approve' | 'reject',
    reason?: string,
    notes?: string
  ): Observable<ApiResponse> {
    const body = {
      action,
      moderationNotes: notes,
    };

    return this.http
      .post<ApiResponse>(
        `${environment.apiUrl}/categories/${categoryId}/moderate`,
        body
      )
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Convertit le systemStatus des catégories vers ModerationStatus
   */
  private mapCategorySystemStatusToModerationStatus(
    systemStatus: string
  ): ModerationStatus {
    switch (systemStatus) {
      case 'pending_approval':
        return ModerationStatus.PENDING;
      case 'approved':
        return ModerationStatus.APPROVED;
      case 'rejected':
        return ModerationStatus.REJECTED;
      default:
        return ModerationStatus.PENDING;
    }
  }

  /**
   * Actions de modération en lot pour les catégories
   * PATCH /admin/categories/bulk/moderate
   */
  bulkModerateCategories(
    categoryIds: string[],
    action: 'approve' | 'reject' | 'activate' | 'deactivate' | 'delete',
    reason?: string
  ): Observable<ApiResponse> {
    const body = { categoryIds, action, reason };

    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/categories/bulk/moderate`, body)
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

  /**
   * Exporte les catégories
   * GET /admin/categories/export
   */
  exportCategories(categoryIds?: string[]): Observable<string> {
    const body = categoryIds ? { categoryIds } : {};
    return this.http
      .post(`${this.baseUrl}/categories/export`, body, { responseType: 'text' })
      .pipe(retry(this.retryCount), catchError(this.handleError));
  }

}
