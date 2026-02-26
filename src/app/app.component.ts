import { Component } from '@angular/core';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = "O'Ypunu";

  // Injection du ThemeService pour l'instancier au démarrage
  // et appliquer immédiatement le thème sauvegardé (ou dark par défaut).
  constructor(private _themeService: ThemeService) {}
}
