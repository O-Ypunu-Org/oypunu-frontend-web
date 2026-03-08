import { Component, OnDestroy, Renderer2 } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnDestroy {
  title = "O'Ypunu";
  showFooter = true;
  isMessagingPage = false;

  private _routerSub: Subscription;

  constructor(
    private _themeService: ThemeService,
    private _router: Router,
    private _renderer: Renderer2
  ) {
    this._routerSub = this._router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const isMessaging = e.url.startsWith('/messaging');
        this.showFooter = e.url === '/dictionary' || e.url.startsWith('/dictionary?');
        this.isMessagingPage = isMessaging;

        if (isMessaging) {
          this._renderer.addClass(document.body, 'messaging-open');
        } else {
          this._renderer.removeClass(document.body, 'messaging-open');
        }
      });
  }

  ngOnDestroy(): void {
    this._routerSub.unsubscribe();
  }
}
