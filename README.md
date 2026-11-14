# LifeCraft

Jeu de sandbox et de survie en 2D, vue de côté : minage, construction et exploration. Création 100 % originale, jouable dans le navigateur et sur mobile.

2D side-view sandbox and survival game: mining, building and exploration. 100% original creation, playable in the browser and on mobile.

- Jouer / Play : https://lifecraft.opengamingstudio.com 
- Licence : [MIT](LICENSE)
- Projet de [OpenGamingStudio](https://github.com/OpenGamingStudio), studio de jeux web open source.

## Jouer / Play

Ouvre le lien ci-dessus : aucun compte, aucune installation, tout tourne hors ligne une fois chargé.
Open the link above: no account, no install, fully offline once loaded.

### Commandes / Controls

| Action | Clavier / souris | Mobile |
|---|---|---|
| Marcher | A / D ou ← / → | manette, à gauche |
| Sauter | Espace, W ou ↑ | bouton Saut, ou manette poussée vers le haut |
| Miner (maintenir) | clic gauche sur un bloc | toucher l'écran, mode **Miner** |
| Poser un bloc | clic droit | toucher l'écran, mode **Poser** (bouton Miner / Poser) |
| Choisir la case | 1–9, 0 ou molette | toucher la barre (elle défile au doigt sur petit écran) |
| Fabrication (fendre, cordelette, Banc d'artisan, outils) | C | bouton Fabriquer |
| Menu (son, nouveau monde) | Échap | bouton ☰ |
| Son on/off | M | menu |

Le monde est un terrain fini généré à partir d'une graine : surface, arbres, terre, pierre, minerais (cuivre, fer, cristal lumineux) et grottes. Le jour devient nuit toutes les 5 minutes ; une lanterne éclaire autour de toi. Les chutes de plus de 4 blocs font mal ; à 0 PV tu réapparais au point de départ. Fendre un Tronc, tresser des Fibres de Feuillage et poser un Banc d'artisan donnent des outils de latte ou de pierre (2 et 3,5 fois plus rapides, durabilité 40 et 90). La partie est sauvegardée automatiquement dans le navigateur (localStorage).

## Développer / Develop

Prérequis : Node.js 18+ et npm.

```bash
npm ci            # dépendances
npm run dev       # serveur local (rechargement à chaud)
npm test          # tests Vitest (monde, physique, inventaire, sauvegarde)
npm run lint      # TypeScript strict + variables inutilisées
npm run build     # site statique dans dist/ (déployé tel quel)
```

Pile : TypeScript strict, Vite, Canvas 2D, Vitest. Aucune dépendance d'exécution. Tous les graphismes (textures de blocs, personnage, ciel) et tous les sons (WebAudio) sont générés par le code : aucun asset externe. Structure et règles : voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Contribuer / Contributing

Les issues et les pull requests sont les bienvenues. Les contributions sont vérifiées (cohérence, pertinence, fonctionnement) puis relues par l'équipe avant fusion sur `main`.
Issues and pull requests are welcome. Contributions are checked (consistency, relevance, working state) and reviewed by the team before being merged into `main`.
