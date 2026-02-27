import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { Word } from '../../../../core/models/word';

@Component({
  selector: 'app-word-index',
  standalone: false,
  templateUrl: './word-index.component.html',
  styleUrl: './word-index.component.scss',
})
export class WordIndexComponent implements OnInit, OnDestroy {
  readonly alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  readonly LIMIT = 24; // 3×8 — divisible par 3, 2 et 1

  words: Word[] = [];
  selectedLetter = 'Tous';
  currentPage = 1;
  totalPages = 0;
  totalWords = 0;
  isLoading = false;
  errorMessage = '';

  private _destroy$ = new Subject<void>();

  constructor(
    private _dictionaryService: DictionaryService,
    private _router: Router,
    private _route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Synchronise l'état avec les query params (retour navigateur, partage d'URL)
    this._route.queryParams
      .pipe(takeUntil(this._destroy$))
      .subscribe((params) => {
        this.selectedLetter = params['letter'] || 'Tous';
        this.currentPage = +params['page'] || 1;
        this._loadWords();
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ─── Chargement ───────────────────────────────────────────────────────────

  private _loadWords(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.words = [];

    if (this.selectedLetter === 'Tous') {
      // GET /words avec pagination complète — pas de filtre texte
      this._dictionaryService
        .getAllWords(this.currentPage, this.LIMIT)
        .pipe(takeUntil(this._destroy$))
        .subscribe({
          next: (results) => {
            this.words = results.words;
            this.totalPages = results.totalPages;
            this.totalWords = results.total;
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'Erreur lors du chargement des mots.';
            this.isLoading = false;
          },
        });
    } else {
      // GET /words/search?query=LETTRE — filtre client pour ne garder que les mots
      // commençant réellement par la lettre (identique à la version mobile)
      this._dictionaryService
        .searchWords({
          query: this.selectedLetter,
          page: this.currentPage,
          limit: this.LIMIT,
        })
        .pipe(takeUntil(this._destroy$))
        .subscribe({
          next: (results) => {
            this.words = results.words.filter((w) =>
              w.word.toUpperCase().startsWith(this.selectedLetter)
            );
            this.totalPages = results.totalPages;
            this.totalWords = results.total;
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'Erreur lors du chargement des mots.';
            this.isLoading = false;
          },
        });
    }
  }

  // ─── Interactions ──────────────────────────────────────────────────────────

  selectLetter(letter: string): void {
    if (letter === this.selectedLetter) return;
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { letter: letter !== 'Tous' ? letter : null, page: null },
      queryParamsHandling: 'replace',
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    this._router.navigate(['/dictionary']);
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────

  trackByWord(_index: number, word: Word): string {
    return word.id;
  }

  /** Génère un tableau compact de numéros de page avec ellipses (-1) */
  getPaginationPages(): number[] {
    if (this.totalPages <= 7) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }
    const pages: number[] = [1];
    const delta = 1;
    const rangeStart = Math.max(2, this.currentPage - delta);
    const rangeEnd = Math.min(this.totalPages - 1, this.currentPage + delta);

    if (rangeStart > 2) pages.push(-1);
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < this.totalPages - 1) pages.push(-1);
    pages.push(this.totalPages);

    return pages;
  }
}
