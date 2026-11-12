# Contribuer à LifeCraft

Merci de vouloir contribuer à LifeCraft, un jeu de sandbox et de survie en 2D vu de côté (minage, construction, exploration), réaliste, dynamique et animé, jouable dans le navigateur et sur mobile.

## Règles communes du studio

Ce dépôt suit les règles de contribution d'OpenGamingStudio, qui ne sont **pas recopiées ici** :
**[OpenGamingStudio/.github : CONTRIBUTING.md](https://github.com/OpenGamingStudio/.github/blob/main/CONTRIBUTING.md)**

Elles couvrent notamment : les branches (`feat/…`, `fix/…`, `docs/…`, `chore/…`), les Conventional Commits, les tests, la revue obligatoire, l'utilisation de Context7 pour la documentation des bibliothèques, l'interdiction des secrets, les contributions externes via fork, le code de conduite et les modèles d'issue et de PR.

Ce document ne contient que ce qui est **propre à LifeCraft**.

## Originalité : règle n° 1

LifeCraft est une création 100 % originale.

- Aucun nom, aucune image, aucun son, aucune mécanique nommée ni aucun code repris d'un jeu existant, même « en hommage ».
- Chaque asset (image, son, police) est listé dans `assets/SOURCES.md` avec son auteur, sa source et sa licence, ou avec la mention « créé pour LifeCraft ».
- Les assets tiers ne sont acceptés que sous licence **CC0** ou **MIT**, avec leur provenance documentée.
- Une PR qui ne respecte pas cette règle est refusée, quelle que soit sa qualité.

## Stack

- **TypeScript** (strict), sans moteur de jeu.
- **Vite** pour le serveur de développement et le build statique.
- **Canvas 2D** pour le rendu.
- **Vitest** pour les tests.
- Un minimum de dépendances : chaque nouvelle dépendance doit être justifiée dans la PR.
- Aucune dépendance réseau quand le jeu tourne : il fonctionne entièrement hors ligne une fois chargé.

## Lancer et tester en local

Prérequis : Node.js LTS et npm.

```bash
npm install          # installe les dépendances
npm run dev          # serveur local avec rechargement à chaud
npm test             # tests Vitest (logique du monde, physique, génération)
npm run lint         # linter
npm run typecheck    # vérification des types TypeScript
npm run build        # site statique dans dist/ (c'est ce qui est déployé)
```

Avant d'ouvrir une PR : `lint`, `typecheck`, `test` et `build` doivent tous réussir en local, puis la CI doit être verte.

> Le code du jeu est en cours d'amorçage : ces scripts arrivent avec le premier squelette du projet.

## Structure du code

```
src/
  world/    grille de tuiles, chunks, génération du monde
  render/   canvas, caméra, animations
  player/   physique, inventaire, minage et construction
  input/    clavier, tactile (joystick et boutons virtuels), manette en option
  audio/    sons et musique
  ui/       menus, HUD, inventaire affiché
assets/     images et sons originaux
  SOURCES.md  auteur, source et licence de chaque asset
tests/      tests Vitest (ou *.test.ts à côté du code)
```

La logique du jeu (monde, physique, génération) reste **pure et testable**, séparée du rendu et des entrées.

## Ce qu'on attend d'une contribution LifeCraft

- **Tests** : toute logique de monde, de physique ou de génération est couverte par des tests ; un correctif inclut un test de non-régression.
- **Performance** : 60 images par seconde visées sur un mobile de milieu de gamme. Rendu par chunks avec cache hors écran, aucune allocation dans la boucle de jeu, rien n'est redessiné hors de l'écran. La PR indique son impact sur les performances.
- **Clavier et tactile** : chaque fonctionnalité jouable marche au clavier **et** au tactile.
- **Sauvegarde** : les sauvegardes sont locales et versionnées ; un changement de format inclut sa migration.
- **PR** : un seul sujet, une description claire, des captures ou une courte vidéo pour tout changement visible.
- **Licence** : en contribuant, tu acceptes que ta contribution soit publiée sous la licence MIT du dépôt.

## Proposer une idée

Pour une nouvelle mécanique ou un gros changement, ouvre d'abord une issue (une issue = un sujet, avec ses critères d'acceptation) pour en discuter avant de coder.
