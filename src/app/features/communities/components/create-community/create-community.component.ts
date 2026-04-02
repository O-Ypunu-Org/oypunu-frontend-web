import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DropdownOption } from '../../../../shared/components/custom-dropdown/custom-dropdown.component';
import { Router } from '@angular/router';
import { CommunitiesService } from '../../../../core/services/communities.service';

@Component({
  selector: 'app-create-community',
  standalone: false,
  templateUrl: './create-community.component.html',
  styleUrl: './create-community.component.scss',
})
export class CreateCommunityComponent implements OnInit {
  communityForm!: FormGroup;
  submitted = false;
  isLoading = false;
  errorMessage: string | null = null;
  tags: string[] = [];
  newTag: string = '';
  coverImagePreview: string | null = null;
  availableLanguages: Array<{ _id: string; name: string; nativeName: string }> = [];

  get languageOptions(): DropdownOption[] {
    return this.availableLanguages.map((lang) => ({
      value: lang._id,
      label: lang.nativeName || lang.name,
    }));
  }

  constructor(
    private formBuilder: FormBuilder,
    private communitiesService: CommunitiesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.communitiesService.getAllSystemLanguages().subscribe({
      next: (langs) => (this.availableLanguages = langs),
      error: () => (this.availableLanguages = []),
    });
  }

  initForm(): void {
    this.communityForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      language: ['', [Validators.required]],
      description: ['', [Validators.maxLength(1000)]],
      isPrivate: [false],
      coverImage: [''],
    });
  }

  // Getter pour un accès facile aux contrôles du formulaire
  get f() {
    return this.communityForm.controls;
  }

  addTag(): void {
    if (this.newTag.trim() && !this.tags.includes(this.newTag.trim())) {
      this.tags.push(this.newTag.trim());
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  onSubmit(): void {
    this.submitted = true;

    // Arrêter ici si le formulaire est invalide
    if (this.communityForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formData = {
      ...this.communityForm.value,
      tags: this.tags,
    };

    this.communitiesService.create(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response && response._id) {
          this.router.navigate(['/communities', response._id]);
        } else {
          this.router.navigate(['/communities']);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          'Une erreur est survenue lors de la création de la communauté. Veuillez réessayer.';
      },
    });
  }
}
