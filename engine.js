// ═══════════════════════════════════════════════════════════════════
// engine.js — Shared calculation engine for 189 Hamilton St tools
// Single source of truth. Used by rental.html, report.html, condo.html
// ═══════════════════════════════════════════════════════════════════

const GBA = 3940, UA = 385, VAC = .05, MGMT = .08, DEFAULT_OPEX = 24368, APPR = 1610000;

// OpEx can be calculated two ways:
// 1. As a % of gross rental income (typical underwriting)
// 2. As a fixed dollar override (when affordable rents make the % unrealistic)
// The resolve function returns the annual opex dollar amount used in all calculations.

function resolveOpex(mode, opexPct, opexOverride, netRent, units) {
  if (mode === 'override') return opexOverride;
  // % of income: gross annual rent * opexPct
  const grossAnnual = netRent * units * 12;
  return Math.round(grossAnnual * opexPct);
}

const TIERS = [
  {pct:50,  l:'50%',  pub:1861},
  {pct:60,  l:'60%',  pub:2233},
  {pct:70,  l:'70%',  pub:2605},
  {pct:80,  l:'80%',  pub:2977},
  {pct:90,  l:'90%',  pub:3299},
  {pct:100, l:'100%', pub:3620},
  {pct:110, l:'110%', pub:3982},
  {pct:120, l:'120%', pub:4344},
  {pct:130, l:'130%', pub:4706},
  {pct:140, l:'140%', pub:5068},
  {pct:150, l:'150%', pub:5430},
  {pct:160, l:'160%', pub:5792},
  {pct:170, l:'170%', pub:6154},
  {pct:180, l:'180%', pub:6516},
  {pct:190, l:'190%', pub:6878},
  {pct:200, l:'200%', pub:7240}
];

// ── Formatting ──

function fmt(n) {
  if (!n && n !== 0 || isNaN(n)) return '$0';
  return n < 0 ? '−$' + Math.abs(Math.round(n)).toLocaleString() : '$' + Math.round(n).toLocaleString();
}

function fmtSign(n) {
  if (n > 0) return '+$' + Math.round(n).toLocaleString();
  if (n < 0) return '−$' + Math.abs(Math.round(n)).toLocaleString();
  return '$0';
}

function pctFmt(n) { return (n * 100).toFixed(1) + '%'; }

// ── Capital cost calculation (matches rental.html exactly) ──

function calcCapital(psf, softP, finP, steveContrib, downtime, netRent, baseOpex, rentedUnits) {
  const acqCost = APPR - steveContrib;
  const constr = psf * GBA;
  const soft = Math.round(constr * softP);
  const financing = Math.round((constr + acqCost) * finP);
  const totalInvest = acqCost + constr + soft + financing;
  const downCost = Math.round(netRent * (rentedUnits == null ? 2 : rentedUnits) * (downtime / 12)); // lost rent during reno (display only, not in totals)
  const downExpenses = Math.round(baseOpex * (downtime / 12)); // taxes/ins still owed
  const totalWithDown = totalInvest + downExpenses;
  return { acqCost, constr, soft, financing, totalInvest, downCost, downExpenses, totalWithDown };
}

// ── Year-by-year cash flow (matches rental.html's go() loop exactly) ──

