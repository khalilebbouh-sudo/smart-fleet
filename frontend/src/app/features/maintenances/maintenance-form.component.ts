import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-maintenance-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="container">
      <h1 class="page-title">{{ isEdit ? ('MAINTENANCE.EDIT_TITLE' | translate) : ('MAINTENANCE.ADD_TITLE' | translate) }}</h1>
      <div class="card" style="max-width: 500px;">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>{{ 'MAINTENANCE.FORM.VEHICLE' | translate }}</label>
            <select formControlName="vehicle_id">
              @for (v of vehicles; track v.id) {
                <option [value]="v.id">{{ v.license_plate }} – {{ v.brand }} {{ v.model }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'MAINTENANCE.FORM.TYPE' | translate }}</label>
            <input formControlName="maintenance_type" [placeholder]="'MAINTENANCE.FORM.TYPE_PLACEHOLDER' | translate" />
          </div>
          <div class="form-group">
            <label>{{ 'MAINTENANCE.FORM.DESCRIPTION' | translate }}</label>
            <textarea formControlName="description" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label>{{ 'MAINTENANCE.FORM.DATE' | translate }}</label>
            <input type="date" formControlName="date" />
          </div>
          <div class="form-group">
            <label>{{ 'MAINTENANCE.FORM.ODOMETER' | translate }}</label>
            <input type="number" step="1" formControlName="odometer" [placeholder]="'MAINTENANCE.FORM.ODOMETER_PLACEHOLDER' | translate" />
          </div>
          <div class="form-group">
            <label>{{ 'MAINTENANCE.FORM.COST' | translate }}</label>
            <input type="number" step="0.01" formControlName="cost" placeholder="0.00" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving">
              {{ saving ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
            </button>
            <a routerLink="/maintenances" class="btn">{{ 'COMMON.CANCEL' | translate }}</a>
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
export class MaintenanceFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    vehicle_id: [0, Validators.required],
    maintenance_type: ['', Validators.required],
    description: [''],
    date: ['', Validators.required],
    odometer: [0, [Validators.required, Validators.min(0)]],
    cost: [0, [Validators.required, Validators.min(0)]],
  });
  vehicles: { id: number; brand: string; model: string; license_plate: string }[] = [];
  saving = false;
  isEdit = false;
  private id: number | null = null;

  ngOnInit(): void {
    this.api.get<{ data: any[] }>('/vehicles', { per_page: 500 }).subscribe({
      next: (res: any) => {
        this.vehicles = res.data || res;
        if (this.vehicles.length && !this.form.get('vehicle_id')?.value) {
          this.form.patchValue({ vehicle_id: this.vehicles[0].id });
        }
      },
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id = +id;
      this.isEdit = true;
      this.api.get<any>(`/maintenances/${this.id}`).subscribe({
        next: (m) => this.form.patchValue({
          vehicle_id: m.vehicle_id,
          maintenance_type: m.maintenance_type,
          description: m.description ?? '',
          date: m.date?.split('T')[0] ?? '',
          odometer: m.odometer ?? 0,
          cost: parseFloat(m.cost) || 0,
        }),
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const body = this.form.getRawValue();
    const req = this.id
      ? this.api.put(`/maintenances/${this.id}`, body)
      : this.api.post('/maintenances', body);
    req.subscribe({
      next: () => this.router.navigate(['/maintenances']),
      complete: () => (this.saving = false),
    });
  }
}
