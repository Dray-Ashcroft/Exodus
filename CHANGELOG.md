<h1 align="center">Changelog</h1>

<p align="center"><em>EXODUS · Interactive Panspermia and Astrobiology Visualizer</em></p>

<p align="center">
  <a href="#rc-ii--3d-earth-and-archaea">RC II</a> ·
  <a href="#rc-i--initial-release">RC I</a>
</p>

---

## Release Summary

| Release | Title | Date | Focus |
|:--|:--|:--|:--|
| RC II | 3D Earth and Archaea | 26 Nov 2026 | 3D scene, impact shock wave, archaeon cell, Material 3 interface *(current)* |
| RC I | Initial Release | 13 Jun 2026 | Four-stage panspermia story with a drawn bacillus |

---

## RC II · 3D Earth and Archaea

*26 Nov 2026 · Current release*

**Changed**
- Earth, comet and cell rebuilt in 3D with Three.js r170 and glTF models
- Drawn bacillus replaced by a 3D cutaway archaeon (arloopa, CC BY 4.0), with labels pinned to its structures
- Cell view background redesigned as a darkfield microscope field with drifting particles
- Zoom slider redesigned: live readout, stops at their true positions, tap a stop to glide to it
- Interface restyled in Material Design 3: Launch Comet button, Impact site button, cell toolbar, info cards
- Typeface changed to IBM Plex Sans, with Roboto as fallback
- Title subtitle changed to "Biology | Origin of Life from Space"
- README rewritten in the standard format; new banner and screenshots

**Added**
- 3D Earth (SebastianSosnowski, CC BY 4.0) with drifting clouds, night-side city lights and an orbiting Moon
- Comet rock (admone, CC BY 4.0) with a burning trail and atmospheric entry glow
- Impact shock waves that sweep around the globe, an air blast, expanding rings, ejecta, smoke plume and a glowing crater
- Impact site button that turns the crater towards the viewer; the lens follows it
- Burning rock at 20x using flames and coals from the bonfire model (raptapantallas, CC BY 4.0)
- Cell toolbar: guided tour, zoom in and out, reset view, high contrast, grain, restart
- Live µm scale bar
- © credits card listing the Project Designer and every 3D model author
- Keyboard and clicker shortcuts
- Scientific note that panspermia is a hypothesis
- Single-file build with all models embedded, for offline use

**Removed**
- CSS Earth, Moon and canvas asteroid
- Meteorite cross-section background in the cell view
- "Class 12" wording

**Fixed**
- Loading now reports which file failed instead of stalling
- Reduced-motion setting turns off the screen shake and softens the flash

---

## RC I · Initial Release

*13 Jun 2026*

**Added**
- Four stages: Panspermia Hypothesis, Impact, Zoom, The Cell
- Threat radar and rock impact with crater
- Zoom lens from 1x to 50x
- Electron-microscope style bacillus at 50,000x with labelled structures and a guided tour
- High contrast, zoom out, grain and restart controls

---

<p align="center">
  <a href="README.md">README</a> · <a href="LICENSE">License (GNU GPL-3.0)</a>
</p>
