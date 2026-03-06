import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  LanguagesService,
  CreateLanguageDto,
} from '../../../../core/services/languages.service';

@Component({
  selector: 'app-add-language',
  standalone: false,
  templateUrl: './add-language.component.html',
  styleUrls: ['./add-language.component.scss'],
})
export class AddLanguageComponent implements OnInit, OnDestroy {
  // Formulaire principal
  languageForm: FormGroup;

  // Gestion des étapes
  currentStep = 1;
  totalSteps = 3;

  // États de l'interface
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  // Options pré-définies
  regionGroups: { continent: string; regions: string[] }[] = [
    {
      continent: 'Afrique',
      regions: [
        'Afrique du Nord',
        "Afrique de l'Ouest",
        'Afrique Centrale',
        "Afrique de l'Est",
        'Afrique Australe',
      ],
    },
    {
      continent: 'Amérique',
      regions: [
        'Amérique du Nord',
        'Amérique Centrale',
        'Caraïbes',
        'Amérique du Sud',
      ],
    },
    {
      continent: 'Asie',
      regions: [
        "Asie de l'Est",
        'Asie du Sud-Est',
        'Asie du Sud',
        'Asie Centrale',
        "Asie de l'Ouest",
      ],
    },
    {
      continent: 'Europe',
      regions: [
        "Europe de l'Ouest",
        "Europe de l'Est",
        'Europe du Nord',
        'Europe du Sud',
      ],
    },
    {
      continent: 'Océanie',
      regions: [
        'Australie et Nouvelle-Zélande',
        'Mélanésie',
        'Micronésie',
        'Polynésie',
      ],
    },
  ];

  statusOptions = [
    {
      value: 'major',
      label: 'Majeure',
      description: 'Langue parlée par des millions de personnes',
    },
    {
      value: 'regional',
      label: 'Régionale',
      description: 'Langue parlée dans une région spécifique',
    },
    {
      value: 'local',
      label: 'Locale',
      description: 'Langue parlée dans une communauté locale',
    },
    {
      value: 'liturgical',
      label: 'Liturgique',
      description: 'Langue utilisée principalement dans un contexte religieux',
    },
    {
      value: 'extinct',
      label: 'Éteinte',
      description: "Langue qui n'a plus aucun locuteur natif vivant",
    },
  ];

  endangermentOptions = [
    {
      value: 'safe',
      label: 'Sûre',
      description: 'Langue transmise naturellement aux enfants',
    },
    {
      value: 'vulnerable',
      label: 'Vulnérable',
      description: 'La plupart des enfants parlent encore la langue',
    },
    {
      value: 'endangered',
      label: 'En danger',
      description: 'Les enfants ne parlent plus la langue comme langue maternelle',
    },
    {
      value: 'unknown',
      label: 'Inconnu',
      description: 'Statut de vitalité non déterminé',
    },
  ];