function calcYearlyFlow(netRent, rg, eg, draw, chip, sLife, projYrs, downtime, totalWithDown, baseOpex, ownerOccupied, ownerUnits) {
  // ownerOccupied defaults to true for backward compatibility.
  // When false, all units are rented from Year 1: no care draw,
  // no owner expense share, and no transition year.
  // ownerUnits (1-3, default 1) = how many units the owner occupies;
  // residency is clamped to the projection so flows never extend past it.
  const occ = ownerOccupied !== false;
  const occUnits = occ ? Math.min(3, Math.max(1, ownerUnits == null ? 1 : ownerUnits)) : 0;
  const effSLife = occ ? Math.min(sLife, projYrs) : 0;
  const years = [];
  let cumCF = 0, yr1Noi = 0, paybackYr = null, firstFullYr = null;

  for (let y = 1; y <= projYrs; y++) {
    const yrEndMonth = y * 12;
    const opMonths = Math.max(0, Math.min(12, yrEndMonth - downtime));
    const isReno = opMonths === 0;
    const isPartial = opMonths > 0 && opMonths < 12;
    const isTransition = occ && y === effSLife + 1;
    const rentalUnits = y <= effSLife ? 3 - occUnits : 3;
    const steveAlive = occ && y <= effSLife;

    const rm = Math.round(netRent * Math.pow(1 + rg, y - 1));
    const ga = Math.round(rm * rentalUnits * opMonths);
    const egi = Math.round(ga * (1 - VAC));
    const ox = Math.round(baseOpex * Math.pow(1 + eg, y - 1));
    const steveShare = steveAlive && chip ? Math.round(ox * occUnits / 3) : 0; // owner pays 1/3 per occupied unit
    const buildingOx = ox - steveShare;
    const mf = Math.round(egi * MGMT);
    const totOx = buildingOx + mf;
    const noi = egi - totOx;
    const careDraw = steveAlive ? Math.round(draw * (opMonths / 12)) : 0;
    const cf = noi - careDraw;
    cumCF += cf;

    if (!firstFullYr && opMonths === 12) { firstFullYr = y; yr1Noi = noi; }
    if (paybackYr === null && cumCF >= totalWithDown) paybackYr = y;

    years.push({ y, opMonths, rentalUnits, steveAlive, isTransition, isReno, isPartial, rm, ga, egi, ox, steveShare, buildingOx, totOx, noi, careDraw, cf, cumCF });
  }

  if (!firstFullYr && years.length > 0) {
    const firstOp = years.find(y => y.opMonths > 0);
    yr1Noi = firstOp ? firstOp.noi : 0;
  }

  return { years, cumCF, yr1Noi, paybackYr, firstFullYr };
}

// ── Scenario calculator for report.html ──
// Runs the full year-by-year model (same as rental.html) and extracts summary metrics

