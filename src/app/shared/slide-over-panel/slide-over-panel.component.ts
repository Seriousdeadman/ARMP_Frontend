import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-slide-over-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-over-panel.component.html',
  styleUrl: './slide-over-panel.component.scss'
})
export class SlideOverPanelComponent {
  @Input() open = false;
  @Input() title = '';
  @Output() readonly closed = new EventEmitter<void>();

  onBackdropClick(): void {
    this.closed.emit();
  }

  onCloseClick(): void {
    this.closed.emit();
  }
}
