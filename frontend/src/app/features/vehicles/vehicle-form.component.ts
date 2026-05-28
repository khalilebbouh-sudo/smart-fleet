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
            <label>Photo</label>
            @if (photoUrl && !photoFile) {
              <div class="photo-row">
                <img class="photo-preview" [src]="photoUrl" alt="Vehicle photo" />
                <button type="button" class="btn" (click)="clearPhoto()">Remove</button>
              </div>
            }
            <input type="file" accept="image/*" (change)="onPhotoSelected($event)" />
          </div>
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
    .photo-row { display:flex; align-items:center; gap: .75rem; margin-bottom: .5rem; }
    .photo-preview { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; border: 1px solid #e5e7eb; }
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
  photoFile: File | null = null;
  photoUrl: string | null = null;
  removePhoto = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id = +id;
      this.isEdit = true;
      this.api.get<ReturnType<typeof this.form.getRawValue>>(`/vehicles/${this.id}`).subscribe({
        next: (v: any) => {
          this.photoUrl = v.photo_url ?? null;
          this.form.patchValue({ ...v, mileage: v.mileage ?? 0 });
        },
      });
    }
  }

  onPhotoSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.photoFile = file;
    this.removePhoto = false;
  }

  clearPhoto(): void {
    this.photoFile = null;
    this.photoUrl = null;
    this.removePhoto = true;
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const raw = this.form.getRawValue();
    const form = new FormData();
    Object.entries(raw).forEach(([k, v]) => form.append(k, String(v)));
    if (this.photoFile) form.append('photo', this.photoFile);
    if (this.removePhoto) form.append('remove_photo', '1');

    const req = this.id
      ? (form.append('_method', 'PUT'), this.api.postForm(`/vehicles/${this.id}`, form))
      : this.api.postForm('/vehicles', form);
    req.subscribe({
      next: () => this.router.navigate(['/vehicles']),
      complete: () => (this.saving = false),
    });
  }
}
