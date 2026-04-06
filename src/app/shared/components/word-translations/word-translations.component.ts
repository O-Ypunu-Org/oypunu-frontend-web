import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Word, WordTranslation } from '../../../core/models/word';
import { DictionaryService } from '../../../core/services/dictionary.service';

@Component({
  selector: 'app-word-translations',
  templateUrl: './word-translations.component.html',
  styleUrls: ['./word-translations.component.scss'],
  standalone: false,
})
export class WordTranslationsComponent {
  @Input() word!: Word;

  constructor(
    private router: Router,
    private dictionaryService: DictionaryService,
  ) {}

  // Langues disponibles avec leurs noms
  private languageNames: { [key: string]: string } = {
    fr: 'Français',
    en: 'Anglais',
    es: 'Espagnol',
    de: 'Allemand',
    it: 'Italien',
    pt: 'Portugais',
    ru: 'Russe',
    ja: 'Japonais',
    zh: 'Chinois',
    ar: 'Arabe',
    ko: 'Coréen',
    hi: 'Hindi',
  };

  /**
   * Récupère le nom complet d'une langue à partir de son code ou nom
   */
  getLanguageName(code: string | undefined): string {
    if (!code) return 'Langue inconnue';
    // Dynamic map first (ObjectId keys populated from languageId objects)
    if (this._langKeyToName[code]) return this._langKeyToName[code];
    // Fallback to static ISO code map
    return this.languageNames[code] || code;
  }

  /**
   * Récupère l'émoji du drapeau pour une langue
   */
  getLanguageFlag(code: string | undefined): string {
    if (!code) return '_';
    // Drapeau stocké depuis le backend (flagEmoji)
    if (this._langKeyToFlag[code]) return this._langKeyToFlag[code];
    // Fallback : map statique par code ISO
    const flags: { [key: string]: string } = {
      fr: '🇫🇷',
      en: '🇺🇸',
      es: '🇪🇸',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      ru: '🇷🇺',
      ja: '🇯🇵',
      zh: '🇨🇳',
      ar: '🇸🇦',
      ko: '🇰🇷',
      hi: '🇮🇳',
    };
    return flags[code] || '_';
  }

  /**
   * Vérifie si le mot a des traductions
   */
  hasTranslations(): boolean {
    return !!(this.word?.translations && this.word.translations.length > 0);
  }

  // Map langId/code → nom d'affichage, rempli lors du groupage
  private _langKeyToName: { [key: string]: string } = {};
  // Map langId/code → emoji drapeau, rempli lors du groupage
  private _langKeyToFlag: { [key: string]: string } = {};

  /**
   * Retourne la clé de langue pour une traduction (ID si disponible, sinon code ISO)
   */
  getTranslationKey(translation: WordTranslation): string {
    return this.getTranslationLanguageKey(translation);
  }

  private getTranslationLanguageKey(translation: WordTranslation): string {
    const t = translation as any;
    // Cas 1 : languageId est un objet populé { _id, name, flagEmoji }
    if (t.languageId && typeof t.languageId === 'object') {
      const id = t.languageId._id || t.languageId.id;
      if (id) {
        this._langKeyToName[id] =
          t.languageId.name || translation.language || id;
        if (t.languageId.flagEmoji) {
          this._langKeyToFlag[id] = t.languageId.flagEmoji;
        }
        return id;
      }
    }
    // Cas 2 : language ISO code défini
    if (translation.language) {
      this._langKeyToName[translation.language] = translation.language;
      return translation.language;
    }
    return 'autre';
  }

  /**
   * Groupe les traductions par langue
   */
  getTranslationsByLanguage(): { [language: string]: WordTranslation[] } {
    if (!this.word?.translations) return {};
    this._langKeyToName = {};
    this._langKeyToFlag = {};

    return this.word.translations.reduce(
      (grouped, translation) => {
        const key = this.getTranslationLanguageKey(translation);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(translation);
        return grouped;
      },
      {} as { [language: string]: WordTranslation[] },
    );
  }

