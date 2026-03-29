# TODOS — 189 Hamilton St Life Care Plan Tools

## V2: Condo Decision Report
**What:** Add condo sale scenarios to the Decision Report, or create a unified report that compares rental hold vs. condo sale side by side in one artifact.
**Why:** Right now the condo model (condo.html) is an island. A lawyer needs one document showing both paths — "hold vs. sell, here are the numbers." The report should answer the real question: which path best serves Steve's goals?
**Context:** The current report.html only covers rental hold at three AMI tiers. Condo.html has its own calculation engine that also needs to be extracted into engine.js for consistency. The unified report would show: Scenario A (rental hold at X% AMI) vs. Scenario B (sell N units as condos) vs. Scenario C (hybrid: sell 1, hold 2 affordable).
**Depends on:** engine.js extraction of condo calculation logic.

## V2: Actionable playbook steps (not vague checklists)
**What:** Replace generic checklist items ("Research elder law attorneys") with specific, actionable playbook steps with exact phone numbers, what to ask for, what to bring, and what output to expect.
**Why:** The current checklist is a to-do list, not a guide. Actionable means: "Call Cambridge Bar Association at (617) 225-5000. Ask for elder law attorney with irrevocable trust experience for rental property. Bring: this report, the appraisal, rent rolls, and Steve's will."
**Context:** The user wants the product to be a living guide that teaches you how to do small-scale affordable housing development. Each step should have a specific deliverable and specific next action.
**Depends on:** Research to verify Cambridge-specific resources, phone numbers, program names.

## V2: Contextual warnings ("development traps")
**What:** Surface contextual warnings at the right moment in the workflow — things experienced developers know but first-timers don't.
**Why:** Saves real money and time. Examples:
- "Don't order your own appraisal before talking to a lender — the lender orders one and you'll pay for it twice ($500-800 wasted)."
- "Get 3 contractor bids minimum. The first bid is almost never the best price."
- "An irrevocable trust can't be changed. Finalize AMI tier and rent structure BEFORE the trust is executed."
- "Get insurance quotes BEFORE renovation. Post-renovation insurance on a gut-rehabbed triple-decker can be 2-3x the pre-renovation rate."
- "Cambridge rent control rules may apply differently to deed-restricted affordable units — confirm with the city before assuming."
**Context:** These should be triggered contextually (e.g., when the user is adjusting construction cost sliders, show the contractor bid tip). Not a static list — the right warning at the right time.
**Depends on:** Domain expertise to identify all the traps. Interview Steve's lawyer and advisor to surface more.

## V2: Umbrella intake flow
**What:** Replace the config panel with a category-card intake flow: Property, Finance, Owner, Legal, Housing Policy. Each card expands into simple questions. Progress dots show completion. Skip-friendly. Everything feeds the same report.
**Why:** The current slider panel works for the builder but is intimidating for a non-technical user (Steve, his lawyer). The umbrella flow makes it approachable — one question at a time, any order, save progress in URL.
**Context:** Discussed in office hours session. The user described it as "you have all these different umbrellas like finance or legal and then you can drill down into them." This is the V2 UX direction that makes the tool self-sufficient (premise #2 from the design doc).
**Depends on:** Condo report integration (so the intake flow covers both paths).

## V2: Condo engine extraction to engine.js
**What:** Extract condo.html's calculation logic into engine.js so all three tools share one engine.
**Why:** Same DRY principle as the rental extraction. Condo.html currently has its own inline calculation engine. When rent limits or constants change, three files need updating instead of one.
**Context:** The eng review identified this as a maintenance risk. engine.js currently covers rental calculations only.
**Depends on:** Nothing — can be done independently.

## Verify Cambridge-specific resources
**What:** Confirm that CPA-28 exemption, CAHT programs, MassHousing preservation programs, and DHCD Community Investment Tax Credit are current and applicable to Steve's situation.
**Why:** The checklist references these programs but they haven't been verified. Sending a lawyer inaccurate program names or defunct programs erodes trust.
**Context:** A phone call to Cambridge Housing Authority and CAHT would confirm. The appraisal is from 3/20/2025, so property details are current.
**Depends on:** Nothing — can be done in parallel with development work.
