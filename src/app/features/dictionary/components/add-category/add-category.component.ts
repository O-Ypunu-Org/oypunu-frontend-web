/**
 * @fileoverview Composant d'ajout de catégorie
 * 
 * Composant qui suit le même flow métier que l'ajout de mots :
 * - Accessible aux CONTRIBUTEUR, ADMIN, SUPERADMIN
 * - Soumission via /categories/propose (comme /languages/propose)
 * - Soumis à modération par les admins
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DropdownOption } from '../../../../shared/components/custom-dropdown/custom-dropdown.component';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DictionaryService } from '../../../../core/services/dictionary.service';
import { Category } from '../../../../core/models/category';

@Component({
  selector: 'app-add-category',
  standalone: false,
  templateUrl: './add-category.component.html',
  styleUrls: ['./add-category.component.scss'],
})
export class AddCategoryComponent implements OnInit, OnDestroy {
  categoryForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  
  // Langues disponibles
  languages: { id: string; code: string; name: string; nativeName?: string }[] = [];

  get languageOptions(): DropdownOption[] {
    return this.languages.map((lang) => ({
      value: lang.id,
      label: `${lang.name}${lang.nativeName && lang.nativeName !== lang.name ? ` (${lang.nativeName})` : ''}`,
    }));
  }
  isLoadingLanguages = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private dictionaryService: DictionaryService,
    private router: Router,
    private confirmDialog: ConfirmDialogService
  ) {
    this.categoryForm = this.createForm();
  }

  ngOnInit(): void {
    console.log('📝 AddCategoryComponent - Initialisation');
    this.loadLanguages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Création du formulaire avec validation
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
      languageId: ['', [Validators.required]],
      order: [0, [
        Validators.min(0),
        Validators.max(9999)
      ]],
      isActive: [true]
    });
  }

  /**
   * Charge les langues disponibles
   */
  private loadLanguages(): void {
    this.isLoadingLanguages = true;
    this.dictionaryService
      .getAvailableLanguages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (languages) => {
          this.languages = languages.map(lang => ({
            id: lang.id,
            code: lang.code || '',
            name: lang.name,
            nativeName: lang.nativeName
          }));
          this.isLoadingLanguages = false;
          console.log('✅ Langues chargées:', this.languages.length);
        },
        error: (error) => {
          console.error('❌ Erreur chargement langues:', error);
          this.isLoadingLanguages = false;
          this.errorMessage = 'Erreur lors du chargement des langues';
        }
      });
  }

  /**
   * Soumission du formulaire
   */
  onSubmit(): void {
    // Empêcher les soumissions multiples
    if (this.isSubmitting) {
      console.warn('📝 Soumission déjà en cours, ignorée');
      return;
    }

    if (this.categoryForm.invalid) {
      console.warn('📝 Formulaire invalide, marquage de tous les champs comme touchés');
      this.markAllFieldsAsTouched();
      return;
    }

    const formValue = this.categoryForm.value;
    console.log('📝 Soumission de la catégorie:', formValue);

    // Validation supplémentaire
    const trimmedName = formValue.name?.trim();
    if (!trimmedName || !formValue.languageId) {
      console.error('❌ Validation échouée: nom ou langue manquant');
      this.markAllFieldsAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const categoryData = {
      name: trimmedName,
      description: formValue.description?.trim() || undefined,
      languageId: formValue.languageId,
      order: formValue.order || 0,
      isActive: formValue.isActive ?? true
    };

    console.log('📤 Envoi des données:', categoryData);

    this.dictionaryService
      .submitCategory(categoryData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Catégorie soumise avec succès:', response);
          this.isSubmitting = false;
          
          if (response) {
            this.successMessage = `Catégorie "${response.name}" proposée avec succès ! Elle sera examinée par les modérateurs.`;
            this.resetForm();
            
            // Redirection après 3 secondes
            setTimeout(() => {
              this.router.navigate(['/dictionary']);
            }, 3000);
          } else {
            this.errorMessage = 'Erreur lors de la soumission de la catégorie';
          }
        },
        error: (error) => {
          console.error('❌ Erreur soumission catégorie:', error);
          this.isSubmitting = false;
          
          if (error.status === 401) {
            this.errorMessage = 'Vous devez être connecté pour proposer une catégorie';
          } else if (error.status === 403) {
            this.errorMessage = 'Vous n\'avez pas les permissions nécessaires pour proposer une catégorie';
          } else if (error.status === 409) {
            this.errorMessage = 'Une catégorie avec ce nom existe déjà pour cette langue';
          } else {
            this.errorMessage = 'Erreur lors de la soumission de la catégorie. Veuillez réessayer.';
          }
        }
      });
  }

  /**
   * Annulation du formulaire
   */
  async onCancel(): Promise<void> {
    if (this.categoryForm.dirty) {
      const ok = await this.confirmDialog.confirm({
        title: 'Quitter sans sauvegarder',
        message: 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?',
        confirmText: 'Quitter',
        type: 'warning',
      });
      if (!ok) return;
    }

    this.router.navigate(['/dictionary']);
  }

  /**
   * Réinitialisation du formulaire
   */
  private resetForm(): void {
    this.categoryForm.reset({
      name: '',
      description: '',
      languageId: '',
      order: 0,
      isActive: true
    });
    this.categoryForm.markAsUntouched();
    this.categoryForm.markAsPristine();
  }

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
   * Vérifie si un champ est invalide et a été touché
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.categoryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Obtient la longueur de la description
   */
  getDescriptionLength(): number {
    return this.categoryForm.get('description')?.value?.length || 0;
  }
}