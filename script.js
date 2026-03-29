
// ── State ─────────────────────────────────────────────────────────────────
// rxCounter increments with each added card, giving each Rx a stable unique ID
// even after other cards are removed. rxItems tracks the IDs currently on screen.
let rxCounter = 0;
const rxItems = [];

// Capture real today at page load (midnight, local time) so the date field
// starts pre-filled and getToday() always has a fallback.
const _realToday = new Date(); _realToday.setHours(0,0,0,0);
document.getElementById('todayDate').value = _realToday.toISOString().split('T')[0];

// ── Date helpers ──────────────────────────────────────────────────────────

// Returns the working "today" — either the overridden date from the settings
// field (useful for testing / planning ahead) or the real current date.
function getToday() {
  const v = document.getElementById('todayDate').value;
  return v ? pd(v) : _realToday;
}

// pd = "parse date" — converts a YYYY-MM-DD string into a local midnight Date.
// We avoid new Date(str) directly because that parses as UTC and causes
// off-by-one-day errors in non-UTC timezones.
function pd(str) {
  if (!str) return null;
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

// fd = "format date" — produces a readable label like "Mar 28, 2026".
// en-CA gives YYYY-first ISO-style ordering which is unambiguous across locales.
function fd(date) {
  return date.toLocaleDateString('en-CA', { year:'numeric', month:'short', day:'numeric' });
}

// addDays uses setDate so it correctly handles month/year rollovers
// (e.g. Jan 31 + 1 day = Feb 1, not Jan 32).
function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

// diffDays returns how many calendar days b is ahead of a (negative if behind).
// Math.round absorbs any DST-related ±1-hour drift.
function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

// Displays a dismissing error banner at the top of the results area.
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg; el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

// ── UI helpers ────────────────────────────────────────────────────────────

// Shows the "no prescriptions yet" placeholder when the Rx list is empty.
function updateEmptyState() {
  document.getElementById('emptyState').style.display = rxItems.length === 0 ? 'block' : 'none';
}

// watchCardInputs wires up live visual feedback for a single Rx card.
// Each card has two mutually exclusive input paths:
//   - Last Fill Date  → "mode-date"  (dims the pills field)
//   - Pills Remaining → "mode-pills" (dims the date field)
// Filling both triggers an "input-conflict" warning; filling neither is neutral.
function watchCardInputs(id) {
  const card       = document.getElementById(`rx-${id}`);
  const dateInput  = document.getElementById(`date-${id}`);
  const pillsInput = document.getElementById(`pills-${id}`);
  const warning    = document.getElementById(`warn-${id}`);

  // update() is called whenever either input changes. It resets all state
  // classes first so we're always working from a clean slate.
  function update() {
    const hasDate  = !!dateInput.value;
    const hasPills = pillsInput.value !== '';

    card.classList.remove('mode-date', 'mode-pills', 'input-error', 'input-conflict');
    warning.classList.remove('show');

    if (hasDate && hasPills) {
      card.classList.add('input-conflict');
      warning.textContent = 'Fill in Last Fill Date OR Pills Remaining — not both.';
      warning.classList.add('show');
    } else if (hasDate) {
      card.classList.add('mode-date');
    } else if (hasPills) {
      card.classList.add('mode-pills');
    }
    // If neither field is filled: no class, neutral appearance
  }

  // The date input needs extra handling because browsers allow typing years
  // beyond 4 digits. We truncate anything over 4 chars immediately, then
  // validate the completed year is within our supported range (2000–2999).
  // We return early on an invalid year so update() doesn't clear the warning.
  dateInput.addEventListener('input', function() {
    if (dateInput.value) {
      const parts = dateInput.value.split('-');
      if (parts[0]) {
        if (parts[0].length > 4) {
          // Silently truncate — browsers can let extra digits slip through
          parts[0] = parts[0].slice(0, 4);
          dateInput.value = parts.join('-');
        } else if (parts[0].length === 4) {
          const year = parseInt(parts[0], 10);
          if (year < 2000 || year > 2999) {
            card.classList.add('input-conflict');
            warning.textContent = 'Please enter a valid year between 2000 and 2999.';
            warning.classList.add('show');
            return; // skip update() so the warning isn't immediately cleared
          }
        }
      }
    }
    update();
  });
  pillsInput.addEventListener('input', update);
  update(); // run once on load in case the card is pre-filled (e.g. after a future restore feature)
}

// renumberCards updates the "Medication #N" label on each card to reflect
// its current position in rxItems, so removing a card doesn't leave gaps.
function renumberCards() {
  rxItems.forEach((id, i) => {
    const el = document.querySelector(`#rx-${id} .rx-num`);
    if (el) el.textContent = `Medication #${i + 1}`;
  });
}

// addRx creates a new prescription card, appends it to the list, and wires
// up its live input watchers. Each card gets a unique numeric ID (rxCounter).
function addRx() {
  rxCounter++;
  const id = rxCounter;
  rxItems.push(id);
  updateEmptyState();

  const list = document.getElementById('rxList');
  const card = document.createElement('div');
  card.className = 'rx-card';
  card.id = `rx-${id}`;
  card.innerHTML = `
    <div class="field-group" style="grid-column:1">
      <div class="rx-num">Medication #${id}</div>
      <label>Drug / Prescription Name</label>
      <input type="text" placeholder="e.g. Metformin 500mg" id="name-${id}" autocomplete="off">
    </div>

    <div class="rx-field-date field-group">
      <label>Last Fill Date</label>
      <input type="date" id="date-${id}" min="2000-01-01" max="${_realToday.toISOString().split('T')[0]}">
    </div>

    <div class="or-divider">
      <div class="or-line"></div>
      <div class="or-text">or</div>
      <div class="or-line"></div>
    </div>

    <div class="rx-pills-group">
      <div class="rx-field-pills field-group">
        <label>Pills Remaining</label>
        <input type="number" id="pills-${id}" min="0" max="9999" placeholder="#"
               style="width:90px">
      </div>
      <div class="rx-field-doses field-group">
        <label>Tablets / Day</label>
        <select id="doses-${id}">
          ${Array.from({length: 10}, (_,i) => `<option value="${i+1}"${i===0?' selected':''}>${i+1}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="rx-field-supply field-group">
      <label>Days Supply</label>
      <input type="number" id="supply-${id}" min="1" max="365" placeholder="#"
             style="width:100px">
    </div>

    <div class="rx-toggles">
      <label class="rx-toggle-label">
        <input type="checkbox" id="noearly-${id}" class="rx-toggle-cb">
        Do not fill early
      </label>
      <label class="rx-toggle-label">
        <input type="checkbox" id="fixedsupply-${id}" class="rx-toggle-cb">
        Fixed days supply
      </label>
    </div>

    <button class="btn-remove" onclick="removeRx(${id})" title="Remove">×</button>

    <div class="rx-card-warning" id="warn-${id}"></div>
  `;
  list.appendChild(card);
  watchCardInputs(id);
  renumberCards();
}

// removeRx slides the card out with a CSS animation before removing it from
// the DOM. The results panel is hidden because they're now stale.
function removeRx(id) {
  const idx = rxItems.indexOf(id);
  if (idx > -1) rxItems.splice(idx, 1);
  const card = document.getElementById(`rx-${id}`);
  if (card) {
    card.style.opacity = '0'; card.style.transform = 'translateX(12px)';
    card.style.transition = 'all 0.2s ease';
    setTimeout(() => { card.remove(); renumberCards(); }, 200);
  }
  // Wait slightly longer than the animation before checking empty state
  setTimeout(updateEmptyState, 210);
  document.getElementById('results').style.display = 'none';
}

// clearAll resets everything back to the initial blank state.
// rxCounter is also reset so card numbering restarts from Rx #1.
function clearAll() {
  rxItems.length = 0; rxCounter = 0;
  document.getElementById('rxList').innerHTML = '';
  document.getElementById('results').innerHTML = '';
  document.getElementById('results').style.display = 'none';
  document.getElementById('errorMsg').style.display = 'none';
  document.getElementById('printBtn').style.display = 'none';
  updateEmptyState();
}

// ── IMPORT / EXPORT ───────────────────────────────────────────────────────

// collectState reads all current form values into a plain object.
function collectState() {
  return {
    version: 1,
    settings: {
      todayDate:   document.getElementById('todayDate').value,
      gracePeriod: document.getElementById('gracePeriod').value,
      stdSupply:   document.getElementById('stdSupply').value,
    },
    medications: rxItems.map(id => ({
      name:        document.getElementById(`name-${id}`).value,
      date:        document.getElementById(`date-${id}`).value,
      pills:       document.getElementById(`pills-${id}`).value,
      doses:       document.getElementById(`doses-${id}`).value,
      supply:      document.getElementById(`supply-${id}`).value,
      neverEarly:  document.getElementById(`noearly-${id}`).checked,
      fixedSupply: document.getElementById(`fixedsupply-${id}`).checked,
    })),
  };
}

// applyState wipes the current form and repopulates it from a state object.
function applyState(data) {
  clearAll();
  if (data.settings) {
    if (data.settings.todayDate)   document.getElementById('todayDate').value   = data.settings.todayDate;
    if (data.settings.gracePeriod) document.getElementById('gracePeriod').value = data.settings.gracePeriod;
    if (data.settings.stdSupply)   document.getElementById('stdSupply').value   = data.settings.stdSupply;
  }
  (data.medications || []).forEach(med => {
    addRx();
    const id = rxItems[rxItems.length - 1];
    document.getElementById(`name-${id}`).value          = med.name        || '';
    document.getElementById(`date-${id}`).value          = med.date        || '';
    document.getElementById(`pills-${id}`).value         = med.pills       || '';
    document.getElementById(`doses-${id}`).value         = med.doses       || 1;
    document.getElementById(`supply-${id}`).value        = med.supply      || '';
    document.getElementById(`noearly-${id}`).checked     = !!med.neverEarly;
    document.getElementById(`fixedsupply-${id}`).checked = !!med.fixedSupply;
    // Re-trigger input watchers so mode-date / mode-pills classes update correctly
    document.getElementById(`date-${id}`).dispatchEvent(new Event('input'));
  });
}

// exportData encodes the current state as a base64 string and copies it to clipboard.
function exportData() {
  if (rxItems.length === 0) { showError('Nothing to export — add at least one prescription first.'); return; }
  const str = btoa(JSON.stringify(collectState()));
  navigator.clipboard.writeText(str).then(() => {
    const btn = document.getElementById('exportBtn');
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  }).catch(() => {
    // Clipboard API blocked (e.g. non-HTTPS) — show the string so user can copy manually
    document.getElementById('importText').value = str;
    openImportModal();
  });
}

function openImportModal() {
  document.getElementById('importModal').style.display = 'flex';
  document.getElementById('importError').style.display = 'none';
}

function closeImportModal() {
  document.getElementById('importModal').style.display = 'none';
  document.getElementById('importText').value = '';
  document.getElementById('importError').style.display = 'none';
}

function confirmImport() {
  const raw = document.getElementById('importText').value.trim();
  try {
    const data = JSON.parse(atob(raw));
    applyState(data);
    closeImportModal();
  } catch(e) {
    document.getElementById('importError').style.display = 'block';
  }
}


// ── CORE: derive last fill date from pills remaining ──────────────────────
//
//  When the user enters pills remaining instead of a last fill date, we work
//  backwards to estimate when the bottle was dispensed:
//
//    lastFill = today − (daysSupply − daysRemaining)
//    daysRemaining = round(pillsRemaining / tabletsPerDay)
//
//  Results derived this way use a blue timeline bar to distinguish them
//  from date-based entries.

// ── CALCULATE ─────────────────────────────────────────────────────────────
// Main entry point triggered by the Calculate button. Reads all card inputs,
// validates them, builds the sync plan, then hands off to renderResults().
function calculate() {
  document.getElementById('errorMsg').style.display = 'none';

  // Read global settings using valueAsNumber, which returns the actual number
  // (including 0) or NaN when the field is empty — avoiding the classic
  // `parseInt('0') || 10 === 10` falsy bug.
  const graceNum = document.getElementById('gracePeriod').valueAsNumber;
  const grace    = isNaN(graceNum) ? 10 : graceNum;
  const stdNum   = document.getElementById('stdSupply').valueAsNumber;
  const stdDays  = isNaN(stdNum)   ? 90 : stdNum;
  const today    = getToday();

  if (rxItems.length === 0) { showError('Please add at least one prescription.'); return; }

  // ── Step 1: read and validate each Rx card ───────────────────────────
  // Build the `meds` array. We break out of the loop on the first error
  // so the user fixes one thing at a time.
  const meds = [];
  let hasError = false;

  for (const id of rxItems) {
    const name      = document.getElementById(`name-${id}`).value.trim() || `Rx #${id}`;
    const dateStr   = document.getElementById(`date-${id}`).value;
    const pillsVal  = document.getElementById(`pills-${id}`).value;
    const supplyVal = document.getElementById(`supply-${id}`).value;
    const supply    = parseInt(supplyVal);

    const hasDate  = !!dateStr;
    const hasPills = pillsVal !== '';

    // Each card must have exactly one of: Last Fill Date OR Pills Remaining
    if (hasDate && hasPills) {
      const card = document.getElementById(`rx-${id}`);
      card.classList.add('input-conflict');
      showError(`"${name}": fill in Last Fill Date OR Pills Remaining — not both.`);
      hasError = true; break;
    }
    if (!hasDate && !hasPills) {
      const card = document.getElementById(`rx-${id}`);
      card.classList.add('input-error');
      showError(`"${name}": enter either a Last Fill Date or Pills Remaining.`);
      hasError = true; break;
    }

    if (isNaN(supply) || supply < 1) {
      showError(`"${name}": please enter a valid Days Supply.`);
      hasError = true; break;
    }

    let lastFill;
    let derived = false; // tracks whether lastFill was estimated vs. entered directly

    if (hasDate) {
      // Direct path: user gave us the exact last fill date
      lastFill = pd(dateStr);
      if (lastFill > today) {
        showError(`"${name}": Last Fill Date cannot be in the future.`); hasError = true; break;
      }
    } else {
      // Estimation path: work backwards from pills on hand
      const pills = parseFloat(pillsVal);
      if (isNaN(pills) || pills < 0) {
        showError(`"${name}": Pills Remaining must be 0 or more.`); hasError = true; break;
      }
      const dosesPerDay = Math.max(1, parseFloat(document.getElementById(`doses-${id}`).value) || 1);
      const daysRemaining = Math.round(pills / dosesPerDay);
      // Sanity check: more than 10× the days supply remaining is unreasonably high
      if (daysRemaining > supply * 10) {
        showError(`"${name}": Pills Remaining seems too high for a ${supply}-day supply. Check doses/day.`);
        hasError = true; break;
      }
      lastFill = addDays(today, -(supply - daysRemaining));
      derived  = true;
    }

    const expiry      = addDays(lastFill, supply);
    // Read per-card toggles
    const neverEarly  = document.getElementById(`noearly-${id}`).checked;
    // fixedSupply: always dispense exactly med.supply days — never a bridge fill
    const fixedSupply = document.getElementById(`fixedsupply-${id}`).checked;
    meds.push({ id, name, lastFill, supply, expiry, derived, neverEarly, fixedSupply });
  }

  if (hasError) return;

  // ── Step 2: determine the sync anchor ───────────────────────────────
  // The prescription with the latest expiry sets the anchor — everything
  // else gets a short (bridge) fill to line up with it.
  //
  // syncExpiry = the latest expiry date across all meds (used for math)
  // syncTarget = syncExpiry − grace = the earliest the anchor can be filled,
  //              and the date we display as the "Sync Target" the user should aim for.
  //
  // We use syncTarget (not syncExpiry) as the displayed goal because it's the
  // actual pickup date — the day the patient should go to the pharmacy.
  const syncExpiry = meds.reduce((best, m) => m.expiry > best ? m.expiry : best, meds[0].expiry);
  const rawSyncTarget = addDays(syncExpiry, -grace);
  const syncTarget = rawSyncTarget < today ? today : rawSyncTarget;

  // ── Step 3: build the fill plan for each med ─────────────────────────
  const plans = meds.map(med => {
    // The earliest this med can be refilled. If "Never fill early" is checked,
    // ignore the grace period and only allow filling on/after the exact expiry.
    // Otherwise apply the normal buffer window (expiry − grace days).
    // Either way, we can't fill in the past, so floor at today.
    const earliestFill   = med.neverEarly ? med.expiry : addDays(med.expiry, -grace);
    const fillDate       = earliestFill < today ? today : earliestFill;

    // How many days between this med's current expiry and the sync target.
    // Using expiry (not fillDate) means the dispensed quantity is the true bridge
    // from when the current supply runs out to the sync date — the early pickup
    // window doesn't inflate the quantity. newExpiry for bridge fills is set from
    // expiry + daysToSync = syncTarget, so all meds still align on the sync date.
    const daysToSync     = diffDays(med.expiry, syncTarget);

    // The anchor is the med whose expiry defines syncExpiry.
    // If two meds share the same max expiry, both will be isAnchor.
    const isAnchor       = med.expiry.getTime() === syncExpiry.getTime();

    // offsetFromSync is stored on the plan object for reference in the table.
    const offsetFromSync = diffDays(med.expiry, syncExpiry);

    let fillType, shortDays, fillDateUsed;

    if (med.fixedSupply) {
      // Fixed-supply meds always dispense exactly their original days supply.
      // They can't be shortened into a bridge fill, so they won't align to
      // the sync date — they run on their own independent schedule.
      shortDays    = med.supply;
      fillType     = 'fixed';
      fillDateUsed = fillDate;
    } else if (isAnchor || daysToSync <= 0) {
      // This med either IS the anchor, or its fill window already opens at/after
      // the sync date — fill it for the full standard supply.
      fillType = isAnchor ? 'anchor' : 'normal';
      shortDays = stdDays;
      fillDateUsed = fillDate;
    } else {
      // Bridge fill: exactly enough days so this med expires on syncTarget.
      // On syncTarget the anchor is also first fillable, so everyone goes
      // to the pharmacy on the same day.
      shortDays = daysToSync;
      fillType = 'short';
      fillDateUsed = fillDate;
    }

    // Bridge fills: newExpiry counts from the current expiry so the dispensed
    // quantity truly bridges expiry → syncTarget regardless of early pickup.
    // Anchor / normal / fixed fills still count from the actual fill date.
    const newExpiry = (fillType === 'short')
      ? addDays(med.expiry, shortDays)
      : addDays(fillDateUsed, shortDays);
    return { ...med, fillDate: fillDateUsed, fillDays: shortDays, fillType, newExpiry, offsetFromSync, syncExpiry };
  });

  renderResults(plans, grace, stdDays, syncTarget, syncExpiry, today);
}

