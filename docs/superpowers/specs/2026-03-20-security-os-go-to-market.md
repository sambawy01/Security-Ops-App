# Security OS for El Gouna — Go-to-Market, Pricing & Pitch Strategy

**Date:** 2026-03-20
**Status:** Approved
**Session:** 5 of 5

## Summary

Go-to-market strategy for Security OS. Self-funded build, ODH El Gouna as anchor pilot, expand to Egyptian compound market. Combination pricing model (base fee + per-officer). Lean execution — solo/small team, direct relationship with El Gouna security management.

## Market Context

### Target Market

**Primary (Year 1):** ODH properties
- El Gouna (25,000 residents, 637 security personnel) — pilot
- Other ODH communities: Lustica Bay (Montenegro), Taba Heights (Sinai), Makadi Heights (Hurghada), O West (Cairo), Byoum (Fayoum)
- ODH operates 7+ communities across 4 countries

**Secondary (Year 2+):** Egyptian gated compounds and resorts
- New Cairo compounds: Madinaty (~600K residents), Rehab City, Hyde Park, Mountain View
- North Coast: Hacienda Bay, Marassi, Jefaira, Almaza Bay
- Ain Sokhna: La Vista, Azha, Il Monte Galala
- Red Sea: Soma Bay, Sahl Hasheesh, Port Ghalib
- Estimated 200+ gated communities in Egypt with private security operations

**Why this market:**
- Every compound has private security with the same pain points (manual ops, no tracking, no accountability)
- No dominant software player in the Egyptian/MENA compound security space
- ODH logo as reference customer opens every door in Egyptian real estate

### Competitive Landscape

| Competitor | Weakness |
|-----------|----------|
| Manual operations (pen & paper) | The status quo — what 95% of compounds use |
| Generic guard tour apps (e.g., Trackforce, GuardTek) | Patrol tracking only, no incident management, no AI, no WhatsApp, not localized for Arabic/Egypt |
| Enterprise VMS platforms (Genetec, Milestone) | Camera-focused, not operations-focused, expensive, require integrators |
| Custom-built internal tools | Fragmented, unmaintained, no vendor support |

**Security OS differentiators:**
1. Purpose-built for compound/resort security (not adapted from generic guard tour)
2. Arabic-first with full RTL — no other product does this well
3. AI-powered (local, on-premise) — pattern detection, smart dispatch, auto-reporting
4. WhatsApp integration for resident complaints — meets residents where they already are
5. Offline-first mobile — works in areas with poor connectivity
6. On-premise deployment — data sovereignty, no cloud dependency

## Pricing Model

### Structure: Base Platform Fee + Per-Officer

**Base platform fee** covers: server setup, deployment, core modules, training, ongoing support and updates.

**Per-officer fee** covers: each active officer account beyond the included threshold.

### Pricing Tiers

| Tier | Community Size | Base Fee (Monthly) | Included Officers | Extra Officer | Setup Fee (One-time) |
|------|---------------|-------------------|-------------------|---------------|---------------------|
| Starter | <100 officers | EGP 15,000/mo | 50 | EGP 150/mo each | EGP 50,000 |
| Professional | 100-500 officers | EGP 35,000/mo | 200 | EGP 120/mo each | EGP 100,000 |
| Enterprise | 500+ officers | EGP 60,000/mo | 500 | EGP 100/mo each | EGP 150,000 |

**El Gouna (Enterprise tier):**
- Base: EGP 60,000/mo
- 637 officers = 500 included + 137 extra × EGP 100 = EGP 13,700/mo
- **Total monthly: EGP 73,700/mo (~$1,500 USD/mo)**
- Setup fee: EGP 150,000 (~$3,000 USD) one-time
- **Annual contract value: EGP 884,400 + 150,000 setup = ~EGP 1,034,400 (~$21,000 USD/year)**

### What's Included

**In the base fee:**
- All MVP modules (Incidents, Personnel, Command Map)
- AI features (smart dispatch, triage, pattern detection, reporting)
- WhatsApp integration
- Mobile app for all officers
- Web dashboard for management
- Server deployment and configuration
- Monthly software updates
- Technical support (business hours)