  /**
   * Récupère les langues disponibles triées
   */
  getAvailableLanguages(): string[] {
    const grouped = this.getTranslationsByLanguage();
    return Object.keys(grouped).sort((a, b) =>
      this.getLanguageName(a).localeCompare(this.getLanguageName(b)),
    );
  }

  /**
   * Formate les contextes pour affichage
   */
  formatContexts(contexts?: string[]): string {
    if (!contexts || contexts.length === 0) return '';
    return contexts.join(', ');
  }

  /**
   * Récupère la classe CSS pour le niveau de confiance
   */
  getConfidenceClass(confidence?: number): string {
    if (!confidence) return 'text-gray-400';

    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  }

  /**
   * Formate le niveau de confiance pour affichage
   */
  formatConfidence(confidence?: number): string {
    if (!confidence) return '';
    return `${Math.round(confidence * 100)}%`;
  }

  /**
   * Joue l'audio d'une traduction (via targetWordId ou recherche du mot)
   */
  playTranslationAudio(translation: WordTranslation, event: Event): void {
    event.stopPropagation();
    const t = translation as any;

    const playFromWord = (word: any) => {
      if (!word) return;
      const audioFiles = word.audioFiles;
      if (!audioFiles) return;
      const urls: string[] =
        typeof audioFiles.forEach === 'function'
          ? Array.from(audioFiles.values())
              .map((v: any) => v?.url)
              .filter(Boolean)
          : Object.values(audioFiles)
              .map((v: any) => v?.url)
              .filter(Boolean);
      if (urls.length > 0) {
        new Audio(urls[0]).play().catch(() => {});
      }
    };

    if (t.targetWordId) {
      this.dictionaryService
        .getWordById(t.targetWordId)
        .subscribe({ next: playFromWord });
    } else {
      // Chercher le mot par son texte dans la langue de la traduction
      const langKey =
        t.languageId?._id ||
        t.languageId?.id ||
        t.languageId ||
        translation.language ||
        '';
      this.dictionaryService
        .searchWords({
          query: translation.translatedWord,
          languages: langKey ? [langKey] : [],
          limit: 1,
          page: 1,
        })
        .subscribe({
          next: (results) => {
            const found =
              results.words?.find(
                (w) =>
                  w.word.toLowerCase() ===
                  translation.translatedWord.toLowerCase(),
              ) || results.words?.[0];
            if (found) {
              this.dictionaryService
                .getWordById(found.id)
                .subscribe({ next: playFromWord });
            }
          },
        });
    }
  }

  /**
   * Navigate vers la page de détail d'une traduction
   */
  navigateToTranslation(translatedWord: string, language: string): void {
    // Rechercher le mot traduit dans la langue spécifiée
    this.dictionaryService
      .searchWords({
        query: translatedWord,
        languages: [language],
        limit: 5,
        page: 1,
      })
      .subscribe({
        next: (results) => {
          if (results.words && results.words.length > 0) {
            // Chercher une correspondance exacte
            const exactMatch = results.words.find(
              (word) =>
                word.word.toLowerCase() === translatedWord.toLowerCase(),
            );

            if (exactMatch) {
              this.router.navigate(['/dictionary/word', exactMatch.id]);
            } else {
              // Prendre le premier résultat si pas de correspondance exacte
              const foundWord = results.words[0];
              this.router.navigate(['/dictionary/word', foundWord.id]);
            }
          } else {
            // Mot non trouvé, faire une recherche générale
            this.router.navigate(['/dictionary'], {
              queryParams: {
                q: translatedWord,
                language: language,
              },
            });
          }
        },
        error: (error) => {
          // En cas d'erreur, rediriger vers la recherche
          this.router.navigate(['/dictionary'], {
            queryParams: {
              q: translatedWord,
              language: language,
            },
          });
        },
      });
  }
}
