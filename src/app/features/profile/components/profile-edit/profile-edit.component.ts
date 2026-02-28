import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ProfileService,
  UpdateProfileData,
} from '../../services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguagesService, Language, CreateLanguageDto } from '../../../../core/services/languages.service';
import { User } from '../../../../core/models/user';

@Component({
  selector: 'app-profile-edit',
  standalone: false,
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
})
export class ProfileEditComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  isLoading    = false;
  isSaving     = false;
  error:          string | null = null;
  successMessage: string | null = null;
  currentUser: User | null = null;

  // Langues depuis l'API
  availableLanguages:     Language[] = [];
  isLoadingLanguages       = false;
  nativeLanguageSearch     = '';
  learningLanguageSearch   = '';
  showNativeDropdown       = false;

  // Proposition d'une nouvelle langue
  showProposeForm  = false;
  isProposing      = false;
  proposeError:   string | null = null;
  proposeSuccess: string | null = null;
  proposeData: Partial<CreateLanguageDto> = { name: '', nativeName: '', region: '', countries: [] };

  // Avatar
  isUploadingAvatar = false;
  avatarError: string | null = null;

  private subscriptions = new Subscription();

  constructor(
    private fb:               FormBuilder,
    private profileService:   ProfileService,
    private authService:      AuthService,
    private languagesService: LanguagesService,
    private router:           Router
  ) {
    this.profileForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadProfile();
    this.loadLanguages();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== RÔLE =====

  get userRole(): string {
    return this.currentUser?.role || this.authService.getCurrentUser()?.role || 'user';
  }

  get canProposeLanguage(): boolean {
    return ['contributor', 'admin', 'superadmin'].includes(this.userRole);
  }

  // ===== FORM =====

  private createForm(): FormGroup {
    return this.fb.group({
      username:          ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      firstName:         [''],
      lastName:          [''],
      bio:               ['', [Validators.maxLength(500)]],
      city:              [''],
      country:           [''],
      website:           ['', [Validators.pattern(/^https?:\/\/.+/)]],
      nativeLanguage:    [''],
      learningLanguages: [[]],
      isProfilePublic:   [true],
    });
  }

  // ===== CHARGEMENT =====

  private loadProfile(): void {
    this.isLoading = true;
    this.error     = null;

    const sub = this.profileService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.populateForm(user);
        this.isLoading = false;
      },
      error: () => {
        this.error    = 'Erreur lors du chargement du profil';
        this.isLoading = false;
      },
    });

    this.subscriptions.add(sub);
  }

  private populateForm(user: User): void {
    const u = user as any;
    this.profileForm.patchValue({
      username:          u.username        || '',
      firstName:         u.firstName       || '',
      lastName:          u.lastName        || '',
      bio:               u.bio             || '',
      city:              u.city            || '',
      country:           u.country         || '',
      website:           u.website         || '',
      nativeLanguage:    u.nativeLanguage  || u.nativeLanguageId || '',
      learningLanguages: u.learningLanguages || u.learningLanguageIds || [],
      isProfilePublic:   u.isProfilePublic !== false,
    });
    // Si les langues sont déjà chargées, normaliser immédiatement
    if (this.availableLanguages.length > 0) {
      this.normalizeLanguageFormValues();
    }
  }

  private loadLanguages(): void {
    this.isLoadingLanguages = true;
    const sub = this.languagesService.getActiveLanguages().subscribe({
      next: (langs) => {
        this.availableLanguages = langs;
        this.isLoadingLanguages = false;
        this.normalizeLanguageFormValues();
      },
      error: () => { this.isLoadingLanguages = false; },
    });
    this.subscriptions.add(sub);
  }

  /** Résout les codes ISO (ex: "fr") en _id MongoDB — efface les valeurs non résolues */
  private normalizeLanguageFormValues(): void {
    const resolve = (val: string): string => {
      if (!val) return '';
      const lang = this.availableLanguages.find(l =>
        l._id === val || l.iso639_1 === val || l.iso639_2 === val || l.iso639_3 === val || l.name === val
      );
      return lang?._id || ''; // '' si non trouvé : efface les codes obsolètes (ex: "fr" sans correspondance)
    };

    const native = this.profileForm.get('nativeLanguage')?.value;
    if (native) {
      const resolvedId = resolve(native);
      this.profileForm.patchValue({ nativeLanguage: resolvedId });
      if (resolvedId) {
        const lang = this.availableLanguages.find(l => l._id === resolvedId);
        if (lang) this.nativeLanguageSearch = lang.name;
      } else {
        this.nativeLanguageSearch = '';
      }
    }

    const learning: string[] = this.profileForm.get('learningLanguages')?.value || [];
    if (learning.length > 0) {
      this.profileForm.patchValue({ learningLanguages: learning.map(resolve).filter(Boolean) });
    }
  }

  // ===== FILTRES LANGUES =====

  get filteredNativeLanguages(): Language[] {
    const q = this.nativeLanguageSearch.toLowerCase().trim();
    if (!q) return this.availableLanguages;
    return this.availableLanguages.filter(l =>
      l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q)
    );
  }

  get filteredLearningLanguages(): Language[] {
    const q = this.learningLanguageSearch.toLowerCase().trim();
    if (!q) return this.availableLanguages;
    return this.availableLanguages.filter(l =>
      l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q)
    );
  }

  // ===== LANGUE NATIVE =====

  getSelectedNativeLanguage(): Language | null {
    const val = this.profileForm.get('nativeLanguage')?.value;
    if (!val) return null;
    return this.availableLanguages.find(l =>
      l._id === val || l.name === val || l.iso639_1 === val || l.iso639_2 === val
    ) || null;
  }

  selectNativeLanguage(lang: Language): void {
    this.profileForm.patchValue({ nativeLanguage: lang._id });
    this.nativeLanguageSearch = lang.name;
    this.showNativeDropdown   = false;
  }

  clearNativeLanguage(): void {
    this.profileForm.patchValue({ nativeLanguage: '' });
    this.nativeLanguageSearch = '';
  }

  onNativeSearchFocus(): void { this.showNativeDropdown = true; }
  onNativeSearchBlur(): void  { setTimeout(() => { this.showNativeDropdown = false; }, 200); }

  // ===== LANGUES APPRISES =====

  isLanguageLearning(lang: Language): boolean {
    const arr: string[] = this.profileForm.get('learningLanguages')?.value || [];
    return arr.includes(lang._id) || arr.includes(lang.name) ||
      (!!lang.iso639_1 && arr.includes(lang.iso639_1)) ||
      (!!lang.iso639_2 && arr.includes(lang.iso639_2));
  }

  onLanguageChange(lang: Language, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const arr: string[] = [...(this.profileForm.get('learningLanguages')?.value || [])];

    if (checked) {
      if (!arr.includes(lang._id)) arr.push(lang._id);
    } else {
      const idx = arr.indexOf(lang._id);
      if (idx > -1) arr.splice(idx, 1);
    }

    this.profileForm.patchValue({ learningLanguages: arr });
  }

  get selectedLearningLanguages(): Language[] {
    const arr: string[] = this.profileForm.get('learningLanguages')?.value || [];
    return this.availableLanguages.filter(l =>
      arr.includes(l._id) || arr.includes(l.name) ||
      (!!l.iso639_1 && arr.includes(l.iso639_1)) ||
      (!!l.iso639_2 && arr.includes(l.iso639_2))
    );
  }

  // ===== AFFICHAGE NOM LANGUE =====

  getLanguageName(idOrCode: string): string {
    if (!idOrCode) return '';
    const lang = this.availableLanguages.find(l =>
      l._id === idOrCode || l.name === idOrCode ||
      l.iso639_1 === idOrCode || l.iso639_2 === idOrCode
    );
    return lang?.name || idOrCode;
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.isUploadingAvatar = true;
    this.avatarError = null;

    const sub = this.profileService.uploadProfilePicture(file).subscribe({
      next: (res) => {
        if (this.currentUser) {
          (this.currentUser as any).profilePicture = res.url;
        }
        this.isUploadingAvatar = false;
      },
      error: (err) => {
        this.avatarError = err.error?.message || 'Erreur lors de l\'upload de la photo';
        this.isUploadingAvatar = false;
      },
    });

    this.subscriptions.add(sub);
  }

  // ===== PROPOSITION LANGUE =====

  toggleProposeForm(): void {
    this.showProposeForm = !this.showProposeForm;
    this.proposeError    = null;
    this.proposeSuccess  = null;
    if (this.showProposeForm) {
      this.proposeData = { name: '', nativeName: '', region: '', countries: [] };
    }
  }

  submitLanguageProposal(): void {
    if (!this.proposeData.name?.trim() || !this.proposeData.nativeName?.trim() || !this.proposeData.region?.trim()) {
      this.proposeError = 'Veuillez remplir le nom, le nom natif et la région.';
      return;
    }

    this.isProposing  = true;
    this.proposeError = null;

    const payload: CreateLanguageDto = {
      name:        this.proposeData.name!.trim(),
      nativeName:  this.proposeData.nativeName!.trim(),
      region:      this.proposeData.region!.trim(),
      countries:   this.proposeData.countries?.length ? this.proposeData.countries : [this.proposeData.region!.trim()],
    };

    const sub = this.languagesService.proposeLanguage(payload).subscribe({
      next: () => {
        this.proposeSuccess  = `"${payload.name}" a été soumis pour validation. Merci !`;
        this.isProposing     = false;
        this.showProposeForm = false;
      },
      error: (err) => {
        this.proposeError = err.error?.message || 'Erreur lors de la proposition.';
        this.isProposing  = false;
      },
    });

    this.subscriptions.add(sub);
  }

  // ===== SOUMISSION =====

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSaving  = true;
    this.error     = null;
    this.successMessage = null;

    const v = this.profileForm.value;
    const updateData: UpdateProfileData = {
      username:          v.username,
      firstName:         v.firstName  || undefined,
      lastName:          v.lastName   || undefined,
      bio:               v.bio        || undefined,
      city:              v.city       || undefined,
      country:           v.country    || undefined,
      website:           v.website    || undefined,
      nativeLanguage:    v.nativeLanguage    || undefined,
      learningLanguages: v.learningLanguages?.length ? v.learningLanguages : undefined,
      isProfilePublic:   v.isProfilePublic,
    };

    const sub = this.profileService.updateProfile(updateData).subscribe({
      next: () => {
        this.successMessage = 'Profil mis à jour avec succès !';
        this.isSaving       = false;
        setTimeout(() => this.router.navigate(['/profile']), 2000);
      },
      error: (err) => {
        this.error    = err.error?.message || 'Erreur lors de la mise à jour du profil';
        this.isSaving = false;
      },
    });

    this.subscriptions.add(sub);
  }

  onCancel(): void { this.router.navigate(['/profile']); }

  // ===== UTILITAIRES =====

  private markFormGroupTouched(): void {
    Object.values(this.profileForm.controls).forEach(c => c.markAsTouched());
  }

  getFieldError(field: string): string | null {
    const ctrl = this.profileForm.get(field);
    if (!ctrl?.errors || !ctrl.touched) return null;
    if (ctrl.errors['required'])  return `Ce champ est requis`;
    if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} caractères`;
    if (ctrl.errors['maxlength']) return `Maximum ${ctrl.errors['maxlength'].requiredLength} caractères`;
    if (ctrl.errors['pattern'])   return 'Format invalide (doit commencer par https://)';
    return null;
  }

  getInitials(): string {
    return this.currentUser?.username?.charAt(0).toUpperCase() || '';
  }
}
