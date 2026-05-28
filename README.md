# Smart Fleet Management

Web-based fleet management application: vehicles, drivers, maintenance, and fuel tracking with role-based access (Administrator & Fleet Manager).

---

## Enregistrer le projet (pour demain)

Pour garder tout ton travail jusqu’à demain :

1. **Sauvegarder les fichiers**  
   Dans Cursor/VS Code : **Ctrl+S** sur chaque fichier modifié, ou **Ctrl+K** puis **S** pour tout sauver.

2. **Enregistrer dans Git** (recommandé)  
   Dans un terminal à la racine du projet :
   ```powershell
   cd "c:\Users\khalil\Desktop\projet pff"
   git add .
   git commit -m "Sauvegarde Smart Fleet"
   ```
   Ton projet est alors enregistré dans l’historique Git. Tu peux rouvrir le même dossier demain et tout sera là.

3. **Ne pas supprimer le dossier**  
   Le projet est dans `c:\Users\khalil\Desktop\projet pff`. Garde ce dossier sur ton PC.

**Guide détaillé :** voir le fichier **OUVRIR_PROJET.txt** à la racine du projet (explications pas à pas, pourquoi chaque commande, et dépannage).

---

## À chaque ouverture du projet

Chaque fois que tu rouvres le projet, lance **2 terminaux** et exécute les commandes suivantes.

**Terminal 1 – Backend (API)**  
```powershell
cd "c:\Users\khalil\Desktop\projet pff\backend"
php artisan serve
```
→ Laisser tourner. L’API sera sur **http://127.0.0.1:8000**

**Terminal 2 – Frontend (Angular)**  
```powershell
cd "c:\Users\khalil\Desktop\projet pff\frontend"
npm start
```
→ Laisser tourner. L’app sera sur **http://localhost:4200** (ou un autre port si 4200 est pris)

**Ensuite**  
Ouvre dans le navigateur : **http://localhost:4200**  
Connexion possible avec : **admin@gmail.com** / **password** (ou khalil@gmail.com / password).

**Guide détaillé :** voir **OUVRIR_PROJET.txt** (étapes détaillées, deux terminaux, ouverture du navigateur, arrêt des serveurs).

---

## Stack

- **Frontend:** Angular (CLI 17.x)
- **Backend:** Laravel 11 REST API
- **Database:** MySQL / MariaDB

## Environnement de développement (versions mémorisées)

Versions utilisées sur la machine de développement :

| Outil | Version |
|-------|---------|
| Node.js | v20.20.0 |
| npm | 10.8.2 |
| Angular CLI | 17.8.2 |
| PHP | 8.2.12 |
| Composer | 2.8.9 |
| Git | 2.49.0.windows.1 |
| MariaDB | 15.1 Distrib 10.4.32 |
| Laravel | 11.48.0 |

## Prerequisites

- PHP 8.2+, Composer
- Node.js 18+, npm
- MySQL 8+ ou MariaDB 10.4+

## Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env: set DB_DATABASE, DB_USERNAME, DB_PASSWORD, FRONTEND_URL=http://localhost:4200
composer install
php artisan key:generate
composer dump-autoload
php artisan migrate
php artisan db:seed
php artisan serve
```

If you get "Class App\Models\User not found", run `composer dump-autoload` in the backend folder.

**Windows PowerShell:** To open the frontend folder from the project root use: `cd ".\frontend"` or `cd "C:\Users\...\projet pff\frontend"` (quotes required when the path contains spaces).

API base: `http://localhost:8000`.

**Comptes de test (après `php artisan db:seed` ou `php artisan db:seed --class=UserSeeder`) :**

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| admin@gmail.com | password | Administrator |
| admin@fleet.local | password | Administrator |
| khalil@gmail.com | password | Administrator |
| manager@fleet.local | password | Fleet Manager |

## Frontend setup

```bash
cd frontend
npm install
npm start
```

App: `http://localhost:4200`. Set `apiUrl` in `src/environments/environment.ts` if the API runs elsewhere.

## Roles

| Role            | Vehicles     | Drivers | Maintenance      | Fuel             | Dashboard |
|----------------|-------------|---------|------------------|------------------|-----------|
| Administrator  | Full CRUD   | Full    | Full CRUD        | Full CRUD        | Yes       |
| Fleet Manager  | View only   | —       | View + Add       | View + Add       | Yes       |

## API overview

### Auth (public)
- `POST /api/login` — Login (email, password)
- `POST /api/register` — Register (name, email, password, password_confirmation)
- `POST /api/forgot-password` — Forgot password (email)
- `POST /api/reset-password` — Reset password (token, email, password, password_confirmation)

### Auth (protected)
- `POST /api/logout` — Logout (Bearer token)
- `GET /api/user` — Current user (auth)
- `GET /api/dashboard` — Dashboard stats (auth)
- `GET|POST /api/vehicles`, `GET|PUT|DELETE /api/vehicles/{id}` — Vehicles (admin for write)
- `GET|POST|PUT|DELETE /api/drivers` — Drivers (admin only)
- `GET|POST /api/maintenances`, `PUT|DELETE` (admin)
- `GET|POST /api/fuel-records`, `PUT|DELETE` (admin)

All protected routes use `Authorization: Bearer <token>` (Laravel Sanctum).

## Project structure

```
backend/          # Laravel API
  app/Models/
  app/Http/Controllers/Api/
  routes/api.php
  database/migrations/
frontend/         # Angular SPA
  src/app/
    core/         # auth, guards, API service
    features/     # auth, dashboard, vehicles, drivers, maintenances, fuel
    layout/
```

## Non-functional notes

- **Performance:** API responses kept small; list endpoints are paginated (target &lt; 2s).
- **Security:** All protected routes require authentication; role middleware enforces admin/fleet manager.
- **Scalability:** Modular backend and frontend allow adding modules (e.g. GPS, analytics) later.
