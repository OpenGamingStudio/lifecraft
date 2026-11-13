# Sources des assets

Un seul fichier externe : la police Fredoka. Tous les autres éléments sont créés pour LifeCraft et générés par le code :

| Élément | Où | Origine |
|---|---|---|
| Textures des blocs, fissures | `src/render/textures.ts` | créé pour LifeCraft (bruit déterministe) |
| Personnage, ciel, collines, astres | `src/render/sprite.ts`, `src/render/renderer.ts` | créé pour LifeCraft |
| Effets sonores | `src/audio/sfx.ts` | créé pour LifeCraft (synthèse WebAudio) |
| Police Fredoka (variable, graisses 400-700, sous-ensemble latin) | `src/fonts/fredoka-latin-wght-normal.woff2` | The Fredoka Project Authors, SIL Open Font License 1.1 (`src/fonts/OFL.txt`) ; fichier du paquet npm `@fontsource-variable/fredoka` 5.3.0, auto-hébergé, aucun CDN |
