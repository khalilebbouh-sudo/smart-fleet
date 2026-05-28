import json
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

# ---------------------------------------------------------------------------
# Initialisation de l'application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Smart Fleet ML API",
    description="Prédiction du nombre de jours avant la prochaine maintenance préventive.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Chargement unique du modèle au démarrage
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent
_model = None
_features: list[str] = []

try:
    _model = joblib.load(BASE_DIR / "model.pkl")
    with open(BASE_DIR / "features.json") as f:
        _features = json.load(f)
except FileNotFoundError:
    pass  # /health indiquera model_loaded: false


def _require_model():
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail="Modèle non chargé. Exécutez d'abord train_model.py.",
        )


# ---------------------------------------------------------------------------
# Schémas Pydantic
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    mileage: int = Field(..., ge=0, description="Kilométrage actuel du véhicule")
    km_par_jour: float = Field(..., ge=0, le=500, description="Kilométrage quotidien moyen")
    km_depuis_derniere_maint: int = Field(..., ge=0, description="Km depuis la dernière maintenance")
    age_vehicule_annees: int = Field(..., ge=0, description="Âge du véhicule en années")
    nb_maintenances_passees: int = Field(..., ge=0, description="Nombre de maintenances effectuées")

    @model_validator(mode="after")
    def check_coherence(self):
        if self.km_depuis_derniere_maint > self.mileage:
            raise ValueError(
                "km_depuis_derniere_maint ne peut pas dépasser mileage."
            )
        return self


class PredictResponse(BaseModel):
    jours_avant_maintenance: int
    date_prevue: str
    niveau_urgence: str
    confidence_note: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    features: list[str]
    version: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", tags=["info"])
def root():
    return {
        "service": "Smart Fleet ML API",
        "endpoints": ["/predict", "/health", "/docs"],
    }


@app.get("/health", response_model=HealthResponse, tags=["info"])
def health():
    return HealthResponse(
        status="ok",
        model_loaded=_model is not None,
        features=_features,
        version="1.0.0",
    )


@app.post("/predict", response_model=PredictResponse, tags=["prediction"])
def predict(payload: PredictRequest):
    _require_model()

    # Construire le vecteur dans l'ordre exact des features d'entraînement
    values = [getattr(payload, feat) for feat in _features]
    X = np.array(values, dtype=float).reshape(1, -1)

    jours = int(round(float(_model.predict(X)[0])))
    jours = max(1, min(jours, 365))  # garde-fous métier

    date_prevue = (date.today() + timedelta(days=jours)).isoformat()

    if jours < 7:
        niveau = "eleve"
        note = "Maintenance très urgente : intervenir dans la semaine."
    elif jours < 15:
        niveau = "moyen"
        note = "Planifier la maintenance dans les deux prochaines semaines."
    else:
        niveau = "faible"
        note = "Prédiction basée sur l'historique du véhicule. Aucune urgence immédiate."

    return PredictResponse(
        jours_avant_maintenance=jours,
        date_prevue=date_prevue,
        niveau_urgence=niveau,
        confidence_note=note,
    )
