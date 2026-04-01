/**
 * @fileoverview Composant de formulaire de catégorie
 * 
 * Composant responsable de la création et modification des catégories
 * avec validation, sélection de langue et gestion des erreurs.
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy 
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { 
  CategoryAdmin, 
  CreateCategoryData, 
  UpdateCategoryData 
} from '../../models/admin.models';
import { DictionaryService } from '../../../../core/services/dictionary.service';

/**
 * Interface pour une langue disponible
 */
export interface LanguageOption {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly nativeName?: string;
}

/**
 * Composant de formulaire de catégorie avec validation complète
 */
@Component({
  selector: 'app-category-form',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <!-- Header du formulaire -->
      <div class="mb-6">
        <div class="flex items-center gap-4 mb-2">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">
              {{ isEditMode ? 'Modifier la catégorie' : 'Nouvelle catégorie' }}
            </h2>
            <p class="text-gray-400">
              {{ isEditMode 
                ? 'Modifiez les informations de cette catégorie'
                : 'Créez une nouvelle catégorie pour organiser les mots par thématique'
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Formulaire -->
      <form [formGroup]="categoryForm" (ngSubmit)="onSubmit()" novalidate>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Nom de la catégorie -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-300 mb-2">
              Nom de la catégorie *
            </label>
            <input
              type="text"
              id="name"
              class="w-full bg-gray-700 border rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2"
              [class.border-gray-600]="!isFieldInvalid('name')"
              [class.border-red-500]="isFieldInvalid('name')"
              [class.focus:ring-blue-500]="!isFieldInvalid('name')"
              [class.focus:ring-red-500]="isFieldInvalid('name')"
              formControlName="name"
              placeholder="Ex: Salutations, Nourriture, Animaux..."
              maxlength="100"
            />
            <div *ngIf="isFieldInvalid('name')" class="text-red-400 text-sm mt-1">
              <div *ngIf="categoryForm.get('name')?.errors?.['required']">
                Le nom de la catégorie est obligatoire
              </div>
              <div *ngIf="categoryForm.get('name')?.errors?.['minlength']">
                Le nom doit contenir au moins 2 caractères
              </div>
              <div *ngIf="categoryForm.get('name')?.errors?.['maxlength']">
                Le nom ne peut pas dépasser 100 caractères
              </div>
            </div>
            <div class="text-gray-400 text-sm mt-1">
              Un nom court et descriptif pour identifier la catégorie
            </div>
          </div>

          <!-- Sélection de la langue -->
          <div>
            <label for="languageId" class="block text-sm font-medium text-gray-300 mb-2">
              Langue *
            </label>
            
            <div *ngIf="isLoadingLanguages$ | async" class="flex items-center text-gray-400">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              <span class="text-sm">Chargement des langues...</span>
            </div>

            <select
              *ngIf="!(isLoadingLanguages$ | async)"
              id="languageId"
              class="w-full bg-gray-700 border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2"
              [class.border-gray-600]="!isFieldInvalid('languageId')"
              [class.border-red-500]="isFieldInvalid('languageId')"
              [class.focus:ring-blue-500]="!isFieldInvalid('languageId')"
              [class.focus:ring-red-500]="isFieldInvalid('languageId')"
              formControlName="languageId"
            >
              <option value="">Sélectionnez une langue</option>
              <option 
                *ngFor="let language of availableLanguages$ | async"
                [value]="language.id"
                [title]="language.nativeName"
              >
                {{ language.name }}
                <span *ngIf="language.nativeName && language.nativeName !== language.name">
                  ({{ language.nativeName }})
                </span>
              </option>
            </select>

            <div *ngIf="isFieldInvalid('languageId')" class="text-red-400 text-sm mt-1">
              <div *ngIf="categoryForm.get('languageId')?.errors?.['required']">
                La sélection d'une langue est obligatoire
              </div>
            </div>
            <div class="text-gray-400 text-sm mt-1">
              La langue à laquelle cette catégorie sera associée
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Description (optionnelle) -->
          <div>
            <label for="description" class="block text-sm font-medium text-gray-300 mb-2">
              Description <span class="text-gray-500">(optionnel)</span>
            </label>
            <textarea
              id="description"
              class="w-full bg-gray-700 border rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2"
              [class.border-gray-600]="!isFieldInvalid('description')"
              [class.border-red-500]="isFieldInvalid('description')"
              [class.focus:ring-blue-500]="!isFieldInvalid('description')"
              [class.focus:ring-red-500]="isFieldInvalid('description')"
              formControlName="description"
              placeholder="Décrivez brièvement le type de mots que contiendra cette catégorie..."
              rows="3"
              maxlength="500"
            ></textarea>
            <div *ngIf="isFieldInvalid('description')" class="text-red-400 text-sm mt-1">
              <div *ngIf="categoryForm.get('description')?.errors?.['maxlength']">
                La description ne peut pas dépasser 500 caractères
              </div>
            </div>
            <div class="text-gray-400 text-sm mt-1">
              {{ getDescriptionLength() }}/500 caractères
            </div>
          </div>

          <!-- Ordre d'affichage -->
          <div>
            <label for="order" class="block text-sm font-medium text-gray-300 mb-2">
              Ordre d'affichage <span class="text-gray-500">(optionnel)</span>
            </label>
            <input
              type="number"
              id="order"
              class="w-full bg-gray-700 border rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2"
              [class.border-gray-600]="!isFieldInvalid('order')"
              [class.border-red-500]="isFieldInvalid('order')"
              [class.focus:ring-blue-500]="!isFieldInvalid('order')"
              [class.focus:ring-red-500]="isFieldInvalid('order')"
              formControlName="order"
              placeholder="0"
              min="0"
              max="9999"
            />
            <div *ngIf="isFieldInvalid('order')" class="text-red-400 text-sm mt-1">
              <div *ngIf="categoryForm.get('order')?.errors?.['min']">
                L'ordre doit être un nombre positif
              </div>
              <div *ngIf="categoryForm.get('order')?.errors?.['max']">
                L'ordre ne peut pas dépasser 9999
              </div>
            </div>
            <div class="text-gray-400 text-sm mt-1">
              Ordre d'affichage dans la liste (0 = en premier)
            </div>
          </div>
        </div>

        <!-- Statut actif -->
        <div class="mb-6">
          <div class="flex items-center">
            <input
              class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              type="checkbox"
              id="isActive"
              formControlName="isActive"
            />
            <label class="ml-2 text-sm font-medium text-gray-300" for="isActive">
              Catégorie active
            </label>
          </div>
          <div class="text-gray-400 text-sm mt-1">
            Les catégories actives sont disponibles pour l'ajout de nouveaux mots
          </div>
        </div>

        <!-- Actions du formulaire -->
        <div class="flex items-center justify-between pt-6 border-t border-gray-700">
          <button
            type="button"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            (click)="onCancel()"
            [disabled]="isLoading"
          >
            Annuler
          </button>

          <div class="flex items-center gap-3">
            <button
              type="button"
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              (click)="onReset()"
              [disabled]="isLoading || !categoryForm.dirty"
            >
              Réinitialiser
            </button>
            
            <button
              type="submit"
              class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              [class.bg-blue-600]="categoryForm.valid && !isLoading"
              [class.hover:bg-blue-700]="categoryForm.valid && !isLoading"
              [class.bg-gray-500]="!categoryForm.valid || isLoading"
              [class.cursor-not-allowed]="!categoryForm.valid || isLoading"
              [class.text-white]="true"
              [disabled]="!categoryForm.valid || isLoading"
            >
              <div *ngIf="isLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <svg *ngIf="!isLoading && !isEditMode" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <svg *ngIf="!isLoading && isEditMode" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ isLoading ? 'Traitement...' : (isEditMode ? 'Mettre à jour' : 'Créer') }}
            </button>
          </div>
        </div>

        <!-- Message d'aide pour la validation -->
        <div *ngIf="!categoryForm.valid" class="mt-3 text-sm text-red-400">
          <div class="flex items-start gap-2">
            <svg class="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div *ngIf="categoryForm.get('name')?.invalid">• Le nom de la catégorie est requis (minimum 2 caractères)</div>
              <div *ngIf="categoryForm.get('languageId')?.invalid">• La sélection d'une langue est obligatoire</div>
            </div>
          </div>
        </div>
      </form>

      <!-- Messages d'aide -->
      <div *ngIf="!isEditMode" class="mt-8 bg-gray-800 rounded-lg p-6">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white mb-3">Conseils pour créer une bonne catégorie</h3>
            <ul class="text-gray-300 space-y-2">
              <li class="flex items-start gap-2">
                <span class="text-blue-400 mt-1">•</span>
                <span>Choisissez un nom court et descriptif</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-400 mt-1">•</span>
                <span>Utilisez des termes que vos utilisateurs comprendront facilement</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-400 mt-1">•</span>
                <span>Évitez les catégories trop spécifiques ou trop générales</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-400 mt-1">•</span>
                <span>Pensez à la cohérence avec les autres catégories existantes</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./category-form.component.scss']
})
export class CategoryFormComponent implements OnInit, OnChanges {
  // Propriétés d'entrée
  @Input() category: CategoryAdmin | null = null;
  @Input() isLoading: boolean = false;
  @Input() isEditMode: boolean = false;

  // Événements de sortie
  @Output() submit = new EventEmitter<CreateCategoryData | UpdateCategoryData>();
  @Output() cancel = new EventEmitter<void>();

  // Formulaire réactif
  categoryForm: FormGroup;

  // État des langues
  private readonly _isLoadingLanguages$ = new BehaviorSubject<boolean>(false);
  private readonly _availableLanguages$ = new BehaviorSubject<LanguageOption[]>([]);

  // Observables publics pour les templates
  readonly isLoadingLanguages$ = this._isLoadingLanguages$.asObservable();
  readonly availableLanguages$ = this._availableLanguages$.asObservable();

  constructor(
    private formBuilder: FormBuilder,
    private dictionaryService: DictionaryService,
    private confirmDialog: ConfirmDialogService
  ) {
    this.categoryForm = this.createForm();
  }

  ngOnInit(): void {
    console.log('📝 CategoryFormComponent - Initialisation');
    this.loadAvailableLanguages();
    this.updateFormForMode();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category'] && changes['category'].currentValue && this.isEditMode) {
      console.log('📝 Catégorie à modifier:', this.category);
      this.populateForm();
    }

    if (changes['isEditMode']) {
      console.log('📝 Mode édition:', this.isEditMode);
      this.updateFormForMode();
    }
  }

  // ===== CRÉATION DU FORMULAIRE =====

  /**
   * Crée le FormGroup avec les validations
   */
  private createForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      description: ['', [
        Validators.maxLength(500)
      ]],
      languageId: ['', [
        Validators.required
      ]],
      order: [0, [
        Validators.min(0),
        Validators.max(9999)
      ]],
      isActive: [true]
    });
  }

  /**
   * Met à jour le formulaire selon le mode (création/édition)
   */
  private updateFormForMode(): void {
    if (this.isEditMode) {
      // En mode édition, permettre de modifier tous les champs
      this.categoryForm.enable();
    } else {
      // En mode création, réinitialiser le formulaire
      this.categoryForm.reset();
      this.categoryForm.patchValue({
        order: 0,
        isActive: true
      });
    }
  }

  /**
   * Remplit le formulaire avec les données de la catégorie à modifier
   */
  private populateForm(): void {
    if (!this.category || !this.isEditMode) return;

    this.categoryForm.patchValue({
      name: this.category.name,
      description: this.category.description || '',
      languageId: this.category.languageId || this.category.language || '',
      order: this.category.order || 0,
      isActive: this.category.isActive
    });

    console.log('📝 Formulaire rempli avec:', this.categoryForm.value);
  }

  // ===== CHARGEMENT DES LANGUES =====

  /**
   * Charge les langues disponibles
   */
  private loadAvailableLanguages(): void {
    console.log('🌍 Chargement des langues disponibles...');
    
    this._isLoadingLanguages$.next(true);

    this.dictionaryService.getAvailableLanguages()
      .pipe(
        map((languages: any[]) => 
          languages.map(lang => ({
            id: lang.id,
            name: lang.name,
            code: lang.code,
            nativeName: lang.nativeName
          } as LanguageOption))
        ),
        catchError((error) => {
          console.error('❌ Erreur chargement langues:', error);
          return [];
        })
      )
      .subscribe({
        next: (languages) => {
          console.log('✅ Langues chargées:', languages.length);
          this._availableLanguages$.next(languages);
          this._isLoadingLanguages$.next(false);
        },
        error: (error) => {
          console.error('❌ Erreur finale:', error);
          this._isLoadingLanguages$.next(false);
        }
      });
  }

  // ===== VALIDATION DU FORMULAIRE =====

  /**
   * Vérifie si un champ est invalide et a été touché
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.categoryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Vérifie si un champ est valide et a été touché
   */
  isFieldValid(fieldName: string): boolean {
    const field = this.categoryForm.get(fieldName);
    return !!(field && field.valid && (field.dirty || field.touched));
  }

  /**
   * Obtient la longueur de la description
   */
  getDescriptionLength(): number {
    return this.categoryForm.get('description')?.value?.length || 0;
  }

  // ===== GESTION DES ÉVÉNEMENTS =====

  /**
   * Soumission du formulaire
   */
  onSubmit(): void {
    // Empêcher les soumissions multiples
    if (this.isLoading) {
      console.warn('📝 Soumission déjà en cours, ignorée');
      return;
    }

    if (this.categoryForm.invalid) {
      console.warn('📝 Formulaire invalide, marquage de tous les champs comme touchés');
      this.markAllFieldsAsTouched();
      return;
    }

    const formValue = this.categoryForm.value;
    console.log('📝 Soumission du formulaire:', formValue);

    // Validation supplémentaire côté client
    const trimmedName = formValue.name?.trim();
    if (!trimmedName || !formValue.languageId) {
      console.error('❌ Validation échouée: nom ou langue manquant', {
        name: trimmedName,
        languageId: formValue.languageId
      });
      this.markAllFieldsAsTouched();
      return;
    }

    if (this.isEditMode) {
      // Mode édition : émettre les données de mise à jour
      const updateData: UpdateCategoryData = {
        name: trimmedName,
        description: formValue.description?.trim() || undefined,
        languageId: formValue.languageId,
        order: formValue.order,
        isActive: formValue.isActive
      };

      console.log('✏️ Données de mise à jour:', updateData);
      this.submit.emit(updateData);
    } else {
      // Mode création : émettre les données de création
      const createData: CreateCategoryData = {
        name: trimmedName,
        description: formValue.description?.trim() || undefined,
        languageId: formValue.languageId,
        order: formValue.order || 0,
        isActive: formValue.isActive ?? true
      };

      console.log('➕ Données de création:', createData);
      this.submit.emit(createData);
    }
  }

  /**
   * Annulation du formulaire
   */
  async onCancel(): Promise<void> {
    console.log('❌ Annulation du formulaire');

    if (this.categoryForm.dirty) {
      const ok = await this.confirmDialog.confirm({
        title: 'Annuler les modifications',
        message: 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment annuler ?',
        confirmText: 'Annuler les modifications',
        type: 'warning',
      });
      if (!ok) return;
    }

    this.cancel.emit();
  }

  /**
   * Réinitialisation du formulaire
   */
  async onReset(): Promise<void> {
    console.log('🔄 Réinitialisation du formulaire');

    const ok = await this.confirmDialog.confirm({
      title: 'Réinitialiser le formulaire',
      message: 'Voulez-vous vraiment réinitialiser le formulaire ? Toutes les modifications seront perdues.',
      confirmText: 'Réinitialiser',
      type: 'warning',
    });
    if (!ok) return;

    if (this.isEditMode && this.category) {
      // En mode édition, revenir aux valeurs originales
      this.populateForm();
    } else {
      // En mode création, vider le formulaire
      this.categoryForm.reset();
      this.categoryForm.patchValue({
        order: 0,
        isActive: true
      });
    }

    this.categoryForm.markAsUntouched();
    this.categoryForm.markAsPristine();
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Marque tous les champs comme touchés pour afficher les erreurs
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.categoryForm.controls).forEach(key => {
      const control = this.categoryForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Obtient le nom de la langue sélectionnée
   */
  getSelectedLanguageName(): string {
    const selectedId = this.categoryForm.get('languageId')?.value;
    if (!selectedId) return '';

    const languages = this._availableLanguages$.value;
    const selectedLanguage = languages.find(lang => lang.id === selectedId);
    
    return selectedLanguage ? selectedLanguage.name : '';
  }

  /**
   * Vérifie si le formulaire a des changements
   */
  get hasChanges(): boolean {
    return this.categoryForm.dirty;
  }

  /**
   * Vérifie si le formulaire est valide
   */
  get isFormValid(): boolean {
    return this.categoryForm.valid;
  }
}