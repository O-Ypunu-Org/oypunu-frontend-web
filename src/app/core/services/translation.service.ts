import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Translation,
  AvailableLanguage,
  TranslationSuggestion,
  ValidationResult,
  LanguageStats,
  CreateTranslationRequest,
  ValidateTranslationRequest,
  VoteTranslationRequest,
  SearchTranslationRequest,
  TranslationState,
  TranslationNotification,
  LanguageOption,
  LearningInsights,
} from '../models/translation';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private readonly apiUrl = `${environment.apiUrl}/translation`;

  // État global des traductions
  private translationStateSubject = new BehaviorSubject<TranslationState>({
    loading: false,
    error: null,
    translations: [],
    availableLanguages: [],
    suggestions: [],
    selectedLanguage: null,
  });

  // Notifications temps réel
  private notificationSubject =
    new BehaviorSubject<TranslationNotification | null>(null);

  // Cache pour les langues disponibles (optimisation)
  private languageCache = new Map<string, AvailableLanguage[]>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  // Observables publics
  public readonly translationState$ =
    this.translationStateSubject.asObservable();
  public readonly notifications$ = this.notificationSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Récupère les statistiques globales des langues
   */
  getLanguageStats(): Observable<LanguageStats[]> {
    return this.http
      .get<LanguageStats[]>(`${this.apiUrl}/languages`)
      .pipe(
        catchError(this.handleError<LanguageStats[]>('getLanguageStats', [])),
      );
  }

  /**
   * Récupère les langues disponibles pour un mot spécifique
   */
  getAvailableLanguages(wordId: string): Observable<AvailableLanguage[]> {
    // Vérifier le cache d'abord
    const cacheKey = `word_${wordId}`;
    const cached = this.languageCache.get(cacheKey);

    if (cached && this.isCacheValid(cacheKey)) {
      return of(cached);
    }

    this.updateState({ loading: true });

    return this.http
      .get<AvailableLanguage[]>(`${this.apiUrl}/${wordId}/languages`)
      .pipe(
        tap((languages) => {
          // Mettre en cache
          this.languageCache.set(cacheKey, languages);

          // Mettre à jour l'état
          this.updateState({
            loading: false,
            availableLanguages: languages,
            error: null,
          });
        }),
        catchError((error) => {
          this.updateState({
            loading: false,
            error: this.getErrorMessage(error),
          });
          return of([]);
        }),
        shareReplay(1),
      );
  }

  /**
   * Récupère la traduction d'un mot vers une langue spécifique
   */
  getTranslation(
    wordId: string,
    targetLanguage: string,
  ): Observable<Translation[]> {
    this.updateState({ loading: true, selectedLanguage: targetLanguage });

    return this.http
      .get<Translation[]>(`${this.apiUrl}/${wordId}/${targetLanguage}`)
      .pipe(
        tap((translations) => {
          this.updateState({
            loading: false,
            translations,
            error: null,
          });
        }),
        catchError((error) => {
          this.updateState({
            loading: false,
            error: this.getErrorMessage(error),
          });
          return of([]);
        }),
      );
  }

  /**
   * Crée une nouvelle traduction avec détection intelligente
   */
  createTranslation(
    request: CreateTranslationRequest,
  ): Observable<ValidationResult> {
    this.updateState({ loading: true });

    return this.http.post<ValidationResult>(`${this.apiUrl}`, request).pipe(
      tap((result) => {
        this.updateState({ loading: false, error: null });

        // Notifier le succès
        if (result.success) {
          this.showNotification({
            type: 'success',
            message: result.message,
            action: result.action as 'merge' | 'separate' | 'vote' | 'create',
            autoHide: true,
          });

          // Invalider le cache pour ce mot
          this.invalidateWordCache(request.sourceWordId);
        } else if (result.action === 'uncertain') {
          this.showNotification({
            type: 'warning',
            message: result.message,
            action: 'uncertain' as 'merge' | 'separate' | 'vote' | 'create',
            autoHide: false,
          });
        }
      }),
      catchError((error) => {
        this.updateState({
          loading: false,
          error: this.getErrorMessage(error),
        });
        this.showNotification({
          type: 'error',
          message: 'Erreur lors de la création de la traduction',
          details: this.getErrorMessage(error),
          autoHide: true,
        });
        return throwError(error);
      }),
    );
  }

  /**
   * Recherche des suggestions intelligentes
   */
  searchSuggestions(
    request: SearchTranslationRequest,
  ): Observable<TranslationSuggestion[]> {
    this.updateState({ loading: true });

    return this.http
      .post<TranslationSuggestion[]>(`${this.apiUrl}/suggest`, request)
      .pipe(
        tap((suggestions) => {
          this.updateState({
            loading: false,
            suggestions,
            error: null,
          });
        }),
        catchError((error) => {
          this.updateState({
            loading: false,
            error: this.getErrorMessage(error),
          });
          return of([]);
        }),
      );
  }

  /**
   * Valide une traduction (fusion ou séparation)
   */
  validateTranslation(
    translationId: string,
    request: ValidateTranslationRequest,
  ): Observable<ValidationResult> {
    return this.http
      .put<ValidationResult>(
        `${this.apiUrl}/${translationId}/validate`,
        request,
      )
      .pipe(
        tap((result) => {
          this.showNotification({
            type: 'success',
            message: `Traduction ${request.action === 'merge' ? 'fusionnée' : 'séparée'} avec succès`,
            action: request.action as 'merge' | 'separate' | 'vote' | 'create',
            translationId,
            autoHide: true,
          });
        }),
        catchError((error) => {
          this.showNotification({
            type: 'error',
            message: 'Erreur lors de la validation',
            details: this.getErrorMessage(error),
            autoHide: true,
          });
          return throwError(error);
        }),
      );
  }

  /**
   * Vote pour une traduction
   */
  voteForTranslation(
    translationId: string,
    request: VoteTranslationRequest,
  ): Observable<{ success: boolean; newVoteCount: number }> {
    return this.http
      .post<{
        success: boolean;
        newVoteCount: number;
      }>(`${this.apiUrl}/${translationId}/vote`, request)
      .pipe(
        tap((result) => {
          if (result.success) {
            this.showNotification({
              type: 'success',
              message: `Vote ${request.voteValue > 0 ? 'positif' : 'négatif'} enregistré`,
              action: 'vote',
              translationId,
              autoHide: true,
            });

            // Mettre à jour le vote dans l'état local
            this.updateTranslationVote(translationId, result.newVoteCount);
          }
        }),
        catchError((error) => {
          this.showNotification({
            type: 'error',
            message: 'Erreur lors du vote',
            details: this.getErrorMessage(error),
            autoHide: true,
          });
          return throwError(error);
        }),
      );
  }

  // ===== MÉTHODES D'ADMINISTRATION =====

  /**
   * Récupère les insights d'apprentissage (admin)
   */
  getLearningInsights(limit?: number): Observable<LearningInsights> {
    const params = limit
      ? new HttpParams().set('limit', limit.toString())
      : undefined;

    return this.http
      .get<LearningInsights>(`${this.apiUrl}/admin/insights`, { params })
      .pipe(
        catchError(
          this.handleError<LearningInsights>('getLearningInsights', {
            categoryAccuracy: 0,
            semanticAccuracy: 0,
            overallAccuracy: 0,
            recommendedThresholds: {
              autoMerge: 0.8,
              askUser: 0.6,
              autoSeparate: 0.4,
            },
            commonPatterns: [],
          }),
        ),
      );
  }

  /**
   * Met à jour les seuils d'auto-validation (admin)
   */
  updateAutoValidationThresholds(): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http
      .put<{
        success: boolean;
        message: string;
      }>(`${this.apiUrl}/admin/thresholds`, {})
      .pipe(
        tap(() => {
          this.showNotification({
            type: 'success',
            message: "Seuils d'auto-validation mis à jour",
            autoHide: true,
          });
        }),
        catchError((error) => {
          this.showNotification({
            type: 'error',
            message: 'Erreur lors de la mise à jour des seuils',
            autoHide: true,
          });
          return throwError(error);
        }),
      );
  }

  /**
   * Récupère les statistiques de performance (admin)
   */
  getPerformanceStats(days?: number): Observable<{
    totalTranslations: number;
    averageProcessingTime: number;
    successRate: number;
    dailyStats: Array<{
      date: string;
      translations: number;
      averageTime: number;
    }>;
  }> {
    const params = days
      ? new HttpParams().set('days', days.toString())
      : undefined;

    return this.http
      .get<{
        totalTranslations: number;
        averageProcessingTime: number;
        successRate: number;
        dailyStats: Array<{
          date: string;
          translations: number;
          averageTime: number;
        }>;
      }>(`${this.apiUrl}/admin/performance`, { params })
      .pipe(
        catchError(
          this.handleError('getPerformanceStats', {
            totalTranslations: 0,
            averageProcessingTime: 0,
            successRate: 0,
            dailyStats: [],
          }),
        ),
      );
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Convertit un code de langue en option avec nom lisible
   */
  getLanguageOptions(): LanguageOption[] {
    return [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'it', name: 'Italiano', flag: '🇮🇹' },
      { code: 'pt', name: 'Português', flag: '🇵🇹' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      { code: 'ar', name: 'العربية', flag: '🇸🇦' },
      { code: 'zh', name: '中文', flag: '🇨🇳' },
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
      { code: 'ko', name: '한국어', flag: '🇰🇷' },
    ];
  }

  /**
   * Filtre les options de langue par langues disponibles
   */
  filterAvailableLanguageOptions(
    availableLanguages: AvailableLanguage[],
  ): LanguageOption[] {
    const baseOptions = this.getLanguageOptions();
    const baseByCode = new Map(
      baseOptions.map((option) => [option.code, option]),
    );

    // 1) Toujours inclure les langues réellement renvoyées par l'API
    const dynamicOptions: LanguageOption[] = availableLanguages.map((lang) => {
      const base = baseByCode.get(lang.code);
      return {
        code: lang.code,
        name: lang.name || base?.name || lang.code.toUpperCase(),
        flag: base?.flag || '🌍',
        hasTranslations: true,
        translationCount: lang.translationCount || 0,
      };
    });

    // 2) Conserver les options statiques non présentes dans l'API (ajout manuel)
    const dynamicCodes = new Set(dynamicOptions.map((option) => option.code));
    const staticFallbackOptions: LanguageOption[] = baseOptions
      .filter((option) => !dynamicCodes.has(option.code))
      .map((option) => ({
        ...option,
        hasTranslations: false,
        translationCount: 0,
      }));

    return [...dynamicOptions, ...staticFallbackOptions].sort((a, b) => {
      // Langues avec traductions d'abord
      if (a.hasTranslations && !b.hasTranslations) return -1;
      if (!a.hasTranslations && b.hasTranslations) return 1;
      return (b.translationCount || 0) - (a.translationCount || 0);
    });
  }

  /**
   * Efface les notifications
   */
  clearNotifications(): void {
    this.notificationSubject.next(null);
  }

  /**
   * Réinitialise l'état des traductions
   */
  resetTranslationState(): void {
    this.translationStateSubject.next({
      loading: false,
      error: null,
      translations: [],
      availableLanguages: [],
      suggestions: [],
      selectedLanguage: null,
    });
  }

  // ===== MÉTHODES PRIVÉES =====

  private updateState(partialState: Partial<TranslationState>): void {
    const currentState = this.translationStateSubject.value;
    this.translationStateSubject.next({
      ...currentState,
      ...partialState,
    });
  }

  private showNotification(notification: TranslationNotification): void {
    this.notificationSubject.next(notification);

    // Auto-hide après 5 secondes si demandé
    if (notification.autoHide) {
      setTimeout(() => this.clearNotifications(), 5000);
    }
  }

  private updateTranslationVote(
    translationId: string,
    newVoteCount: number,
  ): void {
    const currentState = this.translationStateSubject.value;
    const updatedTranslations = currentState.translations.map((translation) =>
      translation.id === translationId
        ? { ...translation, votes: newVoteCount }
        : translation,
    );

    this.updateState({ translations: updatedTranslations });
  }

  private invalidateWordCache(wordId: string): void {
    const cacheKey = `word_${wordId}`;
    this.languageCache.delete(cacheKey);
  }

  private isCacheValid(cacheKey: string): boolean {
    // Implémentation simple - peut être améliorée avec timestamps
    return this.languageCache.has(cacheKey);
  }

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      if (errorObj.error?.message) {
        return errorObj.error.message;
      }
      if (errorObj.message) {
        return errorObj.message;
      }
    }
    return "Une erreur inattendue s'est produite";
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: unknown): Observable<T> => {
      // Log the error for debugging
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        console.error(`${operation} failed:`, errorObj.message || error);
      } else {
        console.error(`${operation} failed:`, error);
      }
      return of(result as T);
    };
  }
}
