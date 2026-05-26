import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-privacy-policy',
  standalone: false,
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss']
})
export class PrivacyPolicyComponent {
  lastUpdated = '26 mai 2026';
  version = 'v1.1';

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}