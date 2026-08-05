# Nafoore — Monorepo MVP

Plateforme EdTech de soutien scolaire pour les familles, mairies et entreprises.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | NestJS + Prisma |
| Base de données / Auth | Supabase (PostgreSQL) |

## Structure

```
nafoore/
  apps/
    frontend/          → React + Vite + Tailwind
    backend/           → NestJS + Prisma
  supabase/
    migrations/        → SQL versionné (001_init.sql)
  .env.example
  package.json         → npm workspaces
  README.md
```

---

## Démarrage local

### 1. Prérequis

- Node.js ≥ 20
- npm ≥ 10
- Un projet Supabase créé sur [supabase.com](https://supabase.com)

### 2. Variables d'environnement

```bash
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env
```

Remplis les valeurs dans `apps/backend/.env` :
- `DATABASE_URL` — connection string **Transaction mode (port 6543)** de ton projet Supabase  
  *(Settings → Database → Connection string → Transaction)*
- `DIRECT_URL` — connection string **Direct (port 5432)**  
  *(Settings → Database → Connection string → Direct)*

Remplis `apps/frontend/.env` :
- `VITE_API_URL=http://localhost:3000`

### 3. Base de données Supabase

**Option A — SQL Editor (recommandé pour démarrer)**

Copie le contenu de `supabase/migrations/001_init.sql` et exécute-le dans le SQL Editor de ton projet Supabase.

**Option B — Prisma migrate (si DATABASE_URL configuré)**

```bash
cd apps/backend
npm install
npx prisma migrate dev --name init
```

### 4. Lancer le frontend

```bash
# Depuis la racine du monorepo
npm install
npm run dev:frontend
```

Le frontend est disponible sur [http://localhost:5173](http://localhost:5173).

### 5. Lancer le backend

```bash
# Dans un second terminal
npm run dev:backend
```

Le backend est disponible sur [http://localhost:3000](http://localhost:3000).

> Au premier lancement du backend, génère le client Prisma :
> ```bash
> cd apps/backend && npx prisma generate
> ```

---

## API

### `POST /contacts`

Crée un nouveau lead depuis le formulaire de contact.

**Body JSON**

```json
{
  "profile": "famille",     // famille | mairie | entreprise
  "name": "Jean Dupont",
  "email": "jean@exemple.fr",
  "phone": "06 12 34 56 78", // optionnel
  "message": "Je cherche un soutien en maths pour mon fils de 3ème."
}
```

**Réponse 201**

```json
{
  "id": "clxyz...",
  "createdAt": "2025-01-01T10:00:00.000Z",
  "profile": "famille",
  "name": "Jean Dupont",
  "email": "jean@exemple.fr",
  "phone": "06 12 34 56 78",
  "message": "...",
  "status": "new"
}
```

---

## Commandes utiles

```bash
# Frontend
npm run dev:frontend          # dev server sur :5173
npm run build:frontend        # build de production

# Backend
npm run dev:backend           # dev server sur :3000 (hot reload)
npm run build:backend         # build TypeScript

# Prisma (depuis apps/backend)
npx prisma studio             # UI base de données
npx prisma migrate dev        # créer une migration
npx prisma generate           # regénérer le client
```

---

## Supabase — liens utiles

- **Dashboard** : [supabase.com/dashboard](https://supabase.com/dashboard)
- **Connection strings** : Settings → Database
- **API keys** : Settings → API
- **SQL Editor** : pour exécuter les migrations manuellement
- **Auth** : prévu pour l'espace admin (non prioritaire en v1)
