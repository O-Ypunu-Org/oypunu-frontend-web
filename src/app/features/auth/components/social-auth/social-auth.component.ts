import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-social-auth',
  standalone: false,
  templateUrl: './social-auth.component.html',
  styleUrl: './social-auth.component.scss',
})
export class SocialAuthComponent implements OnInit {
  isProcessing = true;
  errorMessage = '';

  constructor(private _route: ActivatedRoute, private _router: Router) {}

  ngOnInit(): void {
    this._route.queryParams.subscribe((params) => {
      const token = params['token'];

      if (token) {
        try {
          // Écrire dans localStorage : la fenêtre principale écoute l'événement
          // 'storage' qui se déclenche immédiatement dans les autres onglets/fenêtres,
          // sans dépendre de window.opener (effacé par COOP cross-origin).
          localStorage.setItem('social_auth_token', token);

          // Tentative de fermeture si la fenêtre a un opener accessible
          if (window.opener) {
            window.close();
          }
          // Sinon, la fenêtre principale fermera cette popup via authWindow.close()
        } catch (error) {
          this.isProcessing = false;
          this.errorMessage =
            "Une erreur est survenue lors du traitement de l'authentification.";
          console.error('Auth sociale - Erreur:', error);
        }
      } else {
        this.isProcessing = false;
        this.errorMessage = "Token d'authentification manquant.";
      }
    });
  }

  closeWindow(): void {
    window.close();
  }
}
