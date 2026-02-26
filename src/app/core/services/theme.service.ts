import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

/**
 * ThemeService — O'Ypunu Design System
 *
 * Gère le thème clair/sombre de l'application web.
 * Dark mode par défaut (cohérence avec oypunu-mobile).
 * Le thème est persisté dans localStorage et appliqué via
 * l'attribut `data-theme` sur l'élément <html>.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme = signal<Theme>('dark');

  /** Signal readonly exposant le thème courant */
  readonly currentTheme = this._theme.asReadonly();

  constructor() {
    const saved = localStorage.getItem('oypunu-theme') as Theme | null;
    this._apply(saved ?? 'dark');
  }

  /** Bascule entre dark et light */
  toggle(): void {
    this._apply(this._theme() === 'dark' ? 'light' : 'dark');
  }

  /** Définit le thème explicitement */
  setTheme(theme: Theme): void {
    this._apply(theme);
  }

  get isDark(): boolean {
    return this._theme() === 'dark';
  }

  private _apply(theme: Theme): void {
    this._theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('oypunu-theme', theme);
  }
}
