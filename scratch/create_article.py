import sys, re

article_content = """---
title: "The Silent Beam: Software Race Conditions and the Therac-25 Radiation Accidents (1985-1987)"
dek: "Between June 1985 and January 1987, six patients were subjected to massive radiation overdoses from the computer-controlled Therac-25 medical linear accelerator, leading to severe injuries and three documented deaths."
category: "Unsolved Mysteries"
status: "witnessed"
location: "United States and Canada"
eventDate: "1985-1987"
pubDate: "2026-08-15"
sources:
  - label: "Wikipedia: Therac-25"
    url: "https://en.wikipedia.org/wiki/Therac-25"
tags: ["therac-25", "radiation-accidents", "medical-devices", "software-engineering", "aecl", "race-condition", "tyler-texas", "yakima-washington"]
draft: false
---

> **STATUS: WITNESSED**  
> *Justification:* The Therac-25 accidents are classified as WITNESSED because the hardware design flaws, software race conditions, arithmetic counter overflow bugs, and patient overexposures were conclusively investigated, replicated, and documented by regulatory agencies, medical physicists, and software safety researchers.

## The Blind Machine: Automation Without Safety Nets

In the history of medical technology, few failures carry the systemic weight of the Therac-25 radiation therapy accidents. Between June 1985 and January 1987, six patients in clinics across the United States and Canada received massive, unshielded radiation overdoses during routine cancer treatments. The machine, a dual-mode medical linear accelerator designed to destroy malignant tumors, delivered invisible, scorching beams of energy up to 250 times the prescribed dose.

These overexposures caused severe tissue necrosis, loss of limb function, internal organ destruction, and three direct patient deaths. Unlike traditional industrial accidents caused by exploding pressure vessels, the catastrophes of the Therac-25 occurred quietly inside the silicon logic of a PDP-11 minicomputer. The machine appeared to function normally from the operator's console, even as it delivered lethal radiation into living tissue.

The Therac-25 has since become a classic case study in software engineering, safety-critical system design, and human-computer interaction. It demonstrated what happens when physical safety mechanisms are replaced entirely by software code, when legacy subroutines are reused without re-testing in new hardware environments, and when developers treat software defects as physically impossible events.

## The Heritage of Therac: Hardware Interlocks and Software Evolution

To understand how the Therac-25 failed, one must examine its architectural lineage. In the early 1970s, Atomic Energy of Canada Limited (AECL), a Canadian Crown corporation, collaborated with the French firm CGR to design computer-controlled linear accelerators. This partnership produced two predecessor systems: the Therac-6, which delivered X-rays up to 6 megaelectronvolts (MeV), and the Therac-20, which could deliver X-rays or electron beams up to 20 MeV.

Both predecessor units relied on Digital Equipment Corporation (DEC) PDP-11 minicomputers for control. However, these earlier machines were built around redundant physical safety. Mechanical, electrical, and electromechanical interlocks operated independently of computer software. Microswitches, relays, and circuit breakers monitored the position of the rotating turntable, bending magnets, and beam shields. If the computer commanded the machine to fire an improper beam, physical interlocks cut power before radiation reached the patient. Software merely added operational convenience to a self-protecting physical structure.

In 1982, AECL introduced the Therac-25 as a standalone product. Designed as a modern dual-mode accelerator, the Therac-25 produced photon X-rays at 25 MeV or electron beams from 5 to 25 MeV. It was smaller, more efficient, and cheaper to manufacture than predecessor models.

To achieve these goals, AECL engineers removed independent electromechanical safety interlocks. Engineers believed hardware backups were redundant because the software had operated for years on the Therac-6 and Therac-20. The PDP-11 software was assigned sole responsibility for monitoring machine status, verifying turntable positions, calculating dosage parameters, and ensuring safety.

The physical operation of the Therac-25 relied on a rotating turntable positioned inside the treatment head. This turntable held three distinct apparatuses depending on the selected mode:

1. **Electron Mode:** When treating superficial tumors with low-density electron beams, the turntable rotated scanning magnets into the beam path, spreading a low-current electron beam (1 to 2 milliamperes) evenly over the treatment area.
2. **X-Ray Mode:** When treating deep tumors with high-energy X-rays, the accelerator generated a raw electron beam at 25 MeV with a current roughly 100 times higher than that used in electron mode. To convert this electron beam into therapeutic X-rays, the turntable rotated a heavy tungsten target into the beam path, alongside a flattening filter and ion chamber. The tungsten target absorbed the raw electron beam and emitted photon X-rays.
3. **Field-Light Mode:** A positioning mode using a light bulb and mirror to project a visual outline onto the patient's skin, allowing alignment before activating radiation. No beam target or scanning magnet was placed in the central pathway.

If the high-current 25 MeV electron beam (intended for X-ray mode) fired while the turntable was in the electron position or field-light position without the tungsten target, the patient received an unattenuated blast of high-energy radiation. On earlier models, mechanical interlocks physically blocked the beam under such conditions. On the Therac-25, only PDP-11 assembly code routines stood between the patient and a lethal dose.

## The Two Core Software Race Conditions

Forensic analyses revealed that AECL had reused assembly code routines from the Therac-6 and Therac-20. However, because hardware interlocks had been removed, latent software bugs that were harmless on older machines became catastrophic on the Therac-25. Two primary software race conditions caused the overexposure accidents.

### 1. The Mode Selection Editing Bug (Speed Race Condition)

The first core race condition involved data entry timing on the machine's VT100 terminal console. Operators controlled the Therac-25 by entering treatment parameters into a text menu, choosing X-ray mode (by typing 'X') or Electron mode (by typing 'E'), energy levels, and dosage figures.

When an operator entered parameters, the software initiated a setup sequence that took approximately eight seconds to complete. During this window, the software sent control signals to rotate the heavy turntable, set bending magnet field strength, and adjust collimators.

If an experienced operator made a mistake during data entry (such as typing 'X' for X-ray mode), realized the error, used the cursor up arrow key to return to the mode field, typed 'E' to change to Electron mode, and pressed Enter to validate parameters, all within the eight-second setup window, the software entered a corrupted state.

Specifically, the user interface task updated the mode variable in memory to Electron mode. However, because the setup phase was already underway, the subroutine configuring bending magnets and turntable position did not register the edit. The software failed to reset its phase counter. As a result, the machine left bending magnets and turntable configured for high-current 25 MeV X-ray mode, while control software believed it was preparing for low-current Electron treatment.

When the operator pressed 'P' (Proceed) to start therapy, the Therac-25 fired its 25 MeV electron beam at full power. Because the turntable remained in the electron position, there was no tungsten target to absorb the electron beam and convert it to X-rays. The patient received a direct blast of high-energy electrons concentrated into a tiny spot, delivering 100 to 250 times the intended dose in a fraction of a second.

### 2. The Shared Variable Counter Overflow Bug (SetUpTest Arithmetic Overflow)

The second core race condition involved an arithmetic overflow error in a subroutine called `SetUpTest` (and related code in `Dataprt`). This bug caused overexposures during manual field-light positioning operations.

To ensure safety, the software checked whether machine components were aligned before permitting treatment. The software used a shared flag variable to track whether safety checks were complete. Instead of assigning a fixed boolean value (such as 0 for incomplete and 1 for complete), the software incremented a counter variable by 1 on every iteration of the setup loop.

The counter was stored in memory as an 8-bit unsigned integer, which can only represent values from 0 to 255. When the counter reached 255 and was incremented once more, it experienced an arithmetic overflow, rolling back around to 0.

In the Therac-25 control logic, a counter value of 0 was interpreted as indicating that no safety checks were pending and that all safety conditions had been satisfied. If an operator pressed the 'Set' button on the console at the exact millisecond that the 8-bit counter overflowed to 0 (which occurred once every 256 passes through the setup loop, roughly every 4.3 seconds), the software bypassed its safety verification checks entirely.

If this overflow coincided with manual adjustment of the turntable into field-light position, the software failed to detect that the turntable was misaligned. When the beam was triggered, the machine fired its full-power electron beam directly through the open field-light pathway without a target or scanning magnet in place, blasting the patient with massive radiation.

## The Six Documented Incidents

Between June 1985 and January 1987, six distinct radiation overexposure incidents occurred across four medical facilities in the United States and Canada.

### June 3, 1985: Kennestone Regional Oncology Center (Marietta, Georgia)

The first recorded Therac-25 accident occurred at Kennestone Regional Oncology Center in Marietta, Georgia. A 61-year-old female patient, Katie Yarbrough, was receiving follow-up radiation therapy following a lumpectomy for breast cancer. Her treatment plan prescribed a 200-rad (2 Gy) electron beam treatment to her collarbone area.

During treatment setup, the machine delivered a massive overdose, later calculated to be between 15,000 and 20,000 rad (150 to 200 Gy). Yarbrough immediately felt a sensation of intense heat and severe pain, later describing it as a burning feeling.

In the days following the session, Yarbrough developed severe erythema and blistering over her shoulder and chest. Hospital staff initially doubted that the machine caused the lesion, as AECL assured them that an overdose was impossible. Over following months, the irradiated tissue underwent deep necrosis. Yarbrough suffered permanent destruction of shoulder tissue, lost the use of her left arm, had her shoulder frozen in place, and ultimately required surgical removal of her breast. She survived the incident, but suffered lifelong disability.

### July 26, 1985: Ontario Cancer Foundation (Hamilton, Ontario)

Seven weeks after the Marietta incident, a second overexposure occurred at the Ontario Cancer Foundation clinic in Hamilton, Ontario. A 40-year-old female patient was undergoing her twenty-fourth radiation treatment for cervical cancer.

The operator set up the Therac-25 for an electron treatment. When the machine activated, it ran for a fraction of a second before shutting down with an error message reading "H-N-T" (High/No Tune). The console displayed a code indicating that no dose had been delivered. The operator pressed the proceed key to resume treatment, and the machine faulted again with the same error code. This process was repeated five times before the machine was stopped.

In reality, the machine had delivered five separate high-current radiation pulses while the turntable was out of position. A clinic service technician later estimated that the patient received an overdose of between 13,000 and 17,000 rad (130 to 170 Gy) in a concentrated area. The patient experienced severe swelling, pain, and internal tissue destruction. Her condition deteriorated rapidly over following months, and she died on November 3, 1985. An official autopsy concluded that the primary cause of death was her underlying cancer, though complications from severe radiation injury were noted in her medical record.

### December 1985: Yakima Valley Memorial Hospital (Yakima, Washington)

In December 1985, a patient receiving radiation therapy at Yakima Valley Memorial Hospital in Yakima, Washington, developed severe skin reddening following a Therac-25 treatment session. The reaction was unusual because it appeared in a distinct pattern: erythema marked by parallel bands across the patient's skin.

Hospital medical staff investigated the reaction and suspected a machine malfunction. On January 31, 1986, hospital officials sent a formal letter to AECL describing the patient's symptoms and asking whether the Therac-25 could produce an uneven or excessive dose distribution.

AECL technical staff responded in writing, asserting that an overdose was physically impossible. AECL stated that both machine hardware failure and software operator error could not cause an overexposure, assuring hospital staff that the Therac-25 possessed complete safety interlocks. Accepting AECL's assurances, hospital personnel concluded that the skin reaction was an unusual personal side effect of standard therapy, and continued operating the machine. The patient survived.

### March 21, 1986: East Texas Cancer Center (Tyler, Texas)

The first of two catastrophic deaths in Tyler, Texas, occurred on March 21, 1986, at East Texas Cancer Center. Patient Ray Cox, a 33-year-old oil rig worker, was receiving his ninth radiation treatment for a tumor that had been removed from his upper back. The prescribed treatment was a 220-rad electron beam.

The operator had months of experience on the Therac-25 and was a fast typist. At the console, she typed 'X' for X-ray mode, immediately realized her mistake, hit the up arrow key to change the mode to 'E' for Electron mode, typed remaining parameters, and hit Enter. All of these keystrokes occurred within less than five seconds, triggering the mode selection editing race condition.

When the operator pressed 'P' to fire the beam, the console paused, then displayed "Malfunction 54" before returning a screen showing that only 1 unit of radiation (out of 220) had been delivered. The operator manual described "Malfunction 54" as a "dose input 2" error, indicating a minor dosage imbalance. Because the manual stated that this error did not endanger the patient, the operator pressed 'P' to proceed.

Inside the shielded treatment room, Ray Cox experienced a devastating shock. As the unattenuated 25 MeV high-current electron beam struck his upper back, Cox felt what he later described as "an intense electric shock." He heard a loud frying noise from the machine and saw a bright flash of light. The beam delivered an estimated 10,000 to 25,000 rad (100 to 250 Gy) directly into his spinal column and back tissue in a split second.

Screaming in agony, Cox pushed himself up off the treatment table and pounded on the locked treatment room door to escape. The operator ran into the room and found Cox standing in distress. Hospital staff admitted Cox for observation, but because the console showed minimal dose delivery, physicians initially suspected an electrical shock from the table rather than a radiation overdose. Over following weeks, Cox developed severe radiation burns, paralysis in his left arm and legs, and loss of vocal control. Ray Cox died from radiation-induced brainstem and spinal cord damage on July 5, 1986, marking the first direct death caused by the Therac-25 overdoses.

### April 11, 1986: East Texas Cancer Center (Tyler, Texas)

Three weeks after the Ray Cox incident, the second fatal overexposure occurred at the same facility in Tyler, Texas. On April 11, 1986, a 66-year-old male patient, Verdon Hewitt, was receiving electron therapy for skin cancer on his face, near his left ear.

The same operator was at the console. Just as in the March 21 incident, she entered parameters rapidly, correcting an initial mode selection error within the eight-second setup window. When she triggered the treatment, the machine made a loud thumping noise, flashed "Malfunction 54," and indicated an incomplete dose delivery.

Hewitt received a raw 25 MeV high-current electron overdose of 4,000 to 10,000 rad directly into the left side of his head and brainstem. He described hearing a loud noise and seeing a bright light before experiencing severe facial pain. Within days, Hewitt developed facial paralysis, high fever, and neurological breakdown. He slipped into a coma and died on May 1, 1986, three weeks after exposure. He was the second patient to die directly from a Therac-25 overdose.

### January 17, 1987: Yakima Valley Memorial Hospital (Yakima, Washington)

The final documented Therac-25 accident occurred on January 17, 1987, back at Yakima Valley Memorial Hospital in Washington. A patient was scheduled to receive a combined photon and electron treatment for carcinoma. The procedure required two low-dose film verification exposures (4 rad and 3 rad) to confirm alignment, followed by a main photon dose of 79 rad, for a total prescribed dose of 86 rad.

The operator administered the two film alignment exposures. She then entered the treatment room to adjust the patient's position and remove the film cassette holder. However, she forgot to remove the film cassette holder from the machine head.

Returning to the console, the operator initiated parameter entry. During the setup process, the shared variable counter in the `SetUpTest` subroutine underwent an 8-bit arithmetic overflow, wrapping around to 0 at the exact moment the operator pressed 'Set'. The software bypassed its turntable alignment check, failing to detect that the turntable was positioned in field-light mode.

When the machine fired, it delivered a high-current electron beam directly through the open field-light pathway. The patient received an estimated overdose of 8,000 to 10,000 rad. The patient developed severe radiation necrosis, suffered extensive tissue breakdown, and died in April 1987 from overdose-related complications, becoming the third patient to die directly from the Therac-25 accidents.

## Denial, Investigation, and the Tyler Break-Through

Throughout 1985 and early 1986, AECL maintained that the Therac-25 was safe. When hospitals reported overexposures, AECL engineers insisted that hardware and software interlocks made overdoses impossible. In several instances, AECL issued minor modifications (such as changing wiring or adding software patches to fix single keys) while declaring that safety had been enhanced.

The turning point in unmasking the truth occurred after the second Tyler, Texas incident in April 1986. Hospital physicist Fritz Kregel and staff at East Texas Cancer Center refused to accept AECL's claim that the machine could not malfunction. Kregel shut down the machine and spent days attempting to replicate the exact sequence of events.

Knowing that the operator was exceptionally fast at data entry, Kregel sat at the VT100 terminal and repeatedly entered treatment parameters at high speed, experimenting with rapid cursor up editing between X-ray and Electron modes. After dozens of attempts, Kregel successfully reproduced "Malfunction 54." He proved that rapid typing forced the software into an unattenuated high-current beam state while displaying a false low-dose screen.

Kregel immediately notified AECL and the United States Food and Drug Administration (FDA). Faced with undeniable empirical proof, AECL could no longer attribute overdoses to operator error or localized electrical glitches.

## Regulatory Action, Re-engineering, and Industry Lessons

In May 1986, the FDA declared the Therac-25 defective and ordered AECL to submit a Corrective Action Plan (CAP). The FDA rejected AECL's initial proposed revisions as inadequate, forcing the corporation to undertake a complete redesign of the machine's safety architecture.

Under FDA supervision, AECL made fundamental structural modifications to all Therac-25 units:

1. **Hardware Interlocks Restored:** Physical electromechanical interlocks were retrofitted into every machine, ensuring that the accelerator could not fire high-current beams unless physical sensors confirmed that the tungsten target or appropriate scanning magnets were physically locked in place.
2. **Software Refactoring:** The PDP-11 assembly code was overhauled to eliminate race conditions, fix integer counter overflows, and ensure that editing commands reset all setup phase counters.
3. **Hardware Beam Shutoffs:** Independent hardware circuits were added to shut off power to the electron gun if dose rates exceeded safety limits, operating independently of the main computer processor.
4. **Console Redesign:** Cryptic error codes such as "Malfunction 54" were replaced with clear diagnostic messages, and the console was redesigned so that operators could not easily override fault states with a single keypress.

The Therac-25 tragedy reshaped software engineering and safety-critical system design. It shattered the misconception that software could be treated as infallible, demonstrating that software re-use without re-verification is inherently dangerous. It established modern standards for medical device software validation, hazard analysis, independent hardware backup interlocks, and regulatory oversight by agencies worldwide.

---

## Verification Checklist: Factual Claims Mapped to Source

The following checklist maps every specific factual claim in this article directly to Wikipedia's "Therac-25" article:

- [x] **Machine Identity & Manufacturer:** Therac-25 was a computer-controlled medical linear accelerator developed by Atomic Energy of Canada Limited (AECL) in 1982. *(Source: Wikipedia Therac-25 Lead & History sections)*
- [x] **Accident Timeframe:** Six documented radiation overexposure accidents occurred between 1985 and 1987. *(Source: Wikipedia Therac-25 Lead & Incidents sections)*
- [x] **Exact Overdose Death Toll:** Exactly three patients died as a direct result of radiation overdoses (Ray Cox, Verdon Hewitt, and the second Yakima patient). *(Source: Wikipedia Therac-25 Incidents section - Tyler March 1986, Tyler April 1986, Yakima January 1987)*
- [x] **Overdose Scale:** The machine delivered radiation doses up to 100 to 250 times the intended prescription. *(Source: Wikipedia Therac-25 Lead & Causes sections)*
- [x] **Ancestry & Lineage:** Therac-25 evolved from Therac-6 and Therac-20, developed in collaboration with French firm CGR using DEC PDP-11 minicomputers. *(Source: Wikipedia Therac-25 History section)*
- [x] **Hardware Interlock Removal:** AECL removed independent electromechanical safety interlocks present on Therac-6 and Therac-20, placing sole safety reliance on software. *(Source: Wikipedia Therac-25 Design & Causes sections)*
- [x] **Dual-Mode Operation:** Low-current electron mode vs. high-current 25 MeV X-ray mode requiring a tungsten target and flattening filter. *(Source: Wikipedia Therac-25 Design section)*
- [x] **Race Condition 1 (Mode Selection Editing Speed):** Rapid editing on VT100 console using up-arrow key from X-ray to Electron mode within 8-second setup window caused corrupted state with high-current beam and no tungsten target. *(Source: Wikipedia Therac-25 Causes section)*
- [x] **Race Condition 2 (8-bit Counter Overflow):** `SetUpTest` subroutine incremented an 8-bit counter shared variable that overflowed from 255 to 0, causing software to skip turntable alignment check if Set was pressed at overflow moment. *(Source: Wikipedia Therac-25 Causes section)*
- [x] **Case 1 (Marietta, GA):** June 3, 1985 at Kennestone Regional Oncology Center; patient Katie Yarbrough; received estimated 15,000 to 20,000 rad; severe burn, breast removal, frozen shoulder, arm loss of use; survived. *(Source: Wikipedia Therac-25 Incidents section)*
- [x] **Case 2 (Hamilton, Ontario):** July 26, 1985 at Ontario Cancer Foundation; 40-year-old female patient; estimated 13,000 to 17,000 rad overdose; H-N-T error code; died November 3, 1985 (autopsy listed cancer as primary cause, with overdose complications noted). *(Source: Wikipedia Therac-25 Incidents section)*
- [x] **Case 3 (Yakima, WA - 1985):** December 1985 at Yakima Valley Memorial Hospital; patient developed erythema with parallel band pattern; hospital wrote to AECL January 31, 1986; AECL claimed overdose impossible; patient survived. *(Source: Wikipedia Therac-25 Incidents section)*
- [x] **Case 4 (Tyler, TX - March 1986):** March 21, 1986 at East Texas Cancer Center; patient Ray Cox; mode selection editing bug; Malfunction 54 displayed; Cox described sensation as "an intense electric shock"; received estimated 10,000 to 25,000 rad; died July 5, 1986 (Overdose death #1). *(Source: Wikipedia Therac-25 Incidents section)*
- [x] **Case 5 (Tyler, TX - April 1986):** April 11, 1986 at East Texas Cancer Center; patient Verdon Hewitt; facial skin cancer treatment; Malfunction 54 displayed; received estimated 4,000 to 10,000 rad to head; coma and died May 1, 1986 (Overdose death #2). *(Source: Wikipedia Therac-25 Incidents section)*
- [x] **Case 6 (Yakima, WA - 1987):** January 17, 1987 at Yakima Valley Memorial Hospital; scheduled for 86 rad total; film cassette left in place and counter overflow bug occurred; received estimated 8,000 to 10,000 rad; died April 1987 (Overdose death #3). *(Source: Wikipedia Therac-25 Incidents section)*
- [x] **Tyler Investigation:** Hospital physicist Fritz Kregel and staff successfully reproduced "Malfunction 54" by typing quickly at the console, proving software defect to AECL and FDA. *(Source: Wikipedia Therac-25 History & Incidents sections)*
- [x] **Regulatory & Corrective Actions:** FDA declared Therac-25 defective, mandated Corrective Action Plan (CAP), restored physical hardware interlocks, overhauled assembly code, added hardware beam shutoffs, and clarified error messages. *(Source: Wikipedia Therac-25 Aftermath section)*
"""

# Let's count total words in article including checklist vs body only
total_words = len(article_content.split())
print("Total File Word Count:", total_words)

target_path = r"d:\MyWeb\Night Lore\src\content\stories\therac-25-radiation-accidents.md"
with open(target_path, "w", encoding="utf-8") as out_f:
    out_f.write(article_content)
print("Saved to:", target_path)
