import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

interface AuthResponse {
  tokens: {
    access_token: string;
    refresh_token: string;
  };
  user: any;
}

@Component({
  selector: 'app-social-auth',
  standalone: false,
  templateUrl: './social-auth.component.html',
  styleUrl: './social-auth.component.scss',
})
export class SocialAuthComponent implements OnInit {
  isProcessing = true;
  isSuccess = false;
  errorMessage = '';

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _http: HttpClient,
    private _authService: AuthService,
  ) {}

  ngOnInit(): void {
    this._route.queryParams.subscribe((params) => {
      const token = params['token'];
      const error = params['error'];

      if (error) {
        this.isProcessing = false;
        this.errorMessage = this._getErrorMessage(error);
        return;
      }

      if (token) {
        // Appeler directement l'API pour valider le token et obtenir les vrais tokens
        this._http
          .get<AuthResponse>(
            `${environment.apiUrl}/auth/social-auth-callback?token=${token}`,
          )
          .subscribe({
            next: (response) => {
              // Stocker les tokens dans localStorage
              localStorage.setItem(
                'access_token',
                response.tokens.access_token,
              );
              if (response.tokens.refresh_token) {
                localStorage.setItem(
                  'refresh_token',
                  response.tokens.refresh_token,
                );
              }
              localStorage.setItem('user', JSON.stringify(response.user));

              // Mettre à jour le AuthService pour que le header soit synchronisé
              this._authService.updateCurrentUser(response.user);

              this.isProcessing = false;
              this.isSuccess = true;

              // Rediriger vers la page d'accueil après un court délai
              setTimeout(() => {
                this._router.navigate(['/dictionary']);
              }, 1000);
            },
            error: (err) => {
              this.isProcessing = false;
              this.errorMessage =
                err.error?.message ||
                "L'authentification a échoué. Veuillez réessayer.";
            },
          });
      } else {
        this.isProcessing = false;
        this.errorMessage = "Token d'authentification manquant.";
      }
    });
  }

  private _getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      google_not_configured: "L'authentification Google n'est pas configurée.",
      facebook_not_configured:
        "L'authentification Facebook n'est pas configurée.",
      twitter_not_configured:
        "L'authentification Twitter n'est pas configurée.",
      social_auth_failed: "L'authentification a échoué. Veuillez réessayer.",
    };
    return (
      errorMessages[errorCode] ||
      "Une erreur est survenue lors de l'authentification."
    );
  }

  goToLogin(): void {
    this._router.navigate(['/auth/login']);
  }
}