// ── RENDER ────────────────────────────────────────────────────────────────
// renderResults builds the full output section: summary bar, sync banner,
// fill plan table, after-sync note, and the visual timeline.
// Everything is generated fresh on each Calculate.
function renderResults(plans, grace, stdDays, syncTarget, syncExpiry, today) {
  const out = document.getElementById('results');
  out.innerHTML = '';
  out.style.display = 'block';

  // Print-only header (hidden on screen, shown when printing)
  const printHeader = document.createElement('div');
  printHeader.className = 'print-header';
  printHeader.innerHTML = `<h2>RxSync — Prescription Synchronization Plan</h2><p>Generated: ${fd(today)} &nbsp;·&nbsp; Sync Target: ${fd(syncTarget)}</p>`;
  out.appendChild(printHeader);

  document.getElementById('printBtn').style.display = '';

  // ── Sync banner: the headline output ──────────────────────────────────
  // syncTarget is the pickup date (syncExpiry − grace), not the expiry itself.
  const banner = document.createElement('div');
  banner.className = 'sync-banner';
  banner.innerHTML = `
    <div>
      <h2>Sync Target Date</h2>
    </div>
    <div style="text-align:right">
      <div class="sync-banner-date">${fd(syncTarget)}</div>
      <div class="sync-banner-sub">All prescriptions will align to ${stdDays}-day fills</div>
    </div>
  `;
  out.appendChild(banner);

  // ── Fill plan table ────────────────────────────────────────────────────
  // One row per prescription showing what to do before the sync date.
  const block = document.createElement('div');
  block.className = 'section-block fill-plan-block';

  const blockHead = document.createElement('div');
  blockHead.className = 'section-block-header';
  blockHead.innerHTML = `<h3>Your Fill Schedule</h3><span class="event-date-label">One fill per prescription until sync date</span>`;
  block.appendChild(blockHead);

  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>#</th>
      <th>Prescription</th>
      <th>When to Fill</th>
      <th>Days Supply</th>
      <th>Next Refill Due</th>
    </tr></thead>
  `;
  const tbody = document.createElement('tbody');

  plans.forEach((p, i) => {
    let badgeClass;
    if (p.fillType === 'fixed')       badgeClass = 'pill-purple';
    else if (p.fillType === 'short')  badgeClass = 'pill-amber';
    else if (p.fillType === 'anchor') badgeClass = 'pill-green';
    else                              badgeClass = 'pill-blue';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--ink-muted);font-size:0.75rem">${i+1}</td>
      <td style="font-weight:500">${p.name}</td>
      <td style="font-weight:500">${fd(p.fillDate)}</td>
      <td><span class="pill-badge ${badgeClass}">${p.fillDays}d</span></td>
      <td>${fd(p.newExpiry)}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  block.appendChild(table);
  out.appendChild(block);

  // ── After-sync note ────────────────────────────────────────────────────
  // Reminds the user what to do every cycle once they're in sync.
  const afterNote = document.createElement('div');
  afterNote.style.cssText = 'background:var(--accent-light);border:1.5px solid var(--accent);border-radius:var(--radius);padding:16px 20px;font-size:0.82rem;color:var(--accent);margin-bottom:24px;';
  afterNote.innerHTML = `<strong>After ${fd(syncTarget)}:</strong> We will fill all ${plans.length} prescriptions for <strong>${stdDays} days</strong> together on the same pickup — every cycle from this point forward.${grace > 0 ? `<br>Your prescriptions may be filled up to <strong>${grace} day${grace !== 1 ? 's' : ''} early</strong> each cycle leading up to your sync date.` : ''}`;
  renderTimeline(out, plans, grace, syncTarget, syncExpiry, today);

  out.appendChild(afterNote);
  renderSchedule(out, plans, grace, stdDays, syncTarget, today);
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── SCHEDULE ──────────────────────────────────────────────────────────────
// renderSchedule builds a chronological pickup list sorted by fill date.
// Rows sharing the same date are visually grouped under a date header.
// The schedule has two sections:
//   1. Bridge fills — interim short fills before the sync date
//   2. Sync date — all non-fixed prescriptions filling together
function renderSchedule(out, plans, grace, stdDays, syncTarget, today) {
  const block = document.createElement('div');
  block.className = 'section-block';

  const blockHead = document.createElement('div');
  blockHead.className = 'section-block-header';
  blockHead.innerHTML = `<h3>Pickup Schedule</h3><span class="event-date-label">Your fill schedule leading up to the sync date</span>`;
  block.appendChild(blockHead);

  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Fill Date</th>
      <th>Prescription</th>
      <th>Days Supply Given</th>
      <th>Next Refill Due</th>
    </tr></thead>
  `;
  const tbody = document.createElement('tbody');

  // ── Section 1: bridge fills ──────────────────────────────────────────────
  // Short fills happen before the sync date to bridge the gap.
  // Group by fill date so same-day fills appear together.
  const bridgePlans = [...plans]
    .filter(p => p.fillType === 'short')
    .sort((a, b) => a.fillDate - b.fillDate || a.name.localeCompare(b.name));

  const bridgeGroups = [];
  for (const p of bridgePlans) {
    const key  = p.fillDate.getTime();
    const last = bridgeGroups[bridgeGroups.length - 1];
    if (last && last.key === key) last.items.push(p);
    else bridgeGroups.push({ key, date: p.fillDate, items: [p] });
  }

  bridgeGroups.forEach(group => {
    const isPast = group.date < today;
    group.items.forEach((p, idx) => {
      const tr = document.createElement('tr');
      if (isPast) tr.classList.add('schedule-row-past');
      const dateCell = idx === 0
        ? `<td rowspan="${group.items.length}" class="schedule-date-cell${isPast ? ' schedule-date-past' : ''}">
             ${fd(group.date)}
             ${isPast ? '<div class="schedule-past-tag">Fill now</div>' : ''}
           </td>`
        : '';
      tr.innerHTML = `
        ${dateCell}
        <td style="font-weight:500">${p.name}</td>
        <td><span class="pill-badge pill-amber">${p.fillDays}d</span></td>
        <td>${fd(p.newExpiry)}</td>
      `;
      tbody.appendChild(tr);
    });
  });

  // ── Section 2: sync date — all non-fixed prescriptions ──────────────────
  // On the sync date every non-fixed prescription fills together for stdDays.
  const syncItems = [...plans]
    .filter(p => p.fillType !== 'fixed')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(p => ({ ...p, fillDays: stdDays, newExpiry: addDays(syncTarget, stdDays) }));

  const syncIsPast = syncTarget < today;

  const syncBanner = document.createElement('tr');
  syncBanner.innerHTML = `
    <td colspan="4" class="schedule-sync-banner">
      We will fill all ${syncItems.length} prescriptions together on this date — this is your sync date
    </td>
  `;
  tbody.appendChild(syncBanner);

  syncItems.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.classList.add('schedule-row-sync');
    if (syncIsPast) tr.classList.add('schedule-row-past');
    const dateCell = idx === 0
      ? `<td rowspan="${syncItems.length}" class="schedule-date-cell schedule-date-sync${syncIsPast ? ' schedule-date-past' : ''}">
           ${fd(syncTarget)}
           ${syncIsPast ? '<div class="schedule-past-tag">Fill now</div>' : ''}
         </td>`
      : '';
    tr.innerHTML = `
      ${dateCell}
      <td style="font-weight:500">${p.name}</td>
      <td><span class="pill-badge pill-green">${p.fillDays}d</span></td>
      <td>${fd(p.newExpiry)}</td>
    `;
    tbody.appendChild(tr);
  });

  // ── Fixed supply prescriptions ───────────────────────────────────────────
  // Fixed meds run on their own schedule and don't participate in the sync.
  const fixedPlans = [...plans]
    .filter(p => p.fillType === 'fixed')
    .sort((a, b) => a.fillDate - b.fillDate || a.name.localeCompare(b.name));

  if (fixedPlans.length > 0) {
    fixedPlans.forEach((p, idx) => {
      const isPast = p.fillDate < today;
      const tr = document.createElement('tr');
      if (isPast) tr.classList.add('schedule-row-past');
      const dateCell = idx === 0
        ? `<td rowspan="${fixedPlans.length}" class="schedule-date-cell${isPast ? ' schedule-date-past' : ''}">
             ${fd(p.fillDate)}
             ${isPast ? '<div class="schedule-past-tag">Fill now</div>' : ''}
           </td>`
        : '';
      tr.innerHTML = `
        ${dateCell}
        <td style="font-weight:500">${p.name}</td>
        <td><span class="pill-badge pill-purple">${p.fillDays}d</span></td>
        <td>${fd(p.newExpiry)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  block.appendChild(table);
  out.appendChild(block);
}

// ── TIMELINE ──────────────────────────────────────────────────────────────
// renderTimeline draws a proportional horizontal bar chart — one row per Rx.
// Each row shows two segments:
//   Segment 1 (grey/blue): the current fill period (lastFill → expiry)
//   Segment 2 (amber/green): the bridge or anchor fill (fillDate → newExpiry)
// Vertical lines mark today, each non-anchor fill date, and the sync target.
function renderTimeline(out, plans, grace, syncTarget, syncExpiry, today) {
  const block = document.createElement('div');
  block.className = 'section-block timeline-block';

  const blockHead = document.createElement('div');
  blockHead.className = 'section-block-header';
  blockHead.innerHTML = `<h3>Visual Timeline</h3><span class="event-date-label">Green bar = sync date · Blue = estimated from pills</span>`;
  block.appendChild(blockHead);

  const wrap = document.createElement('div');
  wrap.className = 'timeline-wrap';

  // Determine the date range for the timeline.
  // Left edge = earliest date across all plans; right edge = 15 days past syncExpiry
  // so there's breathing room after the last segment ends.
  const allDates = plans.flatMap(p => [p.lastFill, p.expiry, p.fillDate, p.newExpiry]);
  const minD = allDates.reduce((a,b) => a < b ? a : b);
  const maxD = addDays(syncExpiry, 15);
  const totalSpan = diffDays(minD, maxD);

  // pct() converts a date into a left-offset percentage within the timeline.
  // Clamped to [0, 100] so out-of-range dates don't break the layout.
  function pct(d) { return Math.max(0, Math.min(100, diffDays(minD, d) / totalSpan * 100)); }

  let html = `<div class="tl-title">Timeline · ${plans.length} prescription${plans.length>1?'s':''}</div>`;

  // Global vertical lines (same position on every row, computed once)
  const todayPct = pct(today).toFixed(2);
  const syncPct  = pct(syncTarget).toFixed(2);

  plans.forEach(p => {
    // Segment 1: existing/current fill (grey if date-based, blue if estimated from pills)
    const s1L = pct(p.lastFill).toFixed(2);
    const s1W = Math.max(0.5, pct(p.expiry) - pct(p.lastFill)).toFixed(2); // min 0.5% so it's always visible

    // Segment 2: the recommended next fill (bridge = amber, anchor/normal = green)
    const s2L = pct(p.fillDate).toFixed(2);
    const s2W = Math.max(0.5, pct(p.newExpiry) - pct(p.fillDate)).toFixed(2);

    const seg1Class = p.derived ? 'seg-derived' : 'seg-past';
    const seg2Class = (p.fillType === 'anchor' || p.fillType === 'synced') ? 'seg-sync'
                    : p.fillType === 'short'  ? 'seg-short'
                    : p.fillType === 'fixed'  ? 'seg-fixed'
                    : 'seg-sync';

    // Per-row fill date marker (purple line + date label above the track).
    // Skipped for the anchor because the green sync line already marks its fill date.
    const fillPct = pct(p.fillDate).toFixed(2);
    const fillMarker = p.fillType !== 'anchor'
      ? `<div class="tl-vline fill" style="left:${fillPct}%">
           <div class="tl-fill-label">${fd(p.fillDate)}</div>
         </div>`
      : '';

    html += `<div class="tl-row">
      <div class="tl-label" title="${p.name}">${p.name}</div>
      <div class="tl-track">
        <div class="tl-seg ${seg1Class}" style="left:${s1L}%;width:${s1W}%">${p.supply}d</div>
        <div class="tl-seg ${seg2Class}" style="left:${s2L}%;width:${s2W}%">${p.fillDays}d</div>
        ${fillMarker}
        <div class="tl-vline today" style="left:${todayPct}%"></div>
        <div class="tl-vline sync"  style="left:${syncPct}%"></div>
      </div>
    </div>`;
  });

  // Shared date axis below all rows
  html += `<div class="tl-axis">
    <div class="tl-tick today" style="left:${todayPct}%">Today</div>
    <div class="tl-tick sync"  style="left:${syncPct}%">${fd(syncTarget)}</div>
  </div>`;

  // Legend explaining each colour/line type
  html += `<div class="tl-legend">
    <div class="tl-leg-item"><div class="tl-leg-swatch swatch-past" style="background:var(--surface2);border:1px solid var(--border)"></div>Current fill (date-based)</div>
    <div class="tl-leg-item"><div class="tl-leg-swatch swatch-derived" style="background:var(--blue)"></div>Current fill (estimated from pills)</div>
    <div class="tl-leg-item"><div class="tl-leg-swatch swatch-short" style="background:#b07a1a"></div>Short (bridge) fill</div>
    <div class="tl-leg-item"><div class="tl-leg-swatch swatch-sync" style="background:var(--accent)"></div>Anchor / sync fill</div>
    <div class="tl-leg-item"><div class="tl-leg-swatch swatch-fixed" style="background:#6b3fa0"></div>Fixed supply fill</div>
    <div class="tl-leg-item"><div class="tl-leg-swatch swatch-today" style="background:var(--accent2);height:4px;margin-top:5px;border-radius:2px"></div>Today</div>
    <div class="tl-leg-item"><div class="tl-leg-swatch swatch-fill-line" style="background:#7c4d9e;height:4px;margin-top:5px;border-radius:2px"></div>Recommended fill date</div>
    <div class="tl-leg-item"><div class="tl-leg-swatch swatch-sync-line" style="background:var(--accent);height:4px;margin-top:5px;border-radius:2px"></div>Sync target</div>
  </div>`;

  wrap.innerHTML = html;
  block.appendChild(wrap);
  out.appendChild(block);
}

updateEmptyState();