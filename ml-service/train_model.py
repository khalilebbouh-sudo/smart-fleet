import json
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

# Chargement
df = pd.read_csv("dataset.csv")

FEATURES = ["mileage", "km_par_jour", "km_depuis_derniere_maint",
            "age_vehicule_annees", "nb_maintenances_passees"]
TARGET = "jours_avant_prochaine_maint"

X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)

model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

# Métriques
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
rmse = mean_squared_error(y_test, y_pred) ** 0.5
r2 = r2_score(y_test, y_pred)

print("=" * 48)
print("  PERFORMANCES SUR LE JEU DE TEST (20 %)")
print("=" * 48)
print(f"  MAE  (erreur absolue moyenne) : {mae:.2f} jours")
print(f"  RMSE (erreur quadratique)     : {rmse:.2f} jours")
print(f"  R²   (variance expliquée)     : {r2:.4f}")
print("=" * 48)

# Importance des features
importance_df = (
    pd.DataFrame({"feature": FEATURES, "importance": model.feature_importances_})
    .sort_values("importance", ascending=False)
    .reset_index(drop=True)
)
importance_df["importance_%"] = (importance_df["importance"] * 100).round(2)
print("\nIMPORTANCE DES FEATURES :")
print(importance_df[["feature", "importance_%"]].to_string(index=False))
print()

# Sauvegarde
joblib.dump(model, "model.pkl")
with open("features.json", "w") as f:
    json.dump(FEATURES, f)

print("Modèle sauvegardé dans model.pkl")
print("Features sauvegardées dans features.json")
