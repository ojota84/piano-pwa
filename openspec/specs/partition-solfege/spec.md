# Capability Specification: Solfège Partitions & Staff Mapping

## Requirement: Representation of Musical Partitions in Fixed-Do Solfège
Musical partitions (`src/core/theory/musicTheory.ts`) MUST define notes exclusively in Fixed-Do Solfège naming (`Do`, `Ré`, `Mi`, `Fa`, `Sol`, `La`, `Si`) and compute exact diatonic staff positions in **Clé de Sol** (`treble`) and **Clé de Fa** (`bass`).

### Scenario: Diatonic Staff Coordinates in Clé de Sol & Clé de Fa
* **GIVEN** the pure function `getDiatonicStaffPosition(step, octave, clef)`
* **WHEN** evaluated for landmark notes relative to the middle staff line (`0`)
* **THEN** `getDiatonicStaffPosition('Do', 4, 'treble')` MUST return `-6` (first ledger line below the treble staff)
* **AND** `getDiatonicStaffPosition('Si', 4, 'treble')` MUST return `0` (middle line of the treble staff)
* **AND** `getDiatonicStaffPosition('Do', 6, 'treble')` MUST return `+8` (two ledger lines above the treble staff)
* **AND** `getDiatonicStaffPosition('Ré', 3, 'bass')` MUST return `0` (middle line of the bass staff).

## Requirement: Rhythm Duration Beats & Measure Bar Line Placement
Each `NoteDuration` (`whole`, `half`, `quarter`, `eighth`) MUST map to its exact quarter-note beat count (`4`, `2`, `1`, `0.5`) and French label (`Ronde`, `Blanche`, `Noire`, `Croche`), and `computeMeasureBarLineIndices` MUST place vertical bar lines at measure boundaries.

### Scenario: Measure Bar Lines in 4/4 Time Signature
* **GIVEN** a 4/4 sequence of notes `[quarter, quarter, half, quarter, quarter, half]`
* **WHEN** `computeMeasureBarLineIndices(notes, [4, 4])` is executed
* **THEN** it MUST return a frozen array `[2]` (bar line after index 2, excluding the final note).

## Requirement: Hands-Free Viewport Auto-Centering Around the Visually Focused Note
Because the learner's hands are on the piano keyboard, `StaffView` MUST automatically scroll horizontally to keep the visually focused note (`visualFocusIndex`: `currentIndex - 1` while holding a note in Rhythm mode, or `currentIndex` when ready to strike) centered in the viewport.

### Scenario: Smooth Horizontal Scroll on Note Progression
* **GIVEN** a multi-measure partition wider than the mobile screen viewport
* **WHEN** `visualFocusIndex` transitions from a held note (`currentIndex - 1`) to the next strike target (`currentIndex`)
* **THEN** the staff container MUST smoothly center `visualFocusIndex` horizontally without requiring manual touch scrolling.
