import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  /** Avoid naming this `open` — conflicts with native `open` on HTMLElement. */
  @Input() visible = false;
  @Input() dialogTitle = 'Confirm';
  /** Avoid naming this `message` — conflicts with `postMessage` / DOM messaging typings in strict templates. */
  @Input() confirmBody = '';
  @Input() confirmLabel = 'Delete';
  @Input() cancelLabel = 'Cancel';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<void>();

  onCancel(): void {
    this.visibleChange.emit(false);
  }

  onConfirm(): void {
    this.confirmed.emit();
    this.visibleChange.emit(false);
  }
}
