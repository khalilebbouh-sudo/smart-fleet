import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)
N = 300

vehicle_id = np.arange(1, N + 1)

mileage = RNG.integers(5_000, 250_001, size=N)
km_par_jour = np.round(RNG.uniform(20, 250, size=N), 2)
km_depuis_derniere_maint = RNG.integers(0, 15_001, size=N)
age_vehicule_annees = RNG.integers(1, 16, size=N)
nb_maintenances_passees = RNG.integers(0, 21, size=N)

# Logique métier :
# base 180 jours, réduite par la pression kilométrique et l'usure du véhicule
pression_km = (km_depuis_derniere_maint / 15_000) * 120   # 0-120 jours enlevés
pression_vitesse = (km_par_jour / 250) * 40               # 0-40 jours enlevés
pression_age = (age_vehicule_annees / 15) * 25            # 0-25 jours enlevés
pression_historique = (nb_maintenances_passees / 20) * 20  # 0-20 jours enlevés

jours_raw = 180 - pression_km - pression_vitesse - pression_age - pression_historique

# Bruit ±10 %
bruit = RNG.uniform(0.90, 1.10, size=N)
jours_bruite = jours_raw * bruit

jours_avant_prochaine_maint = np.clip(np.round(jours_bruite).astype(int), 1, 180)

df = pd.DataFrame({
    "vehicle_id": vehicle_id,
    "mileage": mileage,
    "km_par_jour": km_par_jour,
    "km_depuis_derniere_maint": km_depuis_derniere_maint,
    "age_vehicule_annees": age_vehicule_annees,
    "nb_maintenances_passees": nb_maintenances_passees,
    "jours_avant_prochaine_maint": jours_avant_prochaine_maint,
})

df.to_csv("dataset.csv", index=False)
print(f"dataset.csv généré : {len(df)} lignes")
print(df.describe().round(2))
