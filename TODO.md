# TODO
- Way to import/export sync information
  - Need to look at historical date? Does previous date work in date field? For "today's date"
- ~~Printout version (visuals)~~
- ~~Toggle prescription setting where it cannot be filled early~~
- ~~List fill dates (and med, quantity)~~
- ~~Don't need blue field for explanation~~
- ~~Don't need top table for number of prescriptions, short fills needed, already at anchor for printout~~


# Recommendations from AI
  1. ~~NOT RELEVANT  Doses/day field on the pills input — the deriveFillDate function is already written for this; just needs a small
  number input (defaulting to 1) next to Pills Remaining~~
  2. ~~Save & restore prescriptions — localStorage so the user doesn't re-enter their meds every visit~~
  3. ~~Print / export — a print-friendly view or PDF export of the sync plan~~
  4. Show next full cycle — extend the timeline one cycle past the sync date to show when everything syncs again after
  the first aligned fill
  5. Override sync target — let the user manually pin the sync date instead of always using the latest expiry

  # Bugs
  - ~~Last fill date input field (date) text overflows~~
  - ~~Medication number not decrementing properly (when deleting rows)~~