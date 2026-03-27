import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment.development';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {

  passwordForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService

) {
    this.passwordForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });
  }

  get oldPassword() { return this.passwordForm.get('oldPassword'); }
  get newPassword() { return this.passwordForm.get('newPassword'); }
  get confirmPassword() { return this.passwordForm.get('confirmPassword'); }

  onSubmit(): void {
    if (this.passwordForm.invalid) return;

    if (this.newPassword?.value !== this.confirmPassword?.value) {
      this.errorMessage = 'New passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const params = new HttpParams()
      .set('oldPassword', this.oldPassword?.value)
      .set('newPassword', this.newPassword?.value);

    this.http.post<void>(
      `${environment.apiUrl}/api/profile/change-password`,
      null,
      { params }
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success('Password changed. Logging you out...');
        setTimeout(() => {
          this.authService.logout();
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error(
          err.status === 400
            ? 'Current password is incorrect.'
            : 'Something went wrong. Please try again.'
        );
      }
    });
  }
}
