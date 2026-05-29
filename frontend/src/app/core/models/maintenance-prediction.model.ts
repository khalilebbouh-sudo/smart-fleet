export interface MaintenancePrediction {
  id: number;
  vehicle_id: number;
  predicted_days: number;
  predicted_date: string;
  urgency_level: 'faible' | 'moyen' | 'eleve';
  features_snapshot: Record<string, unknown>;
  confidence_note: string | null;
  model_version: string | null;
  created_at: string;
  vehicle?: {
    id: number;
    brand: string;
    model: string;
    license_plate: string;
    mileage: number;
    photo_url: string | null;
  };
}
