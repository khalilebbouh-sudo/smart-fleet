import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  loading = false;
  errorMessage = '';
  successMessage = '';
  resetUrl = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private t: TranslateService,
  ) {}

  emailControl() {
    return this.form.controls.email;
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.resetUrl = '';
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: (res) => {
        this.successMessage = res.message;
        if (res.reset_url) this.resetUrl = res.reset_url;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || this.t.instant('AUTH.FORGOT_FAILED');
      },
    });
  }
}
