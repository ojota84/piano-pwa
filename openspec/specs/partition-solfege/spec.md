# Capability Specification: Solfège Partitions & Staff Mapping

## Requirement: Representation of Musical Partitions in Solfège
Musical partitions MUST define notes primarily in Solfège naming (`Do`, `Ré`, `Mi`, `Fa`, `Sol`, `La`, `Si`).

### Scenario: First Steps Exercise Generation
* **GIVEN** a partition configured for beginners in Treble Clef
* **WHEN** the partition `"Premiers Pas"` is initialized
* **THEN** it contains ordered notes with Solfège labels:
  * Note 1: `Do 4` (MIDI 60, Clef Treble, Ledger line -2)
  * Note 2: `Ré 4` (MIDI 62, Clef Treble, Space -1)
  * Note 3: `Mi 4` (MIDI 64, Clef Treble, Line 0)
* **AND** no English letter notation (`C, D, E`) is displayed to the learner.
