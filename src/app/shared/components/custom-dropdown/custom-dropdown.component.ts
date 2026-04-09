import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  forwardRef,
  ViewChild,
  ElementRef as ElRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-custom-dropdown',
  standalone: false,
  templateUrl: './custom-dropdown.component.html',
  styleUrls: ['./custom-dropdown.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomDropdownComponent),
      multi: true,
    },
  ],
})
export class CustomDropdownComponent implements ControlValueAccessor {
  @Input() options: DropdownOption[] = [];
  @Input() label: string = '';
  @Input() multiple: boolean = false;
  @Input() placeholder: string = 'Sélectionner...';
  @Input() closeOnSelect: boolean = true;
  @Input() disabled: boolean = false;
  @Input() isInvalid: boolean = false;
  /** Activer la recherche dans la liste (activée automatiquement si > 7 options) */
  @Input() searchable: boolean | null = null;
  @Input() searchPlaceholder: string = 'Rechercher...';

  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('searchInput') searchInput?: ElRef<HTMLInputElement>;

  isOpen: boolean = false;
  selectedValues: string[] = [];
  searchQuery: string = '';

  constructor(private elementRef: ElementRef) {}

  onChange: any = () => {};
  onTouched: any = () => {};

  get isSearchable(): boolean {
    if (this.searchable !== null) return this.searchable;
    return this.options.length > 7;
  }

  get filteredOptions(): DropdownOption[] {
    if (!this.searchQuery.trim()) return this.options;
    const q = this.searchQuery.toLowerCase();
    return this.options.filter((opt) => opt.label.toLowerCase().includes(q));
  }

  writeValue(value: any): void {
    if (value === null || value === undefined) {
      this.selectedValues = [];
    } else if (Array.isArray(value)) {
      this.selectedValues = [...value];
    } else {
      this.selectedValues = [String(value)];
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouched();
      this.searchQuery = '';
      // Focus le champ de recherche après ouverture
      if (this.isSearchable) {
        setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
      }
    }
  }

  toggleOption(option: DropdownOption, event: MouseEvent): void {
    event.stopPropagation();
    if (option.disabled) return;

    if (this.multiple) {
      const index = this.selectedValues.indexOf(option.value);
      if (index === -1) {
        this.selectedValues = [...this.selectedValues, option.value];
      } else {
        this.selectedValues = this.selectedValues.filter(
          (v) => v !== option.value,
        );
      }
      if (this.closeOnSelect) this.isOpen = false;
    } else {
      this.selectedValues = [option.value];
      this.isOpen = false;
    }

    this.searchQuery = '';
    const emitValue = this.multiple
      ? this.selectedValues
      : this.selectedValues[0];
    this.onChange(emitValue);
    this.selectionChange.emit(this.selectedValues);
    if (!this.multiple) this.valueChange.emit(this.selectedValues[0]);
  }

  isSelected(value: string): boolean {
    return this.selectedValues.includes(value);
  }

  getSelectedLabels(): string {
    if (this.selectedValues.length === 0) return this.placeholder;
    return this.selectedValues
      .map((v) => this.options.find((opt) => opt.value === v)?.label || v)
      .join(', ');
  }

  onSearchKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Escape') {
      this.isOpen = false;
    } else if (event.key === 'Enter') {
      const first = this.filteredOptions.find((o) => !o.disabled);
      if (first) this.toggleOption(first, event as any);
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target) && this.isOpen) {
      this.isOpen = false;
      this.searchQuery = '';
    }
  }

  onDropdownClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  trackByValue(index: number, option: DropdownOption): string {
    return option.value;
  }
}
