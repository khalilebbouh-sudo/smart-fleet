import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  form = this.fb.nonNullable.group(
    {
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: this.passwordMatch }
  );
  showPassword = false;
  showPasswordConfirmation = false;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private t: TranslateService,
  ) {}

  private passwordMatch(g: { get: (c: string) => { value: string } | null }) {
    const p = g.get('password')?.value;
    const c = g.get('password_confirmation')?.value;
    return p && c && p === c ? null : { mismatch: true };
  }

  nameControl() {
    return this.form.controls.name;
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

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        const body = err.error;
        const msg =
          (body && typeof body === 'object' && (body as { message?: string }).message) ||
          (Array.isArray(body?.errors?.email) && body.errors.email[0]) ||
          (Array.isArray(body?.errors?.password) && body.errors.password[0]) ||
          (body?.message) ||
          this.t.instant('AUTH.REGISTRATION_FAILED');
        this.errorMessage = msg;
      },
    });
  }
}
