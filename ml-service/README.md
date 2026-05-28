# Smart Fleet — Module ML de prédiction de maintenance

## Description

Ce module prédit le nombre de jours avant la prochaine maintenance préventive d'un véhicule
à partir de son kilométrage, de son usage quotidien et de son historique d'entretien.
Il expose ses prédictions via une API FastAPI consommée par le backend Laravel.

## Lien avec le projet Smart Fleet

Les features du modèle correspondent directement aux tables MySQL du projet :

| Feature ML | Source base de données |
|---|---|
| `mileage` | `vehicles.mileage` |
| `km_depuis_derniere_maint` | `vehicles.mileage` − dernier `maintenances.odometer` |
| `km_par_jour` | calculé depuis l'historique des `trajets` |
| `age_vehicule_annees` | année courante − `vehicles.year` |
| `nb_maintenances_passees` | `COUNT(maintenances.id)` WHERE `vehicle_id` |

## Installation

```bash
# Créer l'environnement virtuel
python -m venv venv

# Activer (Windows)
venv\Scripts\activate

# Activer (Linux / macOS)
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

## Utilisation

```bash
# 1. Générer le dataset synthétique (300 véhicules)
python generate_dataset.py

# 2. Entraîner le modèle et sauvegarder model.pkl
python train_model.py
```

## Lancer l'API

```bash
# Windows
venv\Scripts\uvicorn api:app --reload --port 8001

# Linux / macOS
venv/bin/uvicorn api:app --reload --port 8001
```

Documentation interactive auto-générée disponible sur : http://localhost:8001/docs

### Exemple de requête curl

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "mileage": 80000,
    "km_par_jour": 120,
    "km_depuis_derniere_maint": 8500,
    "age_vehicule_annees": 5,
    "nb_maintenances_passees": 6
  }'
```

### Exemple de réponse JSON

```json
{
  "jours_avant_maintenance": 74,
  "date_prevue": "2026-08-10",
  "niveau_urgence": "faible",
  "confidence_note": "Prédiction basée sur l'historique du véhicule. Aucune urgence immédiate."
}
```

## Structure des fichiers

```
ml-service/
├── generate_dataset.py   # Génération du dataset synthétique (300 véhicules)
├── train_model.py        # Entraînement RandomForest + métriques + export
├── api.py                # API REST FastAPI (POST /predict, GET /health)
├── requirements.txt      # Dépendances Python
├── README.md             # Ce fichier
├── .gitignore
├── dataset.csv           # Généré (ignoré par git)
├── model.pkl             # Modèle entraîné (ignoré par git)
└── features.json         # Liste ordonnée des features (suivi par git)
```
