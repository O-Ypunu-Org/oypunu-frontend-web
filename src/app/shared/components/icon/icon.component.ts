import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICONS, IconName } from './icon-registry';

/**
 * Icône partagée — glyphes Heroicons (24/outline), voir icon-registry.ts.
 * Usage : <app-icon name="check-circle" [size]="20" color="#22c55e"></app-icon>
 */
@Component({
  selector: 'app-icon',
  standalone: false,
  template: `<svg
    [attr.width]="size"
    [attr.height]="size"
    viewBox="0 0 24 24"
    fill="none"
    [attr.stroke]="color || 'currentColor'"
    stroke-width="1.5"
    aria-hidden="true"
    [innerHTML]="safeInner"
  ></svg>`,
  styles: [':host { display: inline-flex; line-height: 0; }'],
})
export class IconComponent implements OnChanges {
  @Input() name!: IconName;
  @Input() size = 24;
  @Input() color?: string;

  safeInner: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    const svg = ICONS[this.name];
    if (!svg) {
      console.warn(`Icon "${this.name}" not found`);
      this.safeInner = '';
      return;
    }
    this.safeInner = this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