function calcScenario(amiIdx, params) {
  const { mktRent, draw, chip, sLife, psf, softP, finP, steveContrib, downtime, rg, eg, yrs, opexMode, opexPct, opexOverride, ownerOccupied, ownerUnits } = params;
  const occ = ownerOccupied !== false;
  const occUnits = occ ? Math.min(3, Math.max(1, ownerUnits == null ? 1 : ownerUnits)) : 0;
  const effSLife = occ ? Math.min(sLife, yrs) : 0;
  const rentalUnitsBase = 3 - occUnits;
  const tier = TIERS[amiIdx];
  const netRent = tier.pub - UA;
  const isAffordable = netRent <= mktRent;
  const marketDelta = mktRent > 0 ? ((netRent - mktRent) / mktRent * 100) : 0;

  // Resolve operating expenses: % of income or fixed override
  // % -of-income opex needs an income base; if the owner occupies all 3 units, use the post-transition (3-unit) configuration
  const baseOpex = resolveOpex(opexMode || 'override', opexPct || 0.4, opexOverride || DEFAULT_OPEX, netRent, rentalUnitsBase > 0 ? rentalUnitsBase : 3);
  const opexPctOfIncome = (netRent * rentalUnitsBase * 12) > 0 ? baseOpex / (netRent * rentalUnitsBase * 12) : 0;

  const projYrs = yrs; // never extend flows past the selected projection period
  const cap = calcCapital(psf, softP, finP, steveContrib, downtime, netRent, baseOpex, rentalUnitsBase);
  const flow = calcYearlyFlow(netRent, rg, eg, draw, chip, sLife, projYrs, downtime, cap.totalWithDown, baseOpex, occ, occUnits);

  // First full operating year cash flow (the number that matters for viability)
  const firstFullYear = flow.years.find(y => y.opMonths === 12);
  const cfFirstFull = firstFullYear ? firstFullYear.cf : 0;
  const noiFirstFull = firstFullYear ? firstFullYear.noi : 0;

  // After-transition snapshot (first year after transition, 3 units).
  // When owner-occupancy is off there is no transition, so this is the
  // first full year with all 3 units rented.
  const afterYear = occ ? (flow.years.find(y => y.y === effSLife + 1 && y.opMonths === 12) || flow.years[flow.years.length - 1]) : firstFullYear;
  const cfAfter = afterYear ? afterYear.cf : 0;
  const noiAfter = afterYear ? afterYear.noi : 0;
  const egiAfter = afterYear ? afterYear.egi : 0;
  const opexAfter = afterYear ? afterYear.totOx : 0;

  // Before-transition snapshot (last full year with the owner in Unit 1)
  // When owner-occupancy is off there is no "before", so mirror the
  // steady-state (after) values instead of returning zeroes.
  const beforeYear = flow.years.filter(y => y.steveAlive && y.opMonths === 12).pop();
  const cfBefore = beforeYear ? beforeYear.cf : cfFirstFull;
  const egiBefore = beforeYear ? beforeYear.egi : (occ ? 0 : egiAfter);
  const opexBefore = beforeYear ? beforeYear.totOx : (occ ? 0 : opexAfter);

  // Milestones: key years
  const milestoneYears = [...new Set((occ ? [1, 5, effSLife, effSLife + 1, 10, projYrs] : [1, 5, 10, projYrs]).filter(y => y >= 1 && y <= projYrs))].sort((a, b) => a - b);
  const milestones = milestoneYears.map(yr => {
    const d = flow.years.find(y => y.y === yr);
    if (!d) return null;
    let label = 'Year ' + yr;
    if (occ && yr === effSLife) label = 'Yr ' + yr + ' (last w/ owner)';
    if (occ && yr === effSLife + 1) label = 'Yr ' + yr + ' (transition)';
    if (yr === projYrs) label = 'Yr ' + yr + ' (end)';
    return { yr, cf: d.cf, noi: d.noi, cumCF: d.cumCF, opMonths: d.opMonths, label };
  }).filter(Boolean);

  // Cumulative at end of projection
  const lastYear = flow.years[flow.years.length - 1];
  const cumTotal = lastYear ? lastYear.cumCF : 0;

  // Viability tiers based on first full operating year
  let viability = 'not_viable';
  if (cfFirstFull >= 10000) viability = 'optimal';
  else if (cfFirstFull >= 0) viability = 'viable';

  // Return on capital
  const yoc = cap.totalWithDown > 0 ? noiFirstFull / cap.totalWithDown : 0;

  return {
    ownerOccupied: occ, ownerUnits: occUnits, effSLife,
    tier, netRent, isAffordable, marketDelta, baseOpex, opexPctOfIncome,
    cfFirstFull, noiFirstFull, viability, viable: cfFirstFull >= 0,
    cfBefore, egiBefore, opexBefore,
    cfAfter, noiAfter, egiAfter, opexAfter,
    milestones, cumTotal, yoc,
    cap, flow,
    firstFullYr: flow.firstFullYr, paybackYr: flow.paybackYr
  };
}

// ── Find minimum viable AMI ──

function findMinViableAMI(params) {
  for (let i = 0; i < TIERS.length; i++) {
    const s = calcScenario(i, params);
    if (s.viable) return { idx: i, tier: TIERS[i] };
  }
  return null;
}

// ── Market delta formatting ──

function fmtMarketDelta(netRent, mktRent) {
  if (mktRent <= 0) return '—';
  const delta = ((netRent - mktRent) / mktRent * 100);
  if (Math.abs(delta) < 0.5) return 'At market';
  if (delta > 0) return '<span class="warn">+' + delta.toFixed(1) + '% (premium)</span>';
  return '<span class="pos">' + delta.toFixed(1) + '% (discount)</span>';
}
