import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  forwardRef,
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

  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() valueChange = new EventEmitter<string>();

  isOpen: boolean = false;
  selectedValues: string[] = [];

  constructor(private elementRef: ElementRef) {}

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    if (value === null || value === undefined) {
      this.selectedValues = [];
    } else if (Array.isArray(value)) {
      this.selectedValues = [...value];
    } else {
      this.selectedValues = [String(value)];
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.onTouched();
  }

  toggleOption(option: DropdownOption, event: MouseEvent): void {
    event.stopPropagation();
    if (option.disabled) return;

    if (this.multiple) {
      const index = this.selectedValues.indexOf(option.value);
      if (index === -1) {
        this.selectedValues = [...this.selectedValues, option.value];
      } else {
        this.selectedValues = this.selectedValues.filter((v) => v !== option.value);
      }
      if (this.closeOnSelect) this.isOpen = false;
    } else {
      this.selectedValues = [option.value];
      this.isOpen = false;
    }

    const emitValue = this.multiple ? this.selectedValues : this.selectedValues[0];
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

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target) && this.isOpen) {
      this.isOpen = false;
    }
  }

  onDropdownClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
