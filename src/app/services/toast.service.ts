import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private toasts = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toasts.asObservable();
  private counter = 0;

  success(message: string): void {
    this.add(message, 'success');
  }

  error(message: string): void {
    this.add(message, 'error');
  }

  info(message: string): void {
    this.add(message, 'info');
  }

  private add(message: string, type: 'success' | 'error' | 'info'): void {
    const id = this.counter++;
    const toast: Toast = { id, message, type };
    this.toasts.next([...this.toasts.getValue(), toast]);
    setTimeout(() => this.remove(id), 3500);
  }

  remove(id: number): void {
    this.toasts.next(
      this.toasts.getValue().filter(t => t.id !== id)
    );
  }
}