**Add-on modules (Tier 2+, future pricing):**
- Gate Management: +EGP 10,000/mo
- Asset Tracking: +EGP 5,000/mo
- Advanced Reporting & Analytics: +EGP 8,000/mo
- LPR Integration: +EGP 15,000/mo (requires hardware)

**Not included (client provides):**
- Server hardware (spec provided, client procures)
- Android tablets for officers
- Network infrastructure
- WhatsApp Business API fees (Meta charges ~$0.05/conversation)

### Pricing Rationale

- EGP 73,700/mo for El Gouna = **EGP 116/officer/month** (~$2.35 USD)
- Compare to: one security officer salary is ~EGP 5,000-8,000/mo
- The platform costs less than 1 additional officer but manages 637
- ROI argument: if the system prevents 1 serious incident per month or saves 2 hours of supervisor time per day, it pays for itself

## Pilot Strategy — El Gouna

### Approach: 2-Zone Pilot with Case Study Rights

Since you're self-funding and have direct access to security management, offer El Gouna a **minimal-risk pilot** — start with 2 zones only, prove it works, then expand.

**Pilot terms:**
- **Duration:** 6 months (2-zone pilot → phased expansion)
- **Pricing:** 50% discount on monthly fee during pilot (EGP 36,850/mo instead of 73,700)
- **Setup fee:** Waived
- **Conditions:**
  - ODH provides server hardware (you provide exact specs)
  - ODH provides Android tablets for 2-zone pilot only (~70 tablets, ~EGP 280,000)
  - Case study rights — you can reference ODH/El Gouna in marketing
  - Quarterly review meetings with security management
  - Option to continue at full price after pilot or cancel with 30-day notice

**Pilot cost to you:** Your time + software development. No hardware costs. No hosting costs (on-premise).

**Pilot value to ODH:**
- Zero setup fee
- Half-price monthly for 6 months
- Cancel anytime
- Hardware investment limited to 70 tablets (~EGP 280,000) — not 300+
- Immediate operational improvement in 2 zones; expand only if proven

### Pilot Success Criteria (Agree with ODH Before Starting)

| Metric | Target | Measured at |
|--------|--------|-------------|
| Incident response time | <5 min average (vs. current unmeasured) | Month 3 |
| Complaint resolution rate | >85% resolved within SLA | Month 3 |
| Officer shift compliance | >95% on-time check-in | Month 2 |
| Patrol completion rate | >90% checkpoints confirmed | Month 2 |
| Resident satisfaction | Qualitative — WhatsApp feedback from 2-zone residents | Month 4 |
| System uptime | >99% during operating hours | Monthly |

If targets met at month 3 review → expand to 4 more zones. If met at month 6 → full rollout proposal at full price.

### Pilot Contingency Plans

| Risk | Contingency |
|------|-------------|
| Security Manager champion leaves ODH | Build relationships with assistant managers early. Ensure ops room staff are engaged users who would advocate internally. |
| IT delays server procurement | Offer to run pilot on your own hardware temporarily (ship a mini-PC, ~EGP 15,000). Migrate to ODH server when ready. |
| Low officer adoption in pilot zones | Assign a "zone champion" (tech-savvy supervisor) per pilot zone. Daily check-ins first 2 weeks. Simplify app to absolute minimum flows. |
| System failure during critical incident | Manual fallback procedures documented and drilled before pilot launch. Paper backup for first 30 days. |

### Pilot Rollout Plan

| Week | Milestone |
|------|-----------|
| 1-2 | Server setup, database seeded with zones/checkpoints/officer profiles |
| 3 | Supervisor training (3 sessions, 2 hours each). Manual fallback drill. |
| 4 | Pilot launch — 2 zones only. Ops room + supervisors + ~60-70 officers. |
| 5-6 | Iterate based on feedback. Fix issues. Daily check-ins with zone champions. |
| 7-8 | Month 2 review against success criteria. If positive → plan 4-zone expansion. |
| 9-12 | Expand to 4 more zones (requires ~120 additional tablets) |
| 13 | Month 3 review. Formal metrics report to Operations Director. |
| 14-24 | Full rollout across all zones (remaining tablets procured) |
| 25 | Case study produced. Full-price contract negotiation. |

### Hardware Requirements (ODH Provides, Phased)

**Phase 1 — 2-zone pilot (Week 1):**