  // Mapping des codes ISO pays vers leurs noms
  countryNames: { [key: string]: string } = {
    // Afrique
    'DZ': 'Algérie',
    'AO': 'Angola',
    'BJ': 'Bénin',
    'BW': 'Botswana',
    'BF': 'Burkina Faso',
    'BI': 'Burundi',
    'CM': 'Cameroun',
    'CV': 'Cap-Vert',
    'CF': 'République centrafricaine',
    'TD': 'Tchad',
    'KM': 'Comores',
    'CG': 'République du Congo',
    'CD': 'République démocratique du Congo',
    'CI': 'Côte d\'Ivoire',
    'DJ': 'Djibouti',
    'EG': 'Égypte',
    'GQ': 'Guinée équatoriale',
    'ER': 'Érythrée',
    'ET': 'Éthiopie',
    'GA': 'Gabon',
    'GM': 'Gambie',
    'GH': 'Ghana',
    'GN': 'Guinée',
    'GW': 'Guinée-Bissau',
    'KE': 'Kenya',
    'LS': 'Lesotho',
    'LR': 'Libéria',
    'LY': 'Libye',
    'MG': 'Madagascar',
    'MW': 'Malawi',
    'ML': 'Mali',
    'MR': 'Mauritanie',
    'MU': 'Maurice',
    'MA': 'Maroc',
    'MZ': 'Mozambique',
    'NA': 'Namibie',
    'NE': 'Niger',
    'NG': 'Nigéria',
    'RW': 'Rwanda',
    'ST': 'Sao Tomé-et-Principe',
    'SN': 'Sénégal',
    'SC': 'Seychelles',
    'SL': 'Sierra Leone',
    'SO': 'Somalie',
    'ZA': 'Afrique du Sud',
    'SS': 'Soudan du Sud',
    'SD': 'Soudan',
    'SZ': 'Eswatini',
    'TZ': 'Tanzanie',
    'TG': 'Togo',
    'TN': 'Tunisie',
    'UG': 'Ouganda',
    'ZM': 'Zambie',
    'ZW': 'Zimbabwe',
    // Europe
    'FR': 'France',
    'BE': 'Belgique',
    'CH': 'Suisse',
    'LU': 'Luxembourg',
    'MC': 'Monaco',
    'DE': 'Allemagne',
    'AT': 'Autriche',
    'IT': 'Italie',
    'ES': 'Espagne',
    'PT': 'Portugal',
    'GB': 'Royaume-Uni',
    'IE': 'Irlande',
    'NL': 'Pays-Bas',
    // Amérique
    'CA': 'Canada',
    'US': 'États-Unis',
    'MX': 'Mexique',
    'BR': 'Brésil',
    'AR': 'Argentine',
    'CL': 'Chili',
    'CO': 'Colombie',
    'PE': 'Pérou',
    'VE': 'Venezuela',
    'UY': 'Uruguay',
    'PY': 'Paraguay',
    'BO': 'Bolivie',
    'EC': 'Équateur',
    'GY': 'Guyana',
    'SR': 'Suriname',
    'GF': 'Guyane française',
    // Asie
    'CN': 'Chine',
    'IN': 'Inde',
    'JP': 'Japon',
    'KR': 'Corée du Sud',
    'TH': 'Thaïlande',
    'VN': 'Vietnam',
    'ID': 'Indonésie',
    'MY': 'Malaisie',
    'SG': 'Singapour',
    'PH': 'Philippines',
    'MM': 'Myanmar',
    'KH': 'Cambodge',
    'LA': 'Laos',
    'BD': 'Bangladesh',
    'PK': 'Pakistan',
    'AF': 'Afghanistan',
  };

