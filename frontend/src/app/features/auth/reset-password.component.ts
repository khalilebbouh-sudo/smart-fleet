import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: this.passwordMatch }
  );
  token = '';
  showPassword = false;
  showPasswordConfirmation = false;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private t: TranslateService,
  ) {}

  private passwordMatch(g: { get: (c: string) => { value: string } | null }) {
    const p = g.get('password')?.value;
    const c = g.get('password_confirmation')?.value;
    return p && c && p === c ? null : { mismatch: true };
  }

  emailControl() {
    return this.form.controls.email;
  }

  passwordControl() {
    return this.form.controls.password;
  }

  passwordConfirmationControl() {
    return this.form.controls.password_confirmation;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirmation(): void {
    this.showPasswordConfirmation = !this.showPasswordConfirmation;
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    const email = this.route.snapshot.queryParamMap.get('email') || '';
    if (email) this.form.patchValue({ email });
    if (!this.token) this.errorMessage = this.t.instant('AUTH.INVALID_RESET_TOKEN');
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading || !this.token) return;
    this.loading = true;
    this.errorMessage = '';
    this.auth.resetPassword({
      token: this.token,
      email: this.form.getRawValue().email,
      password: this.form.getRawValue().password,
      password_confirmation: this.form.getRawValue().password_confirmation,
    }).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { reset: 'success' } }),
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err.error?.message || err.error?.errors?.email?.[0] || this.t.instant('AUTH.RESET_FAILED');
      },
    });
  }
}
