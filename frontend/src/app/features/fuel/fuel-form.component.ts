import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-fuel-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="container">
      <h1 class="page-title">{{ isEdit ? ('FUEL.EDIT_TITLE' | translate) : ('FUEL.ADD_TITLE' | translate) }}</h1>
      <div class="card" style="max-width: 500px;">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>{{ 'FUEL.FORM.VEHICLE' | translate }}</label>
            <select formControlName="vehicle_id">
              @for (v of vehicles; track v.id) {
                <option [value]="v.id">{{ v.license_plate }} – {{ v.brand }} {{ v.model }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'FUEL.FORM.LITERS' | translate }}</label>
            <input type="number" step="0.01" formControlName="liters" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label>{{ 'FUEL.FORM.PRICE' | translate }}</label>
            <input type="number" step="0.01" formControlName="price" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label>{{ 'FUEL.FORM.DATE' | translate }}</label>
            <input type="date" formControlName="date" />
          </div>
          <div class="form-group">
            <label>{{ 'FUEL.FORM.ODOMETER' | translate }}</label>
            <input type="number" step="1" formControlName="odometer" [placeholder]="'FUEL.FORM.ODOMETER_PLACEHOLDER' | translate" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving">
              {{ saving ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
            </button>
            <a routerLink="/fuel" class="btn">{{ 'COMMON.CANCEL' | translate }}</a>
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
export class FuelFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    vehicle_id: [0, Validators.required],
    liters: [0, [Validators.required, Validators.min(0)]],
    price: [0, [Validators.required, Validators.min(0)]],
    date: ['', Validators.required],
    odometer: [0, [Validators.required, Validators.min(0)]],
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
          this.form.patchValue({ vehicle_id: this.vehicles[0].id, date: new Date().toISOString().split('T')[0] });
        }
      },
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id = +id;
      this.isEdit = true;
      this.api.get<any>(`/fuel-records/${this.id}`).subscribe({
        next: (r) => this.form.patchValue({
          vehicle_id: r.vehicle_id,
          liters: parseFloat(r.liters) || 0,
          price: parseFloat(r.price) || 0,
          date: r.date?.split('T')[0] ?? '',
          odometer: r.odometer ?? 0,
        }),
      });
    } else {
      this.form.patchValue({ date: new Date().toISOString().split('T')[0] });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const body = this.form.getRawValue();
    const req = this.id
      ? this.api.put(`/fuel-records/${this.id}`, body)
      : this.api.post('/fuel-records', body);
    req.subscribe({
      next: () => this.router.navigate(['/fuel']),
      complete: () => (this.saving = false),
    });
  }
}
