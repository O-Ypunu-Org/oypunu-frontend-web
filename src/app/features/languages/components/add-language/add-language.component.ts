import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  LanguagesService,
  CreateLanguageDto,
} from '../../../../core/services/languages.service';
import { AdminApiService } from '../../../admin/services/admin-api.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-add-language',
  standalone: false,
  templateUrl: './add-language.component.html',
  styleUrls: ['./add-language.component.scss'],
})
export class AddLanguageComponent implements OnInit, OnDestroy {
  /** Mode admin : soumet vers l'endpoint admin/create et affiche le champ isActive */
  @Input() isAdmin = false;
  /** Langue à modifier (mode édition admin) */
  @Input() editLanguage: any = null;

  // Formulaire principal
  languageForm: FormGroup;

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
    private adminApiService: AdminApiService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.languageForm = this.createForm();
  }

  ngOnInit(): void {
    // Détecter le mode admin depuis le rôle utilisateur (une seule source de vérité)
    const user = this.authService.getCurrentUser();
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      this.isAdmin = true;
    }

    // Pré-remplit le formulaire si editLanguage passé en @Input
    if (this.editLanguage) {
      this.patchFormWithLanguage(this.editLanguage);
      return;
    }

    // Mode édition depuis la route /languages/edit/:id
    const languageId = this.route.snapshot.paramMap.get('id');
    if (languageId) {
      // Admin → endpoint admin (retourne tous les champs y compris systemStatus)
      // Contributeur → endpoint public (GET /languages/:id)
      const fetch$: Observable<any> = this.isAdmin
        ? this.adminApiService.getLanguageById(languageId)
        : this.languagesService.getLanguageById(languageId);

      fetch$.pipe(takeUntil(this.destroy$)).subscribe({
        next: (lang) => {
          this.editLanguage = lang;
          this.patchFormWithLanguage(lang);
        },
        error: () => {
          this.errorMessage = 'Impossible de charger la langue à modifier.';
        },
      });
    }
  }

  private patchFormWithLanguage(lang: any): void {
    this.languageForm.patchValue({
      name: lang.name ?? '',
      nativeName: lang.nativeName ?? '',
      regions: lang.regions ?? [],
      description: lang.description ?? '',
      iso639_1: lang.iso639_1 ?? '',
      iso639_2: lang.iso639_2 ?? '',
      iso639_3: lang.iso639_3 ?? '',
      status: lang.status ?? 'regional',
      endangermentStatus: lang.endangermentStatus ?? 'safe',
      speakerCount: lang.speakerCount ?? null,
      family: lang.family ?? '',
      wikipediaUrl: lang.wikipediaUrl ?? '',
      ethnologueUrl: lang.ethnologueUrl ?? '',
      isActive: lang.isActive ?? true,
    });
    // Pays
    (lang.countries ?? []).forEach((c: string) =>
      this.countries.push(this.fb.control(c, Validators.required))
    );
    // Noms alternatifs
    (lang.alternativeNames ?? []).forEach((n: string) =>
      this.alternativeNames.push(this.fb.control(n, [Validators.required, Validators.minLength(2)]))
    );
    // Sources
    (lang.sources ?? []).forEach((s: string) =>
      this.sources.push(this.fb.control(s, [Validators.required, Validators.maxLength(500)]))
    );
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
      sources: this.fb.array([]),

      // Admin only
      isActive: [true],
    });
  }

  // Getters pour FormArrays
  get countries(): FormArray {
    return this.languageForm.get('countries') as FormArray;
  }

  get alternativeNames(): FormArray {
    return this.languageForm.get('alternativeNames') as FormArray;
  }

  get sources(): FormArray {
    return this.languageForm.get('sources') as FormArray;
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

  addSource(): void {
    if (this.sources.length >= 10) return;
    this.sources.push(
      this.fb.control('', [
        Validators.required,
        Validators.maxLength(500),
        Validators.pattern(/^(?!.*<[^>]+>)(?!.*javascript:).+$/i),
      ])
    );
  }

  removeSource(index: number): void {
    this.sources.removeAt(index);
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

    const langId = this.editLanguage?._id || this.editLanguage?.id;
    const request$: Observable<any> = this.editLanguage
      ? this.isAdmin
        ? this.adminApiService.updateLanguageAdmin(langId, formData)
        : this.languagesService.updateMyProposal(langId, formData)
      : this.isAdmin
        ? this.adminApiService.createLanguageAdmin(formData)
        : this.languagesService.proposeLanguage(formData);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.successMessage = this.isAdmin
            ? (this.editLanguage ? 'Langue mise à jour avec succès.' : 'Langue créée avec succès.')
            : 'Votre proposition de langue a été soumise avec succès ! Elle sera examinée par nos modérateurs.';

          setTimeout(() => {
            this.router.navigate([this.isAdmin ? '/admin/languages' : '/profile']);
          }, 2000);
        },
        error: (error) => {
          this.isSubmitting = false;
          if (error.error?.message) {
            this.errorMessage = Array.isArray(error.error.message)
              ? error.error.message.join(', ')
              : error.error.message;
          } else {
            this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
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
      sources: (formValue.sources as string[])
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0),
      ...(this.isAdmin ? { isActive: formValue.isActive ?? true } : {}),
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

  // Méthode utilitaire pour obtenir le nom d'un pays à partir de son code
  getCountryName(countryCode: string): string {
    return this.countryNames[countryCode] || countryCode;
  }
}
