import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { RegisterResponse } from '../../../../core/models/auth-response';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  contextMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private _fb: FormBuilder,
    private _router: Router,
    private _route: ActivatedRoute,
    private _authService: AuthService,
    private _toastService: ToastService
  ) {
    this.registerForm = this._fb.group(
      {
        username: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[a-zA-Z0-9_-]+$/),
            Validators.minLength(3),
            Validators.maxLength(30),
          ],
        ],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
        confirmPassword: ['', Validators.required],
        hasAcceptedTerms: [false, [Validators.requiredTrue]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    // Vérifier s'il y a un contexte spécifique dans les paramètres de la route
    this._route.queryParams.subscribe((params) => {
      if (params['action'] === 'favorite') {
        this.contextMessage =
          '💙 Créez votre compte pour ajouter des mots à vos favoris et accéder à toutes les fonctionnalités !';
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this._toastService.warning(
        'Formulaire invalide',
        'Veuillez corriger les erreurs dans le formulaire avant de continuer'
      );
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { username, email, password, hasAcceptedTerms } = this.registerForm.value;

    this._authService
      .register(username, email, password, undefined, hasAcceptedTerms)
      .subscribe({
        next: (response: RegisterResponse) => {
          this.isSubmitting = false;

          if (response.tokens && response.user) {
            // Cas de l'inscription par réseau social ou sans vérification email
            this._toastService.success(
              '🎉 Inscription réussie !',
              `Bienvenue ${response.user.username} ! Votre compte a été créé avec succès.`,
              4000
            );

            // Redirection immédiate vers l'accueil
            setTimeout(() => {
              this._router.navigate(['/dictionary']);
            }, 1500);
          } else {
            // Cas de l'inscription classique avec vérification email
            this._toastService.success(
              '📧 Inscription réussie !',
              'Un email de vérification a été envoyé à votre adresse. Vérifiez votre boîte email.',
              8000
            );

            // Feedback visuel avec compte à rebours après un délai
            setTimeout(() => {
              this._showEmailVerificationFeedback();
            }, 3000);
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this._handleRegistrationError(error);
        },
      });
  }

  /**
   * Affichage du feedback avec compte à rebours pour vérification email
   */
  private _showEmailVerificationFeedback(): void {
    let countdown = 5;

    // Afficher le toast initial avec le compte à rebours
    this._toastService.info(
      '⏱️ Redirection en cours',
      `Redirection vers la page de connexion dans ${countdown} secondes...`,
      5000
    );

    // Démarrer le compte à rebours sans créer de nouveaux toasts
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        this._router.navigate(['/auth/login']);
      }
    }, 1000);
  }

  /**
   * Gestion spécifique des erreurs d'inscription
   */
  private _handleRegistrationError(error: any): void {
    console.error("Erreur d'inscription:", error);

    let title = "Erreur d'inscription";
    let message = 'Une erreur inattendue est survenue';

    // Gestion spécifique selon le type d'erreur
    if (error.status === 409) {
      if (error.message?.includes('email')) {
        title = 'Email déjà utilisé';
        message = 'Cette adresse email est déjà associée à un compte existant.';
      } else if (error.message?.includes('username')) {
        title = "Nom d'utilisateur déjà pris";
        message = "Ce nom d'utilisateur est déjà utilisé. Essayez-en un autre.";
      } else {
        title = 'Compte existant';
        message = 'Un compte avec ces informations existe déjà.';
      }
    } else if (error.status === 400) {
      title = 'Données invalides';
      message = error.message || 'Vérifiez vos informations et réessayez.';
    } else if (error.status === 422) {
      title = 'Validation échouée';
      message = 'Certaines informations ne respectent pas les critères requis.';
    } else if (error.status === 429) {
      title = 'Trop de tentatives';
      message =
        "Trop de tentatives d'inscription. Réessayez dans quelques minutes.";
    } else if (error.status === 0) {
      title = 'Problème de connexion';
      message = 'Vérifiez votre connexion internet et réessayez.';
    } else if (error.message?.includes('password')) {
      title = 'Mot de passe faible';
      message =
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.';
    }

    this._toastService.error(title, message, 6000);
  }

  /**
   * Inscription avec Google
   */
  registerWithGoogle(): void {
    this.isSubmitting = true;

    this._toastService.info(
      'Redirection en cours...',
      'Vous allez être redirigé vers Google pour créer votre compte'
    );

    this._authService.loginWithGoogle().subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const username = response.user?.username || 'utilisateur';
        this._toastService.success(
          '🎉 Inscription Google réussie !',
          `Bienvenue ${username} ! Votre compte a été créé via Google.`,
          4000
        );

        setTimeout(() => {
          this._router.navigate(['/dictionary']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        this._handleSocialRegistrationError(error, 'Google');
      },
    });
  }

  /**
   * Inscription avec Facebook
   */
  registerWithFacebook(): void {
    this.isSubmitting = true;

    this._toastService.info(
      'Redirection en cours...',
      'Vous allez être redirigé vers Facebook pour créer votre compte'
    );

    this._authService.loginWithFacebook().subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const username = response.user?.username || 'utilisateur';
        this._toastService.success(
          '🎉 Inscription Facebook réussie !',
          `Bienvenue ${username} ! Votre compte a été créé via Facebook.`,
          4000
        );

        setTimeout(() => {
          this._router.navigate(['/dictionary']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        this._handleSocialRegistrationError(error, 'Facebook');
      },
    });
  }

  /**
   * Inscription avec Twitter
   */
  registerWithTwitter(): void {
    this.isSubmitting = true;

    this._toastService.info(
      'Redirection en cours...',
      'Vous allez être redirigé vers Twitter pour créer votre compte'
    );

    this._authService.loginWithTwitter().subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const username = response.user?.username || 'utilisateur';
        this._toastService.success(
          '🎉 Inscription Twitter réussie !',
          `Bienvenue ${username} ! Votre compte a été créé via Twitter.`,
          4000
        );

        setTimeout(() => {
          this._router.navigate(['/dictionary']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        this._handleSocialRegistrationError(error, 'Twitter');
      },
    });
  }

  /**
   * Gestion spécifique des erreurs d'inscription sociale
   */
  private _handleSocialRegistrationError(error: any, provider: string): void {
    console.error(`Erreur d'inscription ${provider}:`, error);

    let title = `Erreur d'inscription ${provider}`;
    let message = "Une erreur est survenue lors de l'inscription";

    if (error.status === 401) {
      title = 'Autorisation refusée';
      message = `L'autorisation ${provider} a été refusée ou annulée.`;
    } else if (error.status === 409) {
      title = 'Compte existant';
      message = `Un compte avec cette adresse ${provider} existe déjà.`;
    } else if (error.status === 403) {
      title = 'Compte non autorisé';
      message = `Votre compte ${provider} n'est pas autorisé à s'inscrire.`;
    } else if (error.status === 0) {
      title = 'Problème de connexion';
      message = 'Vérifiez votre connexion internet et réessayez.';
    } else if (error.message?.includes('popup')) {
      title = 'Popup bloquée';
      message = 'Autorisez les popups pour vous inscrire via ' + provider;
    }

    this._toastService.error(title, message, 6000);
  }
}
