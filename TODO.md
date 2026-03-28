# TODO
- Way to import/export sync information
- ~~Printout version (visuals)~~
- ~~Toggle prescription setting where it cannot be filled early~~
- List fill dates (and med, quantity)


# Recommendations from AI
  1. ~~NOT RELEVANT  Doses/day field on the pills input — the deriveFillDate function is already written for this; just needs a small
  number input (defaulting to 1) next to Pills Remaining~~
  2. Save & restore prescriptions — localStorage so the user doesn't re-enter their meds every visit
  3. ~~Print / export — a print-friendly view or PDF export of the sync plan~~
  4. Show next full cycle — extend the timeline one cycle past the sync date to show when everything syncs again after
  the first aligned fill
  5. Override sync target — let the user manually pin the sync date instead of always using the latest expiry