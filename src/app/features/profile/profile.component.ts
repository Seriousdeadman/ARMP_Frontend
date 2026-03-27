import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { User } from '../../models/user.models';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {

  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private toastService: ToastService
  )  {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      department: [''],
      preferredLanguage: ['']
    });
  }

  ngOnInit(): void {
    this.http.get<User>(`${environment.apiUrl}/api/users/me`).subscribe({
      next: (user) => {
        this.profileForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          department: user.department,
          preferredLanguage: user.preferredLanguage
        });
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load profile.';
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) return;
    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.put<User>(
      `${environment.apiUrl}/api/users/me`,
      this.profileForm.value
    ).subscribe({
      next: () => {
        this.isSaving = false;
        this.toastService.success('Profile updated successfully.');
      },
      error: () => {
        this.isSaving = false;
        this.toastService.error('Failed to update profile.');
      }
    });
  }
}
