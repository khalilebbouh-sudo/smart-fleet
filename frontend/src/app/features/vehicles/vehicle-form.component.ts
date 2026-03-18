import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="container">
      <h1 class="page-title">{{ isEdit ? ('VEHICLES.EDIT_TITLE' | translate) : ('VEHICLES.ADD_TITLE' | translate) }}</h1>
      <div class="card" style="max-width: 500px;">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>{{ 'VEHICLES.FORM.BRAND' | translate }}</label>
            <input formControlName="brand" placeholder="Toyota" />
          </div>
          <div class="form-group">
            <label>{{ 'VEHICLES.FORM.MODEL' | translate }}</label>
            <input formControlName="model" placeholder="Hilux" />
          </div>
          <div class="form-group">
            <label>{{ 'VEHICLES.FORM.LICENSE_PLATE' | translate }}</label>
            <input formControlName="license_plate" placeholder="ABC-1234" />
          </div>
          <div class="form-group">
            <label>{{ 'VEHICLES.FORM.YEAR' | translate }}</label>
            <input type="number" formControlName="year" placeholder="2022" />
          </div>
          <div class="form-group">
            <label>{{ 'VEHICLES.FORM.MILEAGE' | translate }}</label>
            <input type="number" formControlName="mileage" placeholder="0" />
          </div>
          <div class="form-group">
            <label>{{ 'VEHICLES.FORM.STATUS' | translate }}</label>
            <select formControlName="status">
              <option value="active">{{ 'VEHICLES.STATUS_ACTIVE' | translate }}</option>
              <option value="maintenance">{{ 'VEHICLES.STATUS_MAINTENANCE' | translate }}</option>
              <option value="inactive">{{ 'VEHICLES.STATUS_INACTIVE' | translate }}</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving">
              {{ saving ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
            </button>
            <a routerLink="/vehicles" class="btn">{{ 'COMMON.CANCEL' | translate }}</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-title { margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600; }
    .form-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
  `],
})
export class VehicleFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    brand: ['', Validators.required],
    model: ['', Validators.required],
    license_plate: ['', Validators.required],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
    mileage: [0, [Validators.required, Validators.min(0)]],
    status: ['active' as const, Validators.required],
  });
  saving = false;
  isEdit = false;
  private id: number | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id = +id;
      this.isEdit = true;
      this.api.get<ReturnType<typeof this.form.getRawValue>>(`/vehicles/${this.id}`).subscribe({
        next: (v) => this.form.patchValue({ ...v, mileage: v.mileage ?? 0 }),
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const body = this.form.getRawValue();
    const req = this.id
      ? this.api.put(`/vehicles/${this.id}`, body)
      : this.api.post('/vehicles', body);
    req.subscribe({
      next: () => this.router.navigate(['/vehicles']),
      complete: () => (this.saving = false),
    });
  }
}
