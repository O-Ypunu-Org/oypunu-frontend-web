import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DictionaryService, HistoryItem } from '../../../../core/services/dictionary.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguagesService } from '../../../../core/services/languages.service';
import { Word } from '../../../../core/models/word';
import { Category } from '../../../../core/models/category';
import { SearchResults } from '../../../../core/models/search-results';
import { SearchParams } from '../../../../core/models/search-params';
import { DropdownOption } from '../../../../shared/components/custom-dropdown/custom-dropdown.component';

export type FeatureBarItem = 'wordOfTheDay' | 'history' | 'favorites' | 'wordIndex' | 'randomWord';

export interface FilterState {
  languages: string[];
  categories: string[];
  partsOfSpeech: string[];
}

@Component({
  selector: 'app-search',
  standalone: false,
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit, OnDestroy {
  searchForm: FormGroup;
  filterForm: FormGroup;

  // Listes de mots
  recentWords: Word[] = [];
  popularWords: Word[] = [];
  searchResults: SearchResults | null = null;

  // État de la recherche
  isSearching = false;
  searchQuery = '';
  currentPage = 1;
  pageSize = 10;

  // Mot du jour
  isShowingWordOfDay = false;
  wordOfDayWord: Word | null = null;
  wordOfDayLoading = false;
  wordOfDayError: string | null = null;

  // Historique (sous-écran inline)
  isShowingHistory = false;
  historyItems: HistoryItem[] = [];
  historyLoading = false;
  historyError: string | null = null;
  historyTotalPages = 1;

  // Filtres
  showFilterModal = false;
  currentFilters: FilterState = { languages: [], categories: [], partsOfSpeech: [] };

  // Données pour les filtres
  categories: Category[] = [];
  languages: any[] = [];
  languageOptions: DropdownOption[] = [];
  categoryOptions: DropdownOption[] = [];
  partOfSpeechOptions: DropdownOption[] = [];
  partsOfSpeech = [
    { code: 'noun', name: 'Nom' },
    { code: 'verb', name: 'Verbe' },
    { code: 'adjective', name: 'Adjectif' },
    { code: 'adverb', name: 'Adverbe' },
    { code: 'pronoun', name: 'Pronom' },
    { code: 'preposition', name: 'Préposition' },
    { code: 'conjunction', name: 'Conjonction' },
    { code: 'interjection', name: 'Interjection' },
  ];

  // État du chargement
  isLoadingInitial = false;
  loadError: string | null = null;

  private _destroy$ = new Subject<void>();

  constructor(
    private _fb: FormBuilder,
    private _dictionaryService: DictionaryService,
    private _authService: AuthService,
    private _languagesService: LanguagesService,
    private _router: Router,
    private _route: ActivatedRoute
  ) {
    this.searchForm = this._fb.group({
      query: [''],
    });
    this.filterForm = this._fb.group({
      languages: [[]],
      categories: [[]],
      partsOfSpeech: [[]],
    });
  }

  ngOnInit(): void {
    // Charger les données initiales
    this._loadInitialData();

    // Charger les langues actives
    this._languagesService
      .getActiveLanguages()
      .pipe(takeUntil(this._destroy$))
      .subscribe((langs) => {
        this.languages = langs.map((lang) => ({
          code: lang.iso639_1 || lang.iso639_2 || lang.iso639_3 || lang._id,
          name: lang.name,
        }));
        this.languageOptions = this.languages.map((l) => ({ value: l.code, label: l.name }));
      });

    // Charger les catégories
    this._dictionaryService
      .getCategories()
      .pipe(takeUntil(this._destroy$))
      .subscribe((cats) => {
        this.categories = cats;
        this.categoryOptions = cats.map((c) => ({ value: c.id ?? '', label: c.name }));
      });

    // Initialiser les options parties du discours
    this.partOfSpeechOptions = this.partsOfSpeech.map((p) => ({ value: p.code, label: p.name }));

    // Vérifier les paramètres URL
    this._route.queryParams.pipe(takeUntil(this._destroy$)).subscribe((params) => {
      if (params['query']) {
        this.searchForm.patchValue({ query: params['query'] });
        this.searchQuery = params['query'];
        if (params['languages']) this.currentFilters.languages = params['languages'].split(',');
        if (params['categories']) this.currentFilters.categories = params['categories'].split(',');
        if (params['partsOfSpeech']) this.currentFilters.partsOfSpeech = params['partsOfSpeech'].split(',');
        this.currentPage = params['page'] ? parseInt(params['page']) : 1;
        this._performSearch();
      }
    });

    // Recherche debounce sur saisie
    this.searchForm
      .get('query')
      ?.valueChanges.pipe(takeUntil(this._destroy$), debounceTime(300), distinctUntilChanged())
      .subscribe((value: string) => {
        this.searchQuery = value ?? '';
        if (this.searchQuery.length >= 2) {
          this.isShowingWordOfDay = false;
          this.isShowingHistory = false;
          this.currentPage = 1;
          this._updateUrlAndSearch();
        } else if (this.searchQuery.length === 0 && this.searchResults) {
          this.searchResults = null;
          this._router.navigate([], { relativeTo: this._route, queryParams: {} });
        }
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ─── Chargement initial ───────────────────────────────────────────────────

  retryLoad(): void {
    this._loadInitialData();
  }

  retryHistoryLoad(): void {
    this._loadHistory();
  }

  private _loadInitialData(): void {
    this.isLoadingInitial = true;
    this.loadError = null;

    this._dictionaryService
      .getRecentWords(10)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (words) => {
          this.recentWords = words;
          this.isLoadingInitial = false;
          if (words.length === 0) {
            this._loadPopularWords();
          }
        },
        error: () => {
          this._loadPopularWords();
        },
      });
  }

  private _loadPopularWords(): void {
    this._dictionaryService
      .getFeaturedWords(10)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (words) => {
          this.popularWords = words;
          this.isLoadingInitial = false;
        },
        error: () => {
          this.isLoadingInitial = false;
          this.loadError = 'Impossible de charger les mots.';
        },
      });
  }

  // ─── Barre de fonctionnalités ─────────────────────────────────────────────

  onFeatureBarSelect(item: FeatureBarItem): void {
    switch (item) {
      case 'wordOfTheDay':
        this._fetchWordOfTheDay();
        break;
      case 'history':
        if (!this.isShowingHistory) {
          this.isShowingHistory = true;
          this.isShowingWordOfDay = false;
          this._loadHistory();
        } else {
          this.isShowingHistory = false;
        }
        break;
      case 'favorites':
        this._router.navigate(['/favorites']);
        break;
      case 'wordIndex':
        this._router.navigate(['/dictionary/index']);
        break;
      case 'randomWord':
        this._loadRandomWord();
        break;
    }
  }

  private _fetchWordOfTheDay(): void {
    this.isShowingWordOfDay = true;
    this.isShowingHistory = false;
    this.wordOfDayWord = null;
    this.wordOfDayError = null;
    this.wordOfDayLoading = true;

    this._dictionaryService
      .getWordOfTheDay()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (word) => {
          this.wordOfDayWord = word;
          this.wordOfDayLoading = false;
          if (!word) {
            this.wordOfDayError = 'Aucun mot du jour disponible.';
          }
        },
        error: (err) => {
          this.wordOfDayLoading = false;
          this.wordOfDayError = err?.message ?? 'Impossible de charger le mot du jour.';
        },
      });
  }

  closeWordOfDay(): void {
    this.isShowingWordOfDay = false;
    this.wordOfDayWord = null;
  }

  private _loadRandomWord(): void {
    this._dictionaryService
      .getRandomWords(1)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (words) => {
          if (words.length > 0) {
            this._router.navigate(['/dictionary/word', words[0].id]);
          }
        },
        error: () => {},
      });
  }

  // ─── Recherche ────────────────────────────────────────────────────────────

  onSearch(): void {
    this.searchQuery = this.searchForm.get('query')?.value ?? '';
    this.currentPage = 1;
    this._performSearch();
  }

  onHistoryItemClick(item: HistoryItem): void {
    this._router.navigate(['/dictionary/word', item.wordId]);
  }

  deleteHistoryItem(event: Event, viewId: string): void {
    event.stopPropagation();
    this._dictionaryService
      .deleteConsultation(viewId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: () => {
          this.historyItems = this.historyItems.filter((i) => i.id !== viewId);
        },
        error: () => {},
      });
  }

  clearAllHistory(): void {
    if (!confirm('Supprimer tout votre historique de consultation ?')) return;
    this._dictionaryService
      .clearAllConsultations()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: () => {
          this.historyItems = [];
        },
        error: () => {},
      });
  }

  private _loadHistory(): void {
    this.historyLoading = true;
    this.historyError = null;
    this._dictionaryService
      .getRecentConsultations(1, 20)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (response) => {
          this.historyItems = response.consultations;
          this.historyTotalPages = response.totalPages;
          this.historyLoading = false;
        },
        error: () => {
          this.historyLoading = false;
          this.historyError = "Impossible de charger l'historique.";
        },
      });
  }

  formatHistoryDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this._updateUrlAndSearch();
  }

  clearSearch(): void {
    this.searchForm.patchValue({ query: '' });
    this.searchQuery = '';
    this.searchResults = null;
    this._router.navigate([], { relativeTo: this._route, queryParams: {} });
  }

  private _updateUrlAndSearch(): void {
    const query = this.searchForm.get('query')?.value ?? '';
    if (query.trim()) {
      this._router.navigate([], {
        relativeTo: this._route,
        queryParams: {
          query,
          languages: this.currentFilters.languages.length ? this.currentFilters.languages.join(',') : null,
          categories: this.currentFilters.categories.length ? this.currentFilters.categories.join(',') : null,
          partsOfSpeech: this.currentFilters.partsOfSpeech.length ? this.currentFilters.partsOfSpeech.join(',') : null,
          page: this.currentPage,
        },
        queryParamsHandling: 'merge',
      });
      this._performSearch();
    } else if (this.searchResults) {
      this.searchResults = null;
      this._router.navigate([], { relativeTo: this._route, queryParams: {} });
    }
  }

  private _performSearch(): void {
    const query = this.searchForm.get('query')?.value ?? '';
    if (!query.trim()) return;

    this.isSearching = true;

    const params: SearchParams = {
      query,
      languages: this.currentFilters.languages,
      categories: this.currentFilters.categories,
      partsOfSpeech: this.currentFilters.partsOfSpeech,
      page: this.currentPage,
      limit: this.pageSize,
    };

    this._dictionaryService
      .searchWords(params)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.isSearching = false;
        },
        error: () => {
          this.isSearching = false;
        },
      });
  }

  // ─── Filtres ──────────────────────────────────────────────────────────────

  applyFilters(): void {
    const values = this.filterForm.value;
    this.currentFilters = {
      languages: values.languages ?? [],
      categories: values.categories ?? [],
      partsOfSpeech: values.partsOfSpeech ?? [],
    };
    if (this.searchQuery.length >= 2) {
      this.currentPage = 1;
      this._performSearch();
    }
  }

  resetFilters(): void {
    this.filterForm.patchValue({ languages: [], categories: [], partsOfSpeech: [] });
    this.currentFilters = { languages: [], categories: [], partsOfSpeech: [] };
  }

  onFiltersChange(filters: FilterState): void {
    this.currentFilters = filters;
    if (this.searchQuery.length >= 2) {
      this.currentPage = 1;
      this._performSearch();
    }
  }

  // ─── Favoris ──────────────────────────────────────────────────────────────

  toggleFavorite(word: Word): void {
    if (word.isFavorite) {
      this._dictionaryService.removeFromFavorites(word.id).subscribe();
    } else {
      this._dictionaryService.addToFavorites(word.id).subscribe();
    }
  }

  // ─── Getters utilitaires ──────────────────────────────────────────────────

  get displayWords(): Word[] {
    if (this.searchQuery) return this.searchResults?.words ?? [];
    return this.recentWords.length > 0 ? this.recentWords : this.popularWords;
  }

  get isLoadingContent(): boolean {
    return (this.isSearching || this.isLoadingInitial) && this.displayWords.length === 0;
  }

  get hasError(): boolean {
    return !this.isLoadingContent && !!this.loadError && this.displayWords.length === 0;
  }

  get isEmpty(): boolean {
    return !this.isLoadingContent && !this.hasError && this.displayWords.length === 0;
  }

  get activeFiltersCount(): number {
    return (
      this.currentFilters.languages.length +
      this.currentFilters.categories.length +
      this.currentFilters.partsOfSpeech.length
    );
  }

  get isAuthenticated(): boolean {
    return this._authService.isAuthenticated();
  }

  get isContributor(): boolean {
    if (!this.isAuthenticated) return false;
    const user = this._authService.getCurrentUser();
    return user?.role === 'contributor' || user?.role === 'admin' || user?.role === 'superadmin';
  }

  get wordOfDayDate(): string {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
}
