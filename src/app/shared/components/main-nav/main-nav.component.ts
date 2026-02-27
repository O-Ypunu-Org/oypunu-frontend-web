import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-main-nav',
  standalone: false,
  templateUrl: './main-nav.component.html',
  styleUrl: './main-nav.component.scss'
})
export class MainNavComponent implements OnInit, OnDestroy {
  isFavoritesPage = false;
  private _destroy$ = new Subject<void>();

  constructor(private _router: Router) {}

  ngOnInit(): void {
    this._checkRoute(this._router.url);
    this._router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this._destroy$))
      .subscribe((e: NavigationEnd) => this._checkRoute(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private _checkRoute(url: string): void {
    this.isFavoritesPage = url.startsWith('/favorites');
  }

  closeFavorites(): void {
    this._router.navigate(['/dictionary']);
  }
}
