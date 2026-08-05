# Nafoore — Espace Admin

Application interne (React + Vite + Tailwind) utilisée par l'équipe Nafoore
pour piloter l'activité : comptes admin, rôles (RBAC), et — pour cette
première itération — le pipeline de recrutement/validation des enseignants.

Elle est volontairement séparée du site public (`apps/frontend`) pour isoler
le bundle et les permissions.

## Modèle RBAC

Trois rôles : `super_admin`, `admin`, `recruiter`. Un compte peut avoir
plusieurs rôles. La navigation et les pages affichées s'adaptent
automatiquement (`src/config/navigation.js`) : un compte avec uniquement le
rôle `recruiter` ne voit que le module Candidatures.

L'autorisation réelle est appliquée côté backend NestJS (guards
`SupabaseAuthGuard` + `RolesGuard`), pas seulement côté UI — cacher un lien
ne suffit jamais à protéger une route API.

## Prérequis

- Un projet Supabase (Auth + Postgres) déjà provisionné avec toutes les
  migrations de `supabase/migrations/` appliquées (`001_init.sql` à
  `006_profile_photos.sql`, dans l'ordre).
- Deux buckets **Supabase Storage privés** (Dashboard Supabase → Storage →
  New bucket → décocher "Public bucket") :
  - `student-documents` — documents élèves (bulletins, comptes-rendus)
  - `profile-photos` — photos de profil élèves/enseignants
  Dans les deux cas, le backend y accède avec la clé service role et génère
  des URL signées à la demande, jamais d'accès public direct (important pour
  des photos/documents concernant des mineurs).
- Le backend NestJS (`apps/backend`) démarré, avec un `.env` contenant
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`.

## Créer le tout premier compte Super Admin

Comme la gestion des comptes admin nécessite déjà d'être Super Admin
(oeuf-poule), le tout premier compte se crée via un script exécuté depuis
`apps/backend`, en dehors de l'UI :

```bash
cd apps/backend
npm run seed:super-admin -- --email=toi@nafoore.com --password="un-mot-de-passe-fort" --name="Ton nom"
```

Ce script (`apps/backend/scripts/create-super-admin.ts`) :
1. crée l'utilisateur dans Supabase Auth (via la clé service role) ;
2. crée la ligne `admin_accounts` correspondante ;
3. lui attribue le rôle `super_admin`.

Les comptes suivants (admin, recruteur, ou d'autres super admins) se créent
ensuite depuis l'UI (page **Comptes admin**, réservée au rôle
`super_admin`) — ils reçoivent une invitation par email (Supabase Auth) pour
définir leur propre mot de passe.

## Lancer en local

Depuis la racine du monorepo :

```bash
npm run dev:backend   # http://localhost:3000
npm run dev:admin     # http://localhost:5174
```

Crée un fichier `apps/admin/.env` (non commité) avec :

```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3000
```

Puis connecte-toi sur `http://localhost:5174` avec le compte Super Admin
créé ci-dessus.

### Mode démo

Tant que Supabase n'est pas branché, `apps/admin/.env` peut définir
`VITE_USE_MOCKS=true` : toute l'app tourne alors sur des données factices en
mémoire (`src/lib/mock/`), sans aucun appel réseau réel — pratique pour
vérifier une nouvelle fonctionnalité avant de configurer le vrai backend.
Comptes de démo : `superadmin@nafoore.test` / `admin@nafoore.test` /
`recruteur@nafoore.test`, mot de passe `password` pour les trois (affiché
aussi sur la page de connexion quand ce mode est actif). Passe à `false` (ou
retire la ligne) une fois Supabase configuré.

## RLS (Row Level Security)

Le backend NestJS accède à Postgres via une connexion directe (`DATABASE_URL`
Prisma) qui bypass la RLS — c'est la ligne de défense **primaire** via les
guards NestJS. Les policies RLS sur `admin_accounts`, `roles`,
`admin_account_roles`, `activity_logs` et `teacher_applications` sont une
défense en profondeur : elles empêchent qu'un accès direct à Postgres via la
clé Supabase anon/authenticated (en contournant le backend) expose ou
modifie ces tables.
