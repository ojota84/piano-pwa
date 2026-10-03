# Capability Specification: "Wait For Me" State Engine

## Requirement: Interactive Progression on Acoustic Piano Match
The practice engine MUST advance through the partition exclusively when the matching Solfège pitch is played.

### Scenario: Correct Note Advance
* **GIVEN** an active partition targeting `Do 4` at index 0
* **WHEN** the microphone detects `Do 4` from the piano
* **THEN** the status MUST be `MATCH`
* **AND** the cursor index MUST advance to 1 (`Ré 4`).

### Scenario: Wrong Note Rejection (No Advance)
* **GIVEN** an active partition targeting `Do 4` at index 0
* **WHEN** the user strikes `Ré 4` on the piano
* **THEN** the status MUST be `MISMATCH`
* **AND** the cursor index MUST remain at 0 targeting `Do 4`.
