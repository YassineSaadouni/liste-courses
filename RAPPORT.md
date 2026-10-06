# Rapport — Liste de courses

Mesures prises sur ma machine : Windows 11, Docker 29.6.2, Docker Compose v5.3.1.

## 1. Image de base

J'utilise `node:24.21.0-bookworm-slim` pour l'application et `postgres:17.11-alpine` pour la base, toutes deux officielles et avec un tag figé à la version de patch.

| Variante                     | Taille  |
|------------------------------|---------|
| `node:24.21.0` (complète)    | 1,66 Go |
| `node:24.21.0-bookworm-slim` | 332 Mo  |
| `node:24.21.0-alpine`        | 242 Mo  |

- **Pas la complète** : elle embarque gcc, python, git, etc., utiles pour compiler des modules natifs. Mon projet n'en a aucun (`pg` est en pur JavaScript) : c'est 1,3 Go inutile.
- **Pas alpine** : Alpine utilise la libc **musl** au lieu de glibc. Next.js s'appuie sur des binaires précompilés (compilateur SWC, éventuellement `sharp`) dont les variantes musl sont moins testées. Pour 90 Mo d'écart, je préfère la compatibilité de Debian slim (glibc), qui reste légère.
- Pour PostgreSQL, je ne construis pas l'image et la variante alpine est officielle et bien maintenue : je prends la plus légère.

## 2. Cache

Le Dockerfile est en trois étapes (multi-stage), du plus stable au plus volatil :

```dockerfile
FROM node:24.21.0-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./   # change rarement
RUN npm ci                               # long, mis en cache

FROM node:24.21.0-bookworm-slim AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .                                 # change à chaque modif de code
RUN npm run build

FROM node:24.21.0-bookworm-slim AS run
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
CMD ["node", "server.js"]
```

Quand je modifie une ligne de `app/page.js`, seul le contexte copié par `COPY . .` change. Tout ce qui précède (`npm ci`, copie des `node_modules`) est repris du cache ; seuls `COPY . .`, `npm run build` et les deux `COPY` de l'étape finale sont rejoués.

**Build 1** — `docker compose build --no-cache --progress=plain web` (à froid) :

```
#7 [deps 2/4] WORKDIR /app                                         DONE 3.5s
#8 [deps 3/4] COPY package.json package-lock.json ./               DONE 0.1s
#9 [deps 4/4] RUN npm ci                                           DONE 31.8s
#10 [build 3/5] COPY --from=deps /app/node_modules ./node_modules  DONE 4.8s
#11 [build 4/5] COPY . .                                           DONE 0.1s
#12 [build 5/5] RUN npm run build                                  DONE 14.6s
#13 [run 3/4] COPY --from=build /app/.next/standalone ./           DONE 0.5s
#14 [run 4/4] COPY --from=build /app/.next/static ./.next/static   DONE 0.1s
real    1m6.708s
```

**Build 2** — après avoir changé le texte « article(s) restant(s) » en « article(s) à acheter » dans `app/page.js` :

```
#7 [deps 2/4] WORKDIR /app                                         CACHED
#8 [deps 3/4] COPY package.json package-lock.json ./               CACHED
#9 [deps 4/4] RUN npm ci                                           CACHED
#10 [build 3/5] COPY --from=deps /app/node_modules ./node_modules  CACHED
#11 [build 4/5] COPY . .                                           DONE 0.1s
#12 [build 5/5] RUN npm run build                                  DONE 9.1s
#13 [run 3/4] COPY --from=build /app/.next/standalone ./           DONE 0.5s
#14 [run 4/4] COPY --from=build /app/.next/static ./.next/static   DONE 0.1s
real    0m14.239s
```

Le build passe de **1 min 07 s à 14 s** : `npm ci` (32 s) n'est plus rejoué. Si `COPY . .` était placé avant `npm ci`, chaque modification de code relancerait l'installation des dépendances.

## 3. Taille

| Version | Taille |
|---------|--------|
| Avant : `FROM node:24.21.0`, un seul stage, `COPY . .` puis `npm install` + `npm run build` | **2,38 Go** |
| Après : `bookworm-slim` + multi-stage + `output: "standalone"` | **384 Mo** |

Le gain (÷ 6) vient de trois choses :

1. **Image de base slim** au lieu de la complète : −1,3 Go.
2. **Multi-stage** : l'image finale ne contient ni le `node_modules` complet (outils de build, SWC…), ni le code source, ni le cache de build ; seulement le résultat.
3. **`output: "standalone"`** dans `next.config.mjs` : Next.js ne copie que les fichiers réellement utilisés à l'exécution. `docker history liste-courses-web` montre que la couche applicative ne pèse que **41 Mo** ; le reste (332 Mo) est l'image de base.

Le `.dockerignore` évite en plus d'envoyer `node_modules` et `.next` locaux dans le contexte de build.

## 4. Persistance

Les données PostgreSQL sont dans le volume nommé `db-data`, monté sur `/var/lib/postgresql/data` (le répertoire de données de l'image `postgres:17`). Le volume existe en dehors du conteneur, sous le nom `liste-courses_db-data`.

- **`docker compose down` puis `up`** : les conteneurs et le réseau sont supprimés, mais **pas le volume**. Au `up`, un nouveau conteneur `db` remonte le même volume ; PostgreSQL y trouve une base déjà initialisée, n'exécute donc pas `init.sql`, et les articles sont toujours là. Vérifié : l'article « chocolat » inséré est toujours présent après `restart` et après `down`/`up`.
- **`docker compose down -v`** : le volume est **supprimé** (`Volume liste-courses_db-data Removed`). Au `up` suivant, le volume est vide : l'entrypoint de PostgreSQL recrée l'utilisateur et la base à partir des variables de `.env`, puis exécute `db/init.sql` (`running /docker-entrypoint-initdb.d/init.sql` dans les logs), qui recrée la table `items` vide. Vérifié : `SELECT count(*) FROM items` renvoie 0.

## 5. Difficulté

<!-- À remplacer par ton propre récit si tu as rencontré un autre problème. -->

En testant la persistance, je vérifiais que l'article « lait » était toujours affiché avec `curl -s localhost:3000 | grep lait`. Le test passait… y compris après un `docker compose down -v`, ce qui était impossible puisque le volume venait d'être supprimé (`Volume liste-courses_db-data Removed`).

Diagnostic : j'ai compté les occurrences (`grep -c lait` → `1`) puis interrogé directement la base avec `docker compose exec db psql -U courses -d courses -c "SELECT count(*) FROM items"` → `0`. La base était bien vide : le mot « lait » venait du **placeholder** du champ de saisie (`Ex : lait`), présent dans le HTML même sans aucune donnée. Mon test vérifiait la page, pas les données.

Correction : j'ai refait le test avec un article absent du code (« chocolat ») en vérifiant à la fois la page **et** la base via `psql`. Leçon : vérifier la persistance à la source (la base), pas seulement à l'affichage.
