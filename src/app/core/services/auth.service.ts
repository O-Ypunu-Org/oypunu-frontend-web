import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { RegisterResponse } from '../models/auth-response';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _API_URL = `${environment.apiUrl}/auth`;
  private _currentUserSubject = new BehaviorSubject<User | null>(null);

  currentUser$ = this._currentUserSubject.asObservable();

  constructor(
    private _http: HttpClient,
    private _router: Router,
  ) {
    this._loadUserFromStorage();
  }

  private _loadUserFromStorage(): void {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const user = localStorage.getItem('user');

    if (token && refreshToken && user) {
      this._currentUserSubject.next(JSON.parse(user));
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this._http
      .post<AuthResponse>(`${this._API_URL}/login`, { email, password })
      .pipe(
        tap((response) => {
          localStorage.setItem('access_token', response.tokens.access_token);
          localStorage.setItem('refresh_token', response.tokens.refresh_token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this._currentUserSubject.next(response.user);
        }),
        catchError((error) => {
          console.error('Login error:', error);
          return throwError(
            () => new Error(error.error?.message || 'Identification échouée'),
          );
        }),
      );
  }

  register(
    username: string,
    email: string,
    password: string,
    nativeLanguage?: string,
    hasAcceptedTerms: boolean = true,
  ): Observable<RegisterResponse> {
    return this._http
      .post<RegisterResponse>(`${this._API_URL}/register`, {
        username,
        email,
        password,
        nativeLanguage,
        hasAcceptedTerms: hasAcceptedTerms,
        hasAcceptedPrivacyPolicy: hasAcceptedTerms, // Les deux sont acceptés via une seule case
      })
      .pipe(
        tap((response) => {
          // Si l'inscription ne nécessite pas de vérification email (cas des réseaux sociaux)
          // ou si les tokens sont présents, on connecte l'utilisateur
          if (
            !response.needsEmailVerification &&
            response.tokens &&
            response.user
          ) {
            localStorage.setItem('token', response.tokens.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
            this._currentUserSubject.next(response.user);
          }
        }),
        catchError((error) => {
          console.error('Registration error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message ||
                  "Une erreur est survenue lors de l'inscription",
              ),
          );
        }),
      );
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this._http
      .get<{ message: string }>(`${this._API_URL}/verify-email/${token}`)
      .pipe(
        catchError((error) => {
          console.error('Email verification error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message || "Erreur de vérification d'email",
              ),
          );
        }),
      );
  }

  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this._http
      .post<{ message: string }>(`${this._API_URL}/resend-verification`, {
        email,
      })
      .pipe(
        catchError((error) => {
          console.error('Resend verification error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message ||
                  "Erreur lors de l'envoi du mail de vérification",
              ),
          );
        }),
      );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this._http
      .post<{ message: string }>(`${this._API_URL}/forgot-password`, {
        email,
      })
      .pipe(
        catchError((error) => {
          console.error('Forgot password error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message ||
                  'Erreur lors de la demande de réinitialisation',
              ),
          );
        }),
      );
  }

  resetPassword(
    token: string,
    password: string,
  ): Observable<{ message: string }> {
    return this._http
      .post<{ message: string }>(`${this._API_URL}/reset-password`, {
        token,
        password,
      })
      .pipe(
        catchError((error) => {
          console.error('Reset password error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message ||
                  'Erreur lors de la réinitialisation du mot de passe',
              ),
          );
        }),
      );
  }

  // Méthodes d'authentification sociale
  // Ces méthodes redirigent vers le provider OAuth.
  // Après l'auth, le backend redirige vers /auth/social-auth-success
  // où le SocialAuthComponent gère la finalisation.

  loginWithGoogle(): Observable<AuthResponse> {
    // Redirection directe vers l'endpoint Google
    window.location.href = `${this._API_URL}/google`;
    // Retourne un Observable qui ne résoudra jamais (la page va changer)
    return new Observable<AuthResponse>();
  }

  loginWithFacebook(): Observable<AuthResponse> {
    window.location.href = `${this._API_URL}/facebook`;
    return new Observable<AuthResponse>();
  }

  loginWithTwitter(): Observable<AuthResponse> {
    window.location.href = `${this._API_URL}/twitter`;
    return new Observable<AuthResponse>();
  }

  logout(): void {
    const refreshToken = localStorage.getItem('refresh_token');

    // Tenter de révoquer le refresh token côté serveur
    if (refreshToken) {
      this._http
        .post(`${this._API_URL}/logout`, { refresh_token: refreshToken })
        .subscribe({
          next: () => console.log('Refresh token révoqué côté serveur'),
          error: (error) =>
            console.warn('Erreur lors de la révocation:', error),
        });
    }

    // Nettoyer le localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this._currentUserSubject.next(null);
    this._router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const user = localStorage.getItem('user');
    return (
      !!token && !!refreshToken && !!user && !!this._currentUserSubject.value
    );
  }

  getToken(): string | null {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }
    // Vérifier si le token est expiré
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        // Token expiré, mais ne pas logout immédiatement
        // L'intercepteur va essayer de le rafraîchir
        return null;
      }
      return token;
    } catch {
      // Token malformé, logout
      this.logout();
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this._currentUserSubject.value;
  }

  getCurrentUserId(): string | null {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  }

  updateCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this._currentUserSubject.next(user);
  }

  /**
   * Récupère les statistiques personnelles de l'utilisateur
   */
  getUserStats(): Observable<{
    totalWordsAdded: number;
    totalCommunityPosts: number;
    favoriteWordsCount: number;
    joinDate: Date;
    streak: number;
    languagesContributed: number;
    languagesExplored: number;
    contributionScore: number;
    activitiesThisWeek: number;
    lastActivityDate?: Date;
  }> {
    return this._http
      .get<any>(`${environment.apiUrl}/users/profile/stats`)
      .pipe(
        catchError((error) => {
          console.error('Erreur lors de la récupération des stats:', error);
          return throwError(
            () => new Error('Erreur lors de la récupération des statistiques'),
          );
        }),
      );
  }

  /**
   * Récupère les contributions récentes de l'utilisateur
   */
  getUserRecentContributions(limit: number = 5): Observable<any> {
    return this._http
      .get<any>(
        `${environment.apiUrl}/users/profile/recent-contributions?limit=${limit}`,
      )
      .pipe(
        catchError((error) => {
          console.error(
            'Erreur lors de la récupération des contributions:',
            error,
          );
          return throwError(
            () => new Error('Erreur lors de la récupération des contributions'),
          );
        }),
      );
  }

  /**
   * Récupère les consultations récentes de l'utilisateur
   */
  getUserRecentConsultations(limit: number = 5): Observable<any> {
    return this._http
      .get<any>(
        `${environment.apiUrl}/users/profile/recent-consultations?limit=${limit}`,
      )
      .pipe(
        catchError((error) => {
          console.error(
            'Erreur lors de la récupération des consultations:',
            error,
          );
          return throwError(
            () => new Error('Erreur lors de la récupération des consultations'),
          );
        }),
      );
  }

  /**
   * Vérifie si l'utilisateur a un rôle minimum requis
   */
  hasMinimumRole(requiredRole: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const roleHierarchy = {
      user: 1,
      contributor: 2,
      admin: 3,
      superadmin: 4,
    };

    const userLevel =
      roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel =
      roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  /**
   * Récupère le refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Rafraîchit les tokens d'accès
   */
  refreshTokens(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('Aucun refresh token disponible'));
    }

    return this._http
      .post<AuthResponse>(`${this._API_URL}/refresh`, {
        refresh_token: refreshToken,
      })
      .pipe(
        tap((response) => {
          // Mettre à jour les tokens dans le localStorage
          localStorage.setItem('access_token', response.tokens.access_token);
          localStorage.setItem('refresh_token', response.tokens.refresh_token);
          console.log('🔄 Tokens rafraîchis avec succès');
        }),
        catchError((error) => {
          console.error('❌ Erreur lors du refresh des tokens:', error);
          // Si le refresh échoue, déconnecter l'utilisateur
          this.logout();
          return throwError(() => new Error('Session expirée'));
        }),
      );
  }

  /**
   * Déconnexion globale - révoque tous les tokens
   */
  logoutAllDevices(): Observable<{ message: string }> {
    return this._http
      .post<{ message: string }>(`${this._API_URL}/logout-all`, {})
      .pipe(
        tap(() => {
          // Après déconnexion globale, nettoyer aussi localement
          this.logout();
        }),
        catchError((error) => {
          console.error('Erreur lors de la déconnexion globale:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message || 'Erreur lors de la déconnexion globale',
              ),
          );
        }),
      );
  }

  /**
   * Vérifie si le token d'accès est expiré
   */
  isTokenExpired(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  /**
   * Vérifie si le refresh token est disponible et valide
   */
  hasValidRefreshToken(): boolean {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    // Vérifier si c'est un JWT et s'il n'est pas expiré
    try {
      const parts = refreshToken.split('.');
      if (parts.length === 3) {
        // C'est un JWT, vérifier l'expiration
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn('[AuthService] 🕐 Refresh token expiré côté client');
          // Nettoyer les tokens expirés
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          this._currentUserSubject.next(null);
          return false;
        }
      }
    } catch (e) {
      // Si ce n'est pas un JWT ou erreur de parsing,
      // on laisse le serveur valider
      console.debug(
        "[AuthService] ⚠️ Impossible de vérifier l'expiration du refresh token côté client",
      );
    }

    return true;
  }
}
