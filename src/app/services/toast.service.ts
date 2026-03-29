import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private toasts = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toasts.asObservable();
  private counter = 0;

  success(message: string): void {
    this.add({ message, type: 'success' });
  }

  error(message: string): void {
    this.add({ message, type: 'error' });
  }

  info(message: string): void {
    this.add({ message, type: 'info' });
  }

  /**
   * Success toast with an action (e.g. Undo). Callback should not throw; it is invoked once.
   */
  successWithAction(
    message: string,
    actionLabel: string,
    onAction: () => void,
    durationMs = 8000
  ): void {
    const id = this.counter++;
    const toast: Toast = {
      id,
      message,
      type: 'success',
      durationMs,
      actionLabel,
      onAction: () => {
        onAction();
        this.remove(id);
      }
    };
    this.toasts.next([...this.toasts.getValue(), toast]);
    setTimeout(() => this.remove(id), durationMs);
  }

  private add(partial: Omit<Toast, 'id'>): void {
    const id = this.counter++;
    const toast: Toast = { id, ...partial, durationMs: partial.durationMs ?? 3500 };
    this.toasts.next([...this.toasts.getValue(), toast]);
    setTimeout(() => this.remove(id), toast.durationMs);
  }

  remove(id: number): void {
    this.toasts.next(
      this.toasts.getValue().filter(t => t.id !== id)
    );
  }
}
