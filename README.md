# Liste de courses

Application web (Next.js + PostgreSQL) qui permet d'ajouter des articles avec une quantité, de les cocher une fois achetés et de retirer d'un clic tous les articles achetés.

## Prérequis

- Docker Engine **24** ou plus récent (testé avec 29.6.2)
- Docker Compose **v2.20** ou plus récent (testé avec v5.3.1)
- Le port **3000** libre sur la machine (modifiable via `APP_PORT`)

Aucune installation de Node.js ni de PostgreSQL n'est nécessaire.

## Démarrage

```bash
git clone <url-du-depot> liste-courses
cd liste-courses
cp .env.example .env
docker compose up -d --build
```

Sous Windows PowerShell, remplacer `cp` par `Copy-Item .env.example .env`.

Le premier lancement prend environ une minute (téléchargement des images et build).

## Accès

Ouvrir **http://localhost:3000** dans un navigateur (ou le port choisi dans `APP_PORT`).

## Variables d'environnement (`.env`)

| Variable            | Rôle                                                  | Exemple      |
|---------------------|-------------------------------------------------------|--------------|
| `POSTGRES_USER`     | Utilisateur PostgreSQL créé au premier démarrage      | `courses`    |
| `POSTGRES_PASSWORD` | Mot de passe de cet utilisateur                       | `change-moi` |
| `POSTGRES_DB`       | Nom de la base créée au premier démarrage             | `courses`    |
| `APP_PORT`          | Port de l'hôte sur lequel l'application est publiée   | `3000`       |

L'application reçoit `DATABASE_URL`, construite dans `compose.yaml` à partir de ces valeurs (hôte `db` = nom du service).
Les identifiants ne sont lus qu'à la **création** du volume : pour les changer ensuite, faire `docker compose down -v` (efface les données).

## Commandes utiles

```bash
docker compose logs -f web                          # suivre les logs de l'application
docker compose logs -f db                           # suivre les logs de la base
docker compose exec web sh                          # ouvrir un shell dans le conteneur web
docker compose exec db psql -U courses -d courses   # console SQL
docker compose down                                 # tout arrêter (les données sont conservées)
docker compose down -v                              # tout arrêter ET supprimer les données
```