| Item | Spec | Qty | Est. Cost |
|------|------|-----|-----------|
| Server | 32GB RAM, 8-core, 1TB NVMe | 1 | ~EGP 60,000 |
| Android tablets (officers) | 8" screen, Android 10+, rugged case | 70 | ~EGP 280,000 |
| Spare tablets | Same spec | 5 | ~EGP 20,000 |

**Phase 1 total: ~EGP 360,000 (~$7,200 USD)** — manageable pilot investment

**Phase 2 — Expansion (Month 3+, only if pilot succeeds):**

| Item | Qty | Est. Cost |
|------|-----|-----------|
| Additional officer tablets | 230 | ~EGP 920,000 |
| Supervisor tablets (10") | 20 | ~EGP 120,000 |
| Additional spares | 5 | ~EGP 20,000 |

**Phase 2 total: ~EGP 1,060,000** — justified by proven pilot results

**Full hardware total: ~EGP 1,420,000 (~$28,400 USD)** — but ODH commits only EGP 360,000 upfront.

## ODH Pitch Strategy

### Who to Pitch

1. **Security Manager** (your direct contact) — operational champion, understands the pain
2. **ODH Facilities/Operations Director** — budget authority for security operations
3. **ODH CTO/IT Director** — technical sign-off for on-premise deployment

### Pitch Sequence

**Step 1: Pain validation meeting** (Security Manager, informal)
- You already have the relationship
- Walk through the pain points you've documented (Session 0-1)
- Confirm they're still accurate and current
- Ask: "If I could solve the incident tracking and officer management problems, what would that be worth to you?"
- Goal: get the security manager to champion this internally

**Step 2: Demo** (Security Manager + Operations Director)
- Live demo of MVP: create incident → AI triage → smart dispatch → officer receives on tablet → resolves → resident gets WhatsApp update
- Show command map with simulated officer positions
- Show auto-generated daily report
- Goal: get operations director excited enough to allocate budget

**Step 3: Proposal** (Formal document to Operations Director)
- Pilot terms (6 months, 50% discount, case study rights)
- Hardware requirements (they provide)
- Implementation timeline
- Expected outcomes with metrics (SLA compliance, response time improvement, complaint resolution rate)
- Goal: budget approval

**Step 4: Technical review** (IT Director/team)
- Architecture overview (on-premise, Docker, data sovereignty)
- Network requirements
- Security and data protection approach
- Goal: technical sign-off

### Key Pitch Messages

**For Security Manager:**
> "You'll know where every officer is. Every complaint will have a tracked resolution. You'll have AI-generated reports instead of spending hours compiling them manually."

**For Operations Director:**
> "This costs less than one additional security officer per month but gives you accountability across 637. The first compound in Egypt with AI-powered security operations — that's a headline for ODH's annual report."

**For IT Director:**
> "Everything runs on-premise. Your data never leaves your building. Standard Docker deployment — your team can maintain it. No vendor lock-in."

### Objection Handling

| Objection | Response |
|-----------|----------|
| "We can't afford the tablets" | Start with 2 zones (60-80 tablets). Prove ROI, then phase the rest. Tablets are a one-time cost that lasts 3-4 years. |
| "Our officers aren't tech-savvy" | The app is Arabic-first, 3 buttons. Check in, log incident, confirm checkpoint. We train supervisors who cascade. |
| "What about data security?" | On-premise. Your server, your building, your network. Nothing goes to the cloud. We can demonstrate to your IT team. |
| "We need to see it working first" | That's exactly what the pilot is. 2 zones, 6 months, cancel anytime. Zero setup fee. |
| "Can you add gate management?" | Yes — Tier 2 module. We start with the biggest pain (incidents + personnel), prove it works, then add gate management. |
| "What if you disappear as a vendor?" | The system runs on your hardware with open-source components (PostgreSQL, Docker, React). I provide full documentation and runbooks. We can set up source code escrow — if I cease operating, you get full access. Any competent IT services firm could take over maintenance. |

## Cash Flow & Personal Runway

**Assumed exchange rate:** EGP 50 = $1 USD (March 2026). All USD figures are approximate — EGP is volatile.

### Timeline to First Revenue

| Month | Activity | Income | Expenses |
|-------|----------|--------|----------|
| 1-4 | Build (phases 1-5) | EGP 0 | ~EGP 10,000 (business registration) |
| 5 | Pitch + demo | EGP 0 | EGP 0 |
| 5-6 | Deal negotiation + procurement | EGP 0 | EGP 0 |
| 7 | Pilot month 1 | EGP 36,850 | EGP 0 |
| 8-12 | Pilot months 2-6 | EGP 36,850/mo | EGP 0 |

**First revenue at month 7. Total zero-income period: ~6 months.**

You need 6 months of personal runway before pilot revenue begins. If the deal takes longer to close (IT delays, procurement), budget 8-9 months. Ensure you can sustain this before committing.

### Post-Pilot Revenue

| Month | Revenue |
|-------|---------|
| 7-12 | EGP 36,850/mo (pilot at 50%) = EGP 221,100 |
| 13+ | EGP 73,700/mo (full price) = EGP 884,400/year |

## Legal — Must Do Before Signing

1. **1-hour consultation with Egyptian tech/commercial lawyer** — before signing any pilot agreement
   - Is there licensing required for security management software in Egypt?
   - What is your liability if the system fails during a real security incident?
   - What data protection requirements apply to officer and resident data?
   - Is the pilot agreement structure (SaaS-like subscription to a compound) standard, or does it need special treatment?

2. **Business registration** — Egyptian LLC (شركة ذات مسؤولية محدودة)
   - Budget EGP 15,000-25,000 (registration + accountant + tax card + commercial register)
   - Required to issue invoices to ODH

3. **Source code escrow** (optional, builds trust) — deposit source code with a neutral third party. If you cease operating, ODH gets access. Good objection-handling tool.

4. **Support SLA in contract** — specify clearly:
   - Business hours support (Sun-Thu 9AM-6PM Egypt time)
   - Critical issue response: 4 hours
   - Non-critical: next business day
   - On-site visit: within 48 hours if needed
   - NOT included: 24/7 on-call, hardware maintenance, network issues

## Expansion Strategy

### Phase 1: ODH Properties (Year 1-2)

After El Gouna pilot succeeds (6-month mark):
1. **Package the case study:** Before/after metrics, security manager testimonial, ODH logo
2. **Pitch other ODH properties:** Same operations director can greenlight expansion. Each property is a new deployment with the same software.
3. **Target:** 2-3 ODH properties by end of Year 1

### Phase 2: Egyptian Compound Market (Year 2-3)

1. **Leverage ODH reference:** "Used by Orascom Development at El Gouna" opens doors
2. **Target large compounds first:** Madinaty, Rehab, Hyde Park — they have 200+ officer forces and the same pain points
3. **Sales channel:** Direct sales to compound management companies. Attend Egypt real estate and security industry events.
4. **Goal:** 5-10 compound deployments by end of Year 2

### Phase 3: MENA Expansion (Year 3+)

1. **Dubai/UAE:** Massive compound/community market, high willingness to pay for tech
2. **Saudi Arabia:** NEOM, Red Sea Project, Vision 2030 developments — greenfield with budgets
3. **Morocco, Tunisia:** Growing gated community market
4. **Partnerships:** Regional system integrators, security consulting firms

### Revenue Projection (Realistic)

| Period | Clients | Revenue Breakdown | Annual Revenue |
|--------|---------|-------------------|---------------|
| Year 1 H1 | 0 (building) | EGP 0 | — |
| Year 1 H2 | 1 (El Gouna pilot at 50%) | EGP 36,850 × 6 | EGP 221,100 |
| Year 2 | El Gouna full price + 1 new ODH property | EGP 73,700 + ~30,000/mo | EGP ~1,245,000 |
| Year 3 | 3-4 total compounds (El Gouna + 2-3 new) | EGP ~150,000/mo avg | EGP ~1,800,000 |

**Assumptions:**
- Year 2 new client: another ODH property (Makadi Heights or O West), ~200 officers, Professional tier = EGP 35,000 base. Same sales motion via ODH Operations Director.
- Year 3 adds 1-2 non-ODH Egyptian compounds via the El Gouna case study. 6-12 month sales cycle means leads started in Year 2.
- Solo developer until Year 2 revenue justifies first hire (likely a junior dev or support/deployment person).
- MENA expansion (Year 3+) evaluated only after 3+ Egyptian deployments are stable. Not modeled here.

**Break-even:** From month 7 (first pilot payment). Near-zero ongoing costs — your time is the primary investment.

## Build Strategy — Cheapest & Most Efficient

Since you're self-funding:

### Cost Minimization

| Item | Approach | Cost |
|------|----------|------|
| Development | You + Claude Code. No hired devs until revenue supports it. | $0 (your time) |
| Server (dev/staging) | Your Mac running Docker | $0 |
| Server (production) | ODH provides per pilot terms | $0 |
| Domain + SSL | Cloudflare free tier | $0 |
| WhatsApp API | Meta Cloud API — free for first 1,000 conversations/mo | ~$0 for pilot |
| Map tiles | OpenStreetMap — free, self-hosted | $0 |
| AI | Ollama — free, local | $0 |
| Design | Tailwind + shadcn/ui — no designer needed | $0 |
| Business registration | Egyptian LLC (شركة ذات مسؤولية محدودة) + accountant + tax card | ~EGP 15,000-25,000 |

**Total out-of-pocket to reach pilot: ~EGP 20,000-25,000 ($400-500 USD) + your time**

### Build Order (Demo-First, Interleaved with Pitch)

The web dashboard is the demo. Build it first, pitch with it, then build the mobile app after the deal is signed.

| Phase | Weeks | Deliverable | Pitch Step |
|-------|-------|-------------|------------|
| 1. Backend API + seed data | 1-2 | API running with El Gouna zones, checkpoints, simulated officers | Step 1: Pain validation meeting (week 1) |
| 2. Web dashboard | 3-5 | Command map, incident queue, personnel panel — live demo | Step 2: Demo (week 5) |
| 3. Proposal + tech review | 5-6 | Formal proposal PDF, architecture 1-pager | Steps 3-4 (week 6) |
| 4. Mobile app (offline-first) | 7-11 | React Native app with GPS, patrols, incident logging, Arabic RTL | Build while deal closes |
| 5. AI integration | 12-15 | Ollama prompts for triage, dispatch, reports. Arabic prompt engineering + iteration. | — |
| 6. WhatsApp integration | 15-16 | Webhook + outbound templates, Cloudflare Tunnel | — |
| 7. Integration testing | 16-18 | End-to-end testing, load simulation (637 officers), Arabic RTL QA | — |

**Total: ~18 weeks of focused development**

Testing happens throughout — integration tests for critical paths (incident creation, dispatch, sync) are written alongside each phase, not deferred to the end.

### Demo Strategy

For the Step 2 pitch demo:
- Seed database with real El Gouna zones, checkpoints, and officer names
- Simulate officer GPS movement on the command map
- Create realistic incidents and show the full lifecycle
- Show an AI-generated daily report (can be pre-generated if Ollama not ready)

The mobile app can come after the deal is signed. ODH doesn't need to see the tablet app to approve the pilot — they need to see the dashboard.

## Deliverables

| Deliverable | Purpose | When |
|-------------|---------|------|
| Case study template | Ready to fill with pilot metrics | Before pilot starts |
| Pilot agreement (1-page) | Terms, timeline, responsibilities | Before pilot starts |
| Formal proposal (PDF) | For Operations Director budget approval | Pitch Step 3 |
| Architecture overview (1-pager) | For IT Director technical review | Pitch Step 4 |
| Training materials | Arabic + English, screen recordings + printed guides | Week 3 of pilot |

## Out of Scope (Session 5)

- Detailed financial projections beyond Year 3
- Legal/regulatory requirements for security software in Egypt
- Partnership/reseller agreements
- Investor pitch materials (bootstrapped approach)

## Session Roadmap — Complete

| Session | Topic | Status |
|---------|-------|--------|
| 0 | Initial scoping, pain point mapping | COMPLETE |
| 1 | Platform vision, feature tiers, MVP | COMPLETE |
| 2 | Technical architecture | COMPLETE |
| 3 | Ops workflows, RBAC, escalation, SLA | COMPLETE |
| 4 | Resident-facing product, WhatsApp flows | DEFERRED (covered in Session 2 architecture) |
| 5 | Go-to-market, pricing, ODH pitch | COMPLETE |

**Next step: Build.**
