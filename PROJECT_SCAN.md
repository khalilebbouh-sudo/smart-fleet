# Scan du projet Smart Fleet – Résumé et vérifications

## 1. Routes Angular (frontend)

Les pages **login**, **register**, **forgot-password**, **reset-password** sont chargées **directement** (pas en lazy load) via `features/auth/auth.routes.ts` pour que `/register` s’affiche toujours.

| URL | Comportement |
|-----|--------------|
| `/login` | Page de connexion (avec liens Inscription + Mot de passe oublié) |
| `/register` | Page d'inscription (nom, email, mot de passe, confirmation) |
| `/forgot-password` | Mot de passe oublié |
| `/reset-password?token=...&email=...` | Réinitialisation du mot de passe |
| `/` | Redirection vers `/dashboard` |
| `/dashboard` | Tableau de bord (protégé, auth requis) |
| `/vehicles`, `/drivers`, `/maintenances`, `/fuel` | Sections protégées avec layout |
| `**` (autre) | Redirection vers `/login` |

Les routes `login` et `register` sont en **path explicites** (pas sous un `path: ''` qui capturait tout). Cliquer sur « Inscription » ou aller sur `http://localhost:4200/register` doit afficher la page d'inscription.

## 2. Connexion – « The provided credentials are incorrect »

Cette erreur signifie que **l’email ou le mot de passe ne correspondent à aucun utilisateur** en base.

- **admin@gmail.com** n’existait pas : il a été ajouté au seeder.
- Pour créer/mettre à jour les comptes de test, exécuter dans le dossier `backend` :
  ```powershell
  php artisan db:seed --class=UserSeeder
  ```
- Comptes utilisables après le seeder :
  - **admin@gmail.com** / password  
  - **admin@fleet.local** / password  
  - **khalil@gmail.com** / password  
  - **manager@fleet.local** / password  

## 3. Démarrage du projet

**Terminal 1 – Backend**
```powershell
cd "c:\Users\khalil\Desktop\projet pff\backend"
php artisan serve
```
→ API : http://127.0.0.1:8000

**Terminal 2 – Frontend**
```powershell
cd "c:\Users\khalil\Desktop\projet pff\frontend"
npm start
```
→ App : http://localhost:4200

**Environnement** : `frontend/src/environments/environment.ts` → `apiUrl: 'http://localhost:8000/api'`. Si le backend tourne sur `127.0.0.1:8000`, ça fonctionne en local.

## 4. Fichiers clés vérifiés

- **Routes** : `frontend/src/app/app.routes.ts` – login, register, forgot-password, reset-password en premiers.
- **Login** : `frontend/src/app/features/auth/login.component.ts` – liens vers `/register` et `/forgot-password`.
- **Auth** : `frontend/src/app/core/guards/auth.guard.ts` → redirection vers `/login` si non connecté.
- **Backend auth** : `backend/routes/api.php` – POST /login, /register, /forgot-password, /reset-password.
- **Utilisateurs** : `backend/database/seeders/UserSeeder.php` – inclut admin@gmail.com, khalil@gmail.com, etc.

## 5. Si « Inscription » affiche encore la page login

1. Arrêter le serveur Angular (Ctrl+C), relancer `npm start` dans `frontend`.
2. Rechargement forcé du navigateur : **Ctrl+Shift+R** (ou fenêtre de navigation privée).
3. Tester directement : **http://localhost:4200/register** (sans passer par un lien).
4. Console navigateur (F12 → Console) : noter toute erreur rouge (lazy load, 404, etc.).

## 6. Si « Failed to fetch » ou erreur réseau

- Vérifier que le backend tourne : `php artisan serve` dans `backend`.
- Vérifier que l’URL dans `environment.ts` correspond (localhost:8000 ou 127.0.0.1:8000).
