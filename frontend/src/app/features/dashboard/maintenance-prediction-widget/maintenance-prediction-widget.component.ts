import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaintenancePredictionService } from '../../../core/services/maintenance-prediction.service';
import { MaintenancePrediction } from '../../../core/models/maintenance-prediction.model';

const URGENCY_ORDER: Record<string, number> = { eleve: 0, moyen: 1, faible: 2 };

@Component({
  selector: 'app-maintenance-prediction-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './maintenance-prediction-widget.component.html',
  styleUrl: './maintenance-prediction-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePredictionWidgetComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal<string | null>(null);
  predictions = signal<MaintenancePrediction[]>([]);
  urgentCount = signal(0);
  refreshingIds = signal<Set<number>>(new Set());

  constructor(
    private svc: MaintenancePredictionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.svc
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const sorted = [...(res.data ?? [])].sort(
            (a, b) => (URGENCY_ORDER[a.urgency_level] ?? 3) - (URGENCY_ORDER[b.urgency_level] ?? 3),
          );
          this.predictions.set(sorted);
          this.urgentCount.set(sorted.filter((p) => p.urgency_level !== 'faible').length);
          this.loading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error.set('Service de prédiction indisponible');
          this.loading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  refresh(p: MaintenancePrediction): void {
    this.refreshingIds.set(new Set([...this.refreshingIds(), p.id]));
    this.cdr.markForCheck();

    this.svc
      .refresh(p.vehicle_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = this.predictions().map((x) => (x.id === p.id ? res.data : x));
          const sorted = [...list].sort(
            (a, b) => (URGENCY_ORDER[a.urgency_level] ?? 3) - (URGENCY_ORDER[b.urgency_level] ?? 3),
          );
          this.predictions.set(sorted);
          this.urgentCount.set(sorted.filter((x) => x.urgency_level !== 'faible').length);
          const ids = new Set(this.refreshingIds());
          ids.delete(p.id);
          this.refreshingIds.set(ids);
          this.cdr.markForCheck();
        },
        error: () => {
          const ids = new Set(this.refreshingIds());
          ids.delete(p.id);
          this.refreshingIds.set(ids);
          this.cdr.markForCheck();
        },
      });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  urgencyLabel(level: string): string {
    if (level === 'eleve') return 'Élevé';
    if (level === 'moyen') return 'Moyen';
    return 'Faible';
  }

  trackPrediction(_: number, p: MaintenancePrediction): number {
    return p.id;
  }
}