  // Liste des codes pays disponibles (pour maintenir l'ordre)
  availableCountries = Object.keys(this.countryNames).sort((a, b) => 
    this.countryNames[a].localeCompare(this.countryNames[b])
  );

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private languagesService: LanguagesService,
    private router: Router
  ) {
    this.languageForm = this.createForm();
  }

  ngOnInit(): void {
    console.log('🎯 AddLanguageComponent initialisé');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Étape 1: Informations de base
      name: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-ZÀ-ÿ\s'\-]+$/)]],
      nativeName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-ZÀ-ÿ\s'\-]+$/)]],
      regions: [[], Validators.required],
      description: ['', [Validators.maxLength(2000)]],

      // Étape 2: Classification et codes
      iso639_1: ['', [Validators.pattern(/^[a-z]{2}$/)]],
      iso639_2: ['', [Validators.pattern(/^[a-z]{3}$/)]],
      iso639_3: ['', [Validators.pattern(/^[a-z]{3}$/)]],
      status: ['regional', Validators.required],
      endangermentStatus: ['safe'],
      speakerCount: [null, [Validators.min(1), Validators.max(8000000000)]],
      family: ['', [Validators.pattern(/^[a-zA-ZÀ-ÿ\s'\-]+$/)]],

      // Étape 3: Informations complémentaires
      countries: this.fb.array([]),
      alternativeNames: this.fb.array([]),
      wikipediaUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      ethnologueUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
    });
  }

  // Getters pour FormArrays
  get countries(): FormArray {
    return this.languageForm.get('countries') as FormArray;
  }

  get alternativeNames(): FormArray {
    return this.languageForm.get('alternativeNames') as FormArray;
  }

  // Gestion des étapes
  nextStep(): void {
    if (this.currentStep < this.totalSteps && this.isCurrentStepValid()) {
      this.currentStep++;
      this.errorMessage = '';
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = '';
    }
  }

  goToStep(step: number): void {
    if (
      step >= 1 &&
      step <= this.totalSteps &&
      step <= this.getMaxAccessibleStep()
    ) {
      this.currentStep = step;
      this.errorMessage = '';
    }
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!(
          this.languageForm.get('name')?.valid &&
          this.languageForm.get('nativeName')?.valid &&
          (this.languageForm.get('regions')?.value?.length > 0)
        );
      case 2:
        return !!this.languageForm.get('status')?.valid;
      case 3:
        return true; // Étape 3 est toujours valide (informations optionnelles)
      default:
        return false;
    }
  }

  private getMaxAccessibleStep(): number {
    // Étape 1 toujours accessible
    if (!this.isStepValid(1)) return 1;
    // Étape 2 accessible si étape 1 valide
    if (!this.isStepValid(2)) return 2;
    // Étape 3 accessible si étape 2 valide
    return 3;
  }

  private isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return !!(
          this.languageForm.get('name')?.valid &&
          this.languageForm.get('nativeName')?.valid &&
          (this.languageForm.get('regions')?.value?.length > 0)
        );
      case 2:
        return !!this.languageForm.get('status')?.valid;
      default:
        return true;
    }
  }

  // Gestion des régions (multi-sélection par checkboxes)
  onRegionToggle(region: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current: string[] = this.languageForm.get('regions')?.value || [];
    const updated = checked
      ? [...current, region]
      : current.filter((r) => r !== region);
    this.languageForm.get('regions')?.setValue(updated);
    this.languageForm.get('regions')?.markAsTouched();
  }

  // Gestion des FormArrays
  addCountry(): void {
    this.countries.push(this.fb.control('', Validators.required));
  }

  removeCountry(index: number): void {
    this.countries.removeAt(index);
  }

  addAlternativeName(): void {
    this.alternativeNames.push(
      this.fb.control('', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-ZÀ-ÿ\s'\-]+$/),
      ])
    );
  }

  removeAlternativeName(index: number): void {
    this.alternativeNames.removeAt(index);
  }

  // Soumission du formulaire
  onSubmit(): void {
    if (this.languageForm.invalid) {
      this.markFormGroupTouched(this.languageForm);
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = this.prepareSubmitData();

    console.log('📤 Données à soumettre:', formData);

    this.languagesService
      .proposeLanguage(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Langue proposée avec succès:', response);
          this.isSubmitting = false;
          this.successMessage =
            'Votre proposition de langue a été soumise avec succès ! Elle sera examinée par nos modérateurs.';

          // Redirection après 3 secondes
          setTimeout(() => {
            this.router.navigate(['/admin']);
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la proposition:', error);
          this.isSubmitting = false;

          if (error.error?.message) {
            if (Array.isArray(error.error.message)) {
              this.errorMessage = error.error.message.join(', ');
            } else {
              this.errorMessage = error.error.message;
            }
          } else {
            this.errorMessage =
              'Une erreur est survenue lors de la soumission. Veuillez réessayer.';
          }
        },
      });
  }

  private prepareSubmitData(): CreateLanguageDto {
    const formValue = this.languageForm.value;

    return {
      name: formValue.name.trim(),
      nativeName: formValue.nativeName.trim(),
      regions: formValue.regions || [],
      countries: formValue.countries.filter(
        (country: string) => country.trim() !== ''
      ),
      status: formValue.status,
      description: formValue.description?.trim() || undefined,
      iso639_1: formValue.iso639_1?.trim() || undefined,
      iso639_2: formValue.iso639_2?.trim() || undefined,
      iso639_3: formValue.iso639_3?.trim() || undefined,
      endangermentStatus: formValue.endangermentStatus || 'safe',
      speakerCount: formValue.speakerCount || undefined,
      family: formValue.family?.trim() || undefined,
      alternativeNames: formValue.alternativeNames.filter(
        (name: string) => name.trim() !== ''
      ),
      wikipediaUrl: formValue.wikipediaUrl?.trim() || undefined,
      ethnologueUrl: formValue.ethnologueUrl?.trim() || undefined,
    };
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach((c) => c.markAsTouched());
      }
    });
  }

  // Utilitaires UI
  getStepIcon(step: number): string {
    if (step < this.currentStep) return '✅';
    if (step === this.currentStep) return '📝';
    return '⏳';
  }

  getStepClass(step: number): string {
    if (step < this.currentStep) return 'bg-green-600 text-white';
    if (step === this.currentStep) return 'bg-purple-600 text-white';
    if (step <= this.getMaxAccessibleStep())
      return 'bg-gray-600 text-gray-300 hover:bg-gray-500 cursor-pointer';
    return 'bg-gray-800 text-gray-500 cursor-not-allowed';
  }

  getProgressPercentage(): number {
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  // Méthode utilitaire pour obtenir le nom d'un pays à partir de son code
  getCountryName(countryCode: string): string {
    return this.countryNames[countryCode] || countryCode;
  }
}
