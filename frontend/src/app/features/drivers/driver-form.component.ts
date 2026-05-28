import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { TranslateModule } from '@ngx-translate/core';

interface VehicleOption {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
}

@Component({
  selector: 'app-driver-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="container">
      <h1 class="page-title">{{ isEdit ? ('DRIVERS.EDIT_TITLE' | translate) : ('DRIVERS.ADD_TITLE' | translate) }}</h1>
      <div class="card" style="max-width: 500px;">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Photo</label>
            @if (photoUrl && !photoFile) {
              <div class="photo-row">
                <img class="photo-preview" [src]="photoUrl" alt="Driver photo" />
                <button type="button" class="btn" (click)="clearPhoto()">Remove</button>
              </div>
            }
            <input type="file" accept="image/*" (change)="onPhotoSelected($event)" />
          </div>
          <div class="form-group">
            <label>{{ 'DRIVERS.FORM.NAME' | translate }}</label>
            <input formControlName="name" [placeholder]="'DRIVERS.FORM.FULL_NAME' | translate" />
          </div>
          <div class="form-group">
            <label>{{ 'DRIVERS.FORM.PHONE' | translate }}</label>
            <input formControlName="phone" placeholder="+1234567890" />
          </div>
          <div class="form-group">
            <label>{{ 'DRIVERS.FORM.LICENSE_NUMBER' | translate }}</label>
            <input formControlName="license_number" placeholder="DL-001" />
          </div>
          <div class="form-group">
            <label>{{ 'DRIVERS.FORM.ADDRESS' | translate }}</label>
            <textarea formControlName="address" rows="2" [placeholder]="'DRIVERS.FORM.ADDRESS_PLACEHOLDER' | translate"></textarea>
          </div>
          <div class="form-group">
            <label>{{ 'DRIVERS.FORM.ASSIGN_TO_VEHICLE' | translate }}</label>
            <select formControlName="vehicle_id">
              <option [ngValue]="null">{{ 'DRIVERS.FORM.NO_VEHICLE' | translate }}</option>
              @for (v of vehicles; track v.id) {
                <option [ngValue]="v.id">{{ v.brand }} {{ v.model }} ({{ v.license_plate }})</option>
              }
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving">
              {{ saving ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
            </button>
            <a routerLink="/drivers" class="btn">{{ 'COMMON.CANCEL' | translate }}</a>
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
export class DriverFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: this.fb.nonNullable.control('', Validators.required),
    phone: this.fb.nonNullable.control(''),
    license_number: this.fb.nonNullable.control(''),
    address: this.fb.nonNullable.control(''),
    vehicle_id: this.fb.control<number | null>(null),
  });
  photoFile: File | null = null;
  photoUrl: string | null = null;
  removePhoto = false;
  vehicles: VehicleOption[] = [];
  saving = false;
  isEdit = false;
  private id: number | null = null;

  ngOnInit(): void {
    this.api.get<{ data: VehicleOption[] }>('/vehicles', { per_page: 500 }).subscribe({
      next: (res: any) => this.vehicles = res.data || res,
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id = +id;
      this.isEdit = true;
      this.api.get<any>(`/drivers/${this.id}`).subscribe({
        next: (d) => {
          this.photoUrl = d.photo_url ?? null;
          this.form.patchValue({
            name: d.name,
            phone: d.phone ?? '',
            license_number: d.license_number ?? '',
            address: d.address ?? '',
            vehicle_id: d.vehicle_id ?? null,
          });
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
    const raw = { ...this.form.getRawValue(), vehicle_id: this.form.get('vehicle_id')?.value ?? null };
    const form = new FormData();
    Object.entries(raw).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      form.append(k, String(v));
    });
    if (this.photoFile) form.append('photo', this.photoFile);
    if (this.removePhoto) form.append('remove_photo', '1');

    const req = this.id
      ? (form.append('_method', 'PUT'), this.api.postForm(`/drivers/${this.id}`, form))
      : this.api.postForm('/drivers', form);
    req.subscribe({
      next: () => this.router.navigate(['/drivers']),
      complete: () => (this.saving = false),
    });
  }
}
