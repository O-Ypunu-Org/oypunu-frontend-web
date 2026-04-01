import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ConfirmationConfig } from '../../shared/components/confirmation-modal/confirmation-modal.component';

interface ConfirmDialogState {
  config: ConfirmationConfig;
  isVisible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private stateSubject = new BehaviorSubject<ConfirmDialogState | null>(null);
  readonly state$ = this.stateSubject.asObservable();

  private resolver?: (value: boolean) => void;

  confirm(config: ConfirmationConfig): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.stateSubject.next({ config, isVisible: true });
    });
  }

  resolve(result: boolean): void {
    this.resolver?.(result);
    this.resolver = undefined;
    this.stateSubject.next(null);
  }
}
