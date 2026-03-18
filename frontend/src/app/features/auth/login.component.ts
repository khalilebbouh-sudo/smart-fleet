import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  emailControl() {
    return this.form.controls.email;
  }

  passwordControl() {
    return this.form.controls.password;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private t: TranslateService,
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('reset') === 'success') {
      this.successMessage = this.t.instant('AUTH.RESET_SUCCESS');
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || err.error?.errors?.email?.[0] || this.t.instant('AUTH.LOGIN_FAILED');
      },
      complete: () => (this.loading = false),
    });
  }
}
