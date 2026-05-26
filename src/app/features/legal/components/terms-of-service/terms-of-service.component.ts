import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-terms-of-service',
  standalone: false,
  templateUrl: './terms-of-service.component.html',
  styleUrls: ['./terms-of-service.component.scss']
})
export class TermsOfServiceComponent {
  lastUpdated = '26 mai 2026';
  version = 'v1.1';

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}