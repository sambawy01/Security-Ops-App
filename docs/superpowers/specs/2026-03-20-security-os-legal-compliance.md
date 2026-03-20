# Security OS for El Gouna -- Legal & Regulatory Compliance Assessment

**Date:** 2026-03-20
**Status:** Draft -- Requires Local Counsel Review
**Session:** Legal Compliance Supplement
**Prepared for:** Security OS founder / solo developer
**Scope:** El Gouna pilot deployment (Tier 1 MVP), with forward-looking analysis for Tiers 2-3

---

## Disclaimer

This document is an analytical compliance framework, not legal advice. Egyptian law -- particularly Law 151/2020 and its executive regulations -- is evolving, and enforcement practices may differ from the statutory text. Several areas below are flagged with **[VERIFY WITH LOCAL COUNSEL]** where the regulatory position is ambiguous or where the consequences of non-compliance are severe enough to warrant professional legal confirmation before proceeding.

---

## Table of Contents

1. [Egypt Personal Data Protection Law (Law 151/2020)](#1-egypt-personal-data-protection-law-law-1512020)
2. [Egyptian Labor Law Implications](#2-egyptian-labor-law-implications)
3. [Security Industry Regulations](#3-security-industry-regulations)
4. [Commercial and Contractual Considerations](#4-commercial-and-contractual-considerations)
5. [WhatsApp Business API Compliance](#5-whatsapp-business-api-compliance)
6. [Future-Proofing: Tier 2-3 Regulatory Concerns](#6-future-proofing-tier-2-3-regulatory-concerns)
7. [Recommended Legal Actions Before Signing Pilot](#7-recommended-legal-actions-before-signing-pilot)
8. [Appendix: Template Contract Clauses](#appendix-a-template-contract-clauses)

---

## 1. Egypt Personal Data Protection Law (Law 151/2020)

### 1.1 Overview

Egypt's Personal Data Protection Law (PDPL), Law No. 151 of 2020, was published in the Official Gazette on October 15, 2020. The law establishes a Data Protection Center (DPC) under the Information Technology Industry Development Agency (ITIDA) as the supervisory authority. Executive regulations were issued by Prime Ministerial Decree to operationalize the law.

**Key characteristics:**
- Applies to any processing of personal data by natural or legal persons within Egypt
- Extraterritorial application for data relating to Egyptian nationals processed abroad
- Heavily influenced by the GDPR but with notable differences in enforcement and consent models
- The DPC has authority to issue licenses, receive complaints, conduct inspections, and impose penalties

**[VERIFY WITH LOCAL COUNSEL]:** The DPC's operational readiness and enforcement posture as of March 2026. Early enforcement signals and any published guidance or registration procedures should be confirmed, as they may have evolved since the law's enactment.

### 1.2 Data Categories in Security OS Subject to the Law

The following data processed by Security OS falls squarely within the PDPL's definition of "personal data" (any data relating to an identified or identifiable natural person):

#### 1.2.1 Officer Personal Data (637 personnel)

| Data Element | PDPL Classification | Storage Location | Retention per Spec |
|---|---|---|---|
| Name (Arabic and English) | Personal data | PostgreSQL `officers` table | While active |
| Badge number | Personal data (identifier) | PostgreSQL `officers` table | While active |
| Phone number | Personal data | PostgreSQL `officers` table | While active |
| Photo | Personal data (biometric-adjacent) | `/data/media/officers/` | While active |
| PIN hash (bcrypt) | **Sensitive data** -- authentication credential | PostgreSQL `officers` table | While active |
| Device fingerprint/face unlock | **Sensitive data** -- biometric | Device-native, not stored on server | Session-scoped |
| GPS location (every 30 seconds) | Personal data (location tracking) | PostgreSQL `officer_locations` (PostGIS) | 90 days |
| Shift check-in/out timestamps + GPS | Personal data | PostgreSQL `shifts` table | Indefinite per spec |
| Performance metrics | Personal data (profiling) | PostgreSQL `performance_metrics` | Indefinite per spec |
| Patrol logs with GPS trail | Personal data (location tracking) | PostgreSQL `patrol_logs`, `patrol_checkpoints` | Not specified in spec |
| Audit logs (actions taken) | Personal data | PostgreSQL `audit_logs` | Indefinite per spec |

#### 1.2.2 Resident Personal Data (up to 25,000 residents)

| Data Element | PDPL Classification | Storage Location | Retention per Spec |
|---|---|---|---|
| Phone number (from WhatsApp) | Personal data | PostgreSQL `incidents.reporter_phone`, `whatsapp_messages.sender_phone` | Tied to incident retention (2 years for media; DB records unspecified) |
| Complaint message content | Personal data | PostgreSQL `whatsapp_messages.content` | Not specified |
| Location shared in message | Personal data | PostgreSQL `incidents.location` | Not specified |
| Photos sent with complaints | Personal data | `/data/media/incidents/` | 2 years |

#### 1.2.3 Sensitive Data Requiring Elevated Protection

Under Article 2 of Law 151/2020, "sensitive personal data" includes biometric data, health data, and data revealing political opinions, religious beliefs, criminal records, or trade union membership. Within Security OS:

- **Officer PIN authentication** -- While stored as bcrypt hashes (not raw biometrics), the PIN is an authentication credential. The law may classify authentication data processing as sensitive depending on DPC interpretation.
- **Device-native biometric unlock (fingerprint/face)** -- The biometric template remains on-device and is never transmitted to the server. However, the fact that the system *enables* biometric authentication means the data controller (ODH/your company) should document this in a privacy impact assessment.
- **Incident reports involving criminal activity** -- Reports covering security threats, trespassing, or accidents may contain information that touches on criminal matters. These are not biometric data, but they require careful handling.

**[VERIFY WITH LOCAL COUNSEL]:** Whether bcrypt-hashed PINs are classified as "biometric data" or merely "authentication data" under the executive regulations. The distinction affects the legal basis and consent requirements.

### 1.3 Registration with the Data Protection Center

Article 28 of Law 151/2020 requires that any person intending to hold, process, or manage personal data must apply for a license, permit, or registration from the DPC before commencing processing.

**Requirements for Security OS:**

1. **Who registers:** The data controller. In this deployment model, ODH (the entity operating the security force and directing data processing) is the data controller. Your company is the data processor. Both may have registration obligations.
2. **What to register:**
   - Categories of data subjects (officers, residents)
   - Types of personal data collected
   - Purposes of processing
   - Retention periods
   - Technical and organizational security measures
   - Any cross-border data transfers (WhatsApp API)
3. **When:** Before commencing data processing -- meaning before the pilot goes live with real officer or resident data.
4. **Cost:** The executive regulations specify fee schedules. **[VERIFY WITH LOCAL COUNSEL]** the current fee amounts and registration timeline.

**Recommended action:** File the DPC registration as a joint submission with ODH, clearly delineating controller (ODH) vs. processor (your company) responsibilities. This also protects you by formalizing that ODH directs the processing purposes.

### 1.4 Consent Requirements

Law 151/2020 requires consent to be explicit, informed, documented, and freely given for the specific purpose of processing. Consent can be withdrawn at any time.

#### 1.4.1 Officer GPS Tracking

**Legal basis analysis:**

The PDPL recognizes several legal bases for processing (Article 3), including:
- Consent of the data subject
- Necessary for the performance of a contract
- Necessary for legitimate interests of the controller (subject to balancing test)
- Necessary for compliance with a legal obligation

GPS tracking of officers every 30 seconds during duty hours is the most privacy-intrusive element of the system. The legal basis options are:

**Option A -- Contractual necessity + legitimate interest (preferred):**
- GPS tracking is arguably necessary for the performance of the employment contract (the officer's role requires being at assigned locations) and for ODH's legitimate interest in security operations management.
- This avoids the fragility of consent (which can be withdrawn, potentially undermining the entire system).
- Requires a Legitimate Interest Assessment (LIA) documenting: the specific interest, why tracking is necessary, why less intrusive means are insufficient, and the safeguards in place (90-day retention, role-based access, audit logging).

**Option B -- Explicit consent (fallback):**
- Each officer signs a consent form in Arabic, clearly stating: what is tracked (GPS location every 30 seconds during shift), why (operational coordination, safety, accountability), who has access (zone supervisor, ops room, managers), how long it is retained (90 days), and their right to object.
- Risk: If an officer withdraws consent, the system cannot track them. This creates an operational gap. Mitigate by arguing that GPS tracking is an inherent part of the role (contractual necessity).

**Recommended approach:** Use contractual necessity as the primary legal basis, supplemented by a transparent notice to officers. Obtain written acknowledgment (not consent per se, but confirmation that the officer has been informed) as part of the employment onboarding. This is more defensible than pure consent because it cannot be unilaterally withdrawn.

**[VERIFY WITH LOCAL COUNSEL]:** Whether the DPC accepts "contractual necessity" or "legitimate interest" as a legal basis for continuous GPS tracking of employees, or whether explicit consent is mandated regardless.

#### 1.4.2 Officer Photos and Biometric PINs

- **Photos:** Used for identification on the command map and roster. Legal basis: contractual necessity (the employer needs to identify its security officers). Inform officers that their photo will be stored digitally and displayed to authorized management personnel.
- **PIN (hashed):** Used for authentication. If classified as sensitive data, explicit consent is required under Article 4. If classified as standard authentication data, contractual necessity may suffice.
- **Device-native biometrics:** Since the biometric template never leaves the device and is processed by the operating system (not by Security OS), the argument is that your system does not "process" biometric data. Document this architecture clearly in the privacy impact assessment.

**Recommended action:** Regardless of the legal basis debate, prepare and distribute an Arabic-language Privacy Notice for Officers that covers all data collection, purposes, retention, access rights, and the right to lodge a complaint with the DPC. Obtain signed acknowledgment from each officer before pilot launch.

#### 1.4.3 Resident Data (Phone Numbers from WhatsApp)

Residents voluntarily initiate contact by sending a WhatsApp message to the security number. This creates an implied consent scenario -- the resident has chosen to provide their phone number and complaint details for the purpose of receiving security assistance.

However, the PDPL requires that consent be "informed," meaning the resident should be aware that:
- Their phone number and message content will be stored in a digital system
- They will receive automated status updates
- Their data will be retained for a specified period
- They can request deletion of their data

**Recommended approach:**
1. Add an automated first-response message to the WhatsApp flow that includes a brief privacy notice: "Your message and phone number will be recorded in our security management system to process your complaint. You will receive status updates via WhatsApp. For our privacy policy, visit [link] or reply PRIVACY."
2. Make a privacy policy available (hosted on a simple webpage or as a PDF shared via WhatsApp on request).
3. For ongoing messaging (status updates), rely on the resident's continued engagement as implied consent. Include an opt-out mechanism: "Reply STOP to stop receiving updates."

**[VERIFY WITH LOCAL COUNSEL]:** Whether the WhatsApp-initiated contact constitutes sufficient implied consent under the PDPL, or whether a more formal opt-in mechanism is required before storing the phone number in the incident management system.

### 1.5 Data Retention Obligations and Limits

Law 151/2020 Article 5 establishes the principle of storage limitation -- personal data should not be kept longer than necessary for the purpose of collection.

**Current retention periods in the spec vs. recommended compliance posture:**

| Data Type | Current Spec | Recommended Maximum | Justification |
|---|---|---|---|
| Officer GPS locations | 90 days | 90 days (acceptable) | Sufficient for pattern analysis, incident review, and performance metrics. Auto-purge after 90 days is good practice. |
| Incident records (DB) | Not specified | 3 years, then anonymize | Needed for trend analysis, legal evidence, insurance claims. Anonymize (remove reporter phone, officer names) after 3 years; retain aggregate statistics indefinitely. |
| Incident media (photos, voice notes) | 2 years | 2 years (acceptable) | Align with statute of limitations for relevant civil claims. Auto-delete after 2 years. |
| WhatsApp messages | Not specified | 1 year from incident closure | After resolution and review period, message content should be purged. Retain only the incident record. |
| Officer profiles | While active | Active period + 1 year post-termination | Labor law may require retention of employment records. Purge after 1 year post-departure. |
| Audit logs | Indefinite | 5 years, then purge | Needed for compliance demonstration, but indefinite retention of personal data is problematic. 5 years is defensible for regulatory purposes. |
| Performance metrics | Indefinite | 3 years | Same as incident records. Anonymize or aggregate after 3 years. |
| Shift records | Not specified | 3 years | Align with labor law record-keeping requirements. |

**Recommended action:** Implement a data retention schedule as a configuration table in the system. Build automated purge/anonymization jobs (BullMQ cron jobs) that execute the retention policy. Document the retention schedule in the DPC registration.

### 1.6 Cross-Border Data Transfer

Article 17 of Law 151/2020 restricts the transfer of personal data outside Egypt. Transfers are permitted only when:
- The receiving country provides an adequate level of protection (as determined by the DPC)
- The data subject has given explicit consent to the transfer
- The transfer is necessary for the performance of a contract
- A government-to-government agreement permits it
- The DPC grants a specific license for the transfer

**Relevance to Security OS:**

The system is on-premise, and no data is transferred to cloud servers. However, the **WhatsApp Business Cloud API** introduces a cross-border transfer issue:

1. When a resident sends a WhatsApp message, the message content (including phone number, text, photos, and location) transits through Meta's servers, which are located outside Egypt (primarily in the US and EU).
2. When Security OS sends outbound status updates, the message content (ticket number, status text) transits through Meta's servers.
3. The Cloudflare Tunnel used to expose the webhook endpoint also routes traffic through Cloudflare's network infrastructure outside Egypt.

**Risk assessment:**

| Transfer | Data Involved | Risk Level | Mitigation |
|---|---|---|---|
| Inbound WhatsApp messages | Resident phone number, complaint text, photos, location | Medium | Data originates with the resident who chose to use WhatsApp (an international platform). Meta processes this data under its own privacy terms with the resident. Your system merely receives the webhook payload. |
| Outbound WhatsApp messages | Ticket number, status text (no personal data beyond what the resident already knows) | Low | Minimize personal data in outbound messages. Use ticket reference numbers, not names or detailed incident information. |
| Cloudflare Tunnel | Encrypted HTTPS traffic containing WhatsApp webhook payloads | Low | Traffic is encrypted in transit. Cloudflare does not inspect the payload content. The tunnel is used only for the WhatsApp webhook endpoint. |

**Recommended approach:**
1. Document the WhatsApp integration as a necessary cross-border transfer under "performance of a contract" (the security service agreement with ODH includes a resident complaint channel).
2. Minimize personal data in outbound messages -- use ticket numbers and generic status text only.
3. Include the WhatsApp data flow in the DPC registration.
4. If the DPC requires explicit consent for cross-border transfers, the WhatsApp privacy notice (Section 1.4.3) should include a statement that complaint data is processed through WhatsApp (Meta) servers located outside Egypt.

**[VERIFY WITH LOCAL COUNSEL]:** Whether the DPC has published an adequacy list of countries, and whether Meta's data processing through WhatsApp Business API requires a specific cross-border transfer license from the DPC.

### 1.7 Penalties for Non-Compliance

Law 151/2020 establishes the following penalties:

| Violation | Penalty |
|---|---|
| Processing personal data without consent or legal basis | Fine of EGP 100,000 to EGP 1,000,000 |
| Failure to register with the DPC | Fine of EGP 50,000 to EGP 500,000 |
| Unauthorized cross-border data transfer | Fine of EGP 200,000 to EGP 2,000,000 |
| Processing sensitive data without explicit consent | Fine of EGP 300,000 to EGP 3,000,000 |
| Data breach without notification to the DPC | Fine of EGP 200,000 to EGP 2,000,000 |
| Repeated violations | Penalties may be doubled; imprisonment of up to 6 months is possible for certain offenses |

**Key risk:** The penalties for unauthorized cross-border data transfer and processing sensitive data are the highest. The WhatsApp integration and officer biometric PINs are the two areas where exposure is greatest.

**[VERIFY WITH LOCAL COUNSEL]:** Current enforcement posture of the DPC and whether any penalties have been imposed under the law to date. This will indicate how aggressively the DPC is enforcing.

### 1.8 Data Protection Officer Requirement

**[VERIFY WITH LOCAL COUNSEL]:** Whether the PDPL or its executive regulations require the appointment of a Data Protection Officer (DPO) for organizations processing personal data at this scale (637 officers, 25,000 potential residents). If required, determine whether the DPO can be an external appointment (e.g., the founder) or must be a dedicated internal role at ODH.

### 1.9 Data Breach Notification

Article 7 of Law 151/2020 requires the data controller to notify the DPC of any data breach within 72 hours of becoming aware of it. If the breach poses a high risk to data subjects, they must also be notified without undue delay.

**Recommended action for Security OS:**
1. Build breach detection capabilities into the monitoring stack (unusual database access patterns, failed authentication spikes, unauthorized API calls flagged in audit logs).
2. Document an incident response procedure that includes: breach identification, impact assessment, DPC notification within 72 hours, affected data subject notification if required, and remediation steps.
3. Include breach notification obligations in the Data Processing Agreement with ODH (see Section 4).

---

## 2. Egyptian Labor Law Implications

Egyptian labor relations are primarily governed by Labor Law No. 12 of 2003 and its amendments. The following analysis addresses how Security OS interacts with employee rights and employer obligations.

### 2.1 GPS Tracking of Employees

Egyptian labor law does not contain a specific provision addressing employer GPS tracking of employees. However, several principles are relevant:

**Right to privacy:** The Egyptian Constitution (Article 57) protects the right to privacy. Continuous GPS tracking of employees is a significant privacy intrusion that must be justified by legitimate business purposes and implemented with appropriate safeguards.

**Employer's right to monitor:** Egyptian courts have generally recognized the employer's right to monitor employee performance and ensure compliance with work duties, provided that:
- The monitoring is proportionate to the legitimate purpose
- Employees are informed of the monitoring
- The monitoring occurs during work hours and at the workplace

**Analysis for Security OS:**
- GPS tracking every 30 seconds during duty hours is justifiable for a security operation where officer location is operationally critical (dispatch, safety, accountability).
- Tracking must stop at shift end (check-out). The spec confirms this -- tracking is active only during shifts.
- Officers must be clearly informed about the tracking (see Section 1.4.1).
- The 90-day retention period is reasonable and proportionate.

**Recommended action:**
1. Include GPS tracking disclosure in the officer's employment contract or an addendum.
2. Ensure the mobile app visibly indicates when GPS tracking is active (status bar icon or in-app indicator).
3. Confirm that GPS tracking ceases immediately upon shift check-out and does not resume until next check-in.
4. Do not use GPS data for purposes beyond those disclosed (e.g., do not track officers' off-duty locations even if the app is installed on their personal device -- the spec uses dedicated tablets, which mitigates this risk).

**[VERIFY WITH LOCAL COUNSEL]:** Whether there are any Ministry of Manpower guidelines or court precedents specifically addressing employer GPS tracking of employees, particularly in the security sector.

### 2.2 Performance Monitoring via Software

The spec tracks the following performance metrics per officer:
- Average response time
- SLA compliance rate
- Patrol completion rate
- Incidents handled count
- Escalation rate
- No-show rate
- Shift punctuality (check-in delta)

**Legal considerations:**

1. **Transparency:** Officers must be informed that their performance is monitored and which metrics are tracked. This should be part of the system onboarding and documented in the employment contract addendum.

2. **Fairness and due process:** Under Egyptian labor law, disciplinary action must follow the internal regulations (la'eha) of the company. Metrics generated by the system can be used as evidence in disciplinary proceedings, but:
   - The officer must be given an opportunity to respond to any allegations
   - The investigation must be conducted by the competent authority (HR/management, not the software)
   - Penalties must be proportionate and follow the graduated scale in the company's internal regulations

3. **AI-generated assessments:** The AI-generated anomaly alerts (officer stationary too long, route deviation) should be treated as flags for human review, not as automated disciplinary triggers. If the system auto-flags an officer for performance issues, a human supervisor must investigate and make any disciplinary decision.

**Recommended action:**
- Explicitly state in the system documentation and officer training that AI alerts and performance metrics are decision-support tools, not automated decision-making.
- Ensure the company's internal regulations (la'eha) are updated to reference the digital performance tracking system.
- Require supervisor validation before any adverse employment action based on system-generated data.

### 2.3 Penalizing Officers Based on System-Generated Metrics

**Can officers be penalized based on no-show flags, SLA breaches, or other system metrics?**

Yes, but with important procedural requirements under Labor Law No. 12/2003:

1. **Internal regulations (La'eha):** Under Article 58, every employer with 10+ employees must establish internal regulations (approved by the Ministry of Manpower) that define violations and corresponding penalties. The system-generated metrics (no-shows, SLA breaches) must map to defined violations in the la'eha.

2. **Investigation requirement:** Under Article 64, no penalty more severe than a warning may be imposed without a written investigation in which the employee is heard. The system's automated no-show flag is not an investigation -- it is evidence that triggers an investigation.

3. **Penalty proportionality:** Article 60 defines a graduated scale of penalties (warning, wage deduction, deferral of promotion, suspension, dismissal). Penalties must be proportionate to the violation.

4. **Documentation:** All disciplinary proceedings must be documented. The system's audit logs can serve as part of this documentation.

**Recommended system design:**
- No-show flags, SLA breaches, and anomaly alerts should be labeled as "requires supervisor review" rather than "violation confirmed."
- The system should not automatically impose penalties (e.g., wage deductions). All adverse actions must be initiated by a human with the officer's ability to respond.
- Build a "dispute" or "officer response" field into performance review records if such a module is developed in the future.

### 2.4 Twelve-Hour Shift Compliance

The spec defines two 12-hour shifts: 06:00-18:00 and 18:00-06:00.

**Labor Law No. 12/2003 provisions:**

- **Article 80:** Normal working hours shall not exceed 8 hours per day or 48 hours per week. Rest periods are not counted as working hours. The actual hours present at the workplace shall not exceed 10 hours per day.
- **Article 81:** Working hours and rest periods shall be arranged so that the employee does not work more than 5 consecutive hours without a rest period of at least one hour.
- **Article 85:** Overtime provisions apply when work exceeds normal hours. Overtime pay is an additional 35% for day hours and 70% for night hours.

**Analysis:**

A 12-hour shift **exceeds the maximum 10-hour daily presence** permitted under Article 80. This is a significant labor law compliance issue -- not for the software, but for the security operation itself.

**However, there are important exceptions and industry practices to consider:**

1. **Continuous operations exemption:** Article 80 provides that the Minister of Manpower may authorize different working hour arrangements for continuous operations. Security operations are inherently continuous (24/7). **[VERIFY WITH LOCAL COUNSEL]** whether a ministerial decree exempts private security operations from the standard working hour limits.

2. **Industry practice:** 12-hour shifts (2 rotations) are extremely common in the Egyptian private security industry. This does not make them legal, but it suggests either an applicable exemption exists or enforcement is not prioritized.

3. **Overtime implications:** If no exemption applies, hours beyond 8 per day (or 48 per week) must be compensated as overtime. The system should track total hours worked to ensure overtime calculations are accurate.

**Recommended actions:**
1. **[VERIFY WITH LOCAL COUNSEL]** whether private security operations at residential communities are covered by a ministerial exemption for continuous operations.
2. Regardless of the legal position, ensure the system accurately tracks hours worked. The shift check-in/check-out timestamps and overtime flagging (the spec includes `is_overtime` and `parent_shift_id` fields) are well-designed for this purpose.
3. The maximum extension of 4 hours (bringing a potential shift to 16 hours) should be flagged as a high-risk scenario. Consider implementing a hard limit or mandatory rest period requirement in the system.
4. Ensure rest periods within 12-hour shifts are documented. The system could include a mandatory "break acknowledgment" feature, though this may be over-engineering for the MVP.

### 2.5 Night Work Provisions

Article 89 of Labor Law No. 12/2003 provides that work between 7:00 PM and 7:00 AM is considered night work. Night workers are entitled to additional protections, including:
- Reduced working hours (7 hours per night)
- Health assessments
- Prohibition on night work for certain categories (minors, pregnant women)

The night shift (18:00-06:00) falls squarely within this provision. **[VERIFY WITH LOCAL COUNSEL]** whether the 7-hour night work limit applies to private security operations and whether a specific exemption exists.

---

## 3. Security Industry Regulations

### 3.1 Private Security Licensing

Private security operations in Egypt are regulated, and companies providing security services typically require licensing from the Ministry of Interior. ODH, as the operator of the security force at El Gouna, should already hold the necessary licenses for its private security operation.

**Does Security OS itself require a license?**

Security OS is a software tool for managing an existing security operation -- it is not itself a security service provider. The software does not:
- Provide security guards
- Issue security clearances
- Conduct investigations
- Carry weapons or enforce laws

It is analogous to a scheduling and incident management tool. There is no known requirement for a separate license for security *management software* in Egypt.

**However:**
- If the software is marketed as a "security system" (as opposed to "operational management software"), it could be conflated with physical security systems (CCTV, alarm systems, access control) which do require Ministry of Interior approval for installation.
- The AI component (automated triage, dispatch suggestions) could raise questions about whether the software is making "security decisions."

**[VERIFY WITH LOCAL COUNSEL]:** Whether security management software requires any form of licensing or approval from the Ministry of Interior, particularly given the AI-assisted dispatch and triage features.

**Recommended action:** Position and market the product as "security operations management software" rather than a "security system." Avoid language that implies the software makes security decisions autonomously -- emphasize that all decisions require human confirmation.

### 3.2 ODH's Security Operation Licensing

ODH's security operation at El Gouna likely operates under a license from the Ministry of Interior. This license may impose requirements on:
- Record-keeping (incident logs, patrol records)
- Reporting to authorities
- Officer training and certification
- Chain of command and supervision ratios

**Relevance to Security OS:**
- If the license requires specific record-keeping formats, the system must be able to produce compliant reports.
- If periodic reporting to authorities is required, the report generation module should include templates for regulatory submissions.
- The system's audit trail and incident logging capabilities likely exceed any paper-based requirements, which is a net positive.

**[VERIFY WITH LOCAL COUNSEL]:** What specific record-keeping and reporting obligations ODH's security license imposes, and whether digital records are accepted in lieu of paper records.

### 3.3 Digital vs. Paper Records

There is no general prohibition on digital record-keeping in Egypt. The E-Signature Law (Law No. 15 of 2004) provides legal recognition for electronic documents and signatures. However:

1. **Police and judicial proceedings:** If an incident report is needed for a criminal investigation or court proceeding, authorities may require certified copies. The system should be able to produce signed PDF exports of incident reports with complete audit trails.

2. **Regulatory inspections:** If the Ministry of Interior inspects ODH's security operation, they may expect specific documentation formats. Having a PDF export capability with Arabic-language reporting addresses this.

3. **Shift records for labor disputes:** If an officer disputes a no-show flag or disciplinary action, the system's digital records (GPS timestamps, audit logs) are admissible as electronic evidence under the E-Signature Law, provided their integrity can be demonstrated.

**Recommended action:** Implement PDF export with digital signatures (or at minimum, tamper-evident hashing) for incident reports and shift records. Ensure the audit log is append-only and cryptographically verifiable (consider hash chaining or Merkle tree structure for audit log integrity).

---

## 4. Commercial and Contractual Considerations

### 4.1 Egyptian LLC Formation

Forming a limited liability company (LLC / sharika dhat mas'uliyya mahduda) in Egypt requires:

| Requirement | Details |
|---|---|
| Minimum capital | EGP 1,000 (no minimum for most activities; certain regulated activities may require more) |
| Founders | Minimum 2 partners, maximum 50. **A sole founder cannot form an LLC.** A common workaround is to include a trusted partner with a nominal share (e.g., 1%). Alternatively, consider a single-person company (sharika al-shakhs al-wahid) which was introduced by the Investment Law amendments. |
| Registration | Commercial Registry (al-sijil al-tijari) at the General Authority for Investment and Free Zones (GAFI) |
| Tax registration | Tax Identification Number (TIN) from the Egyptian Tax Authority |
| VAT registration | If annual revenue exceeds EGP 500,000, VAT registration is mandatory (14% standard rate) |
| Social insurance | Registration with the National Organization for Social Insurance for any employees |
| Commercial license | Specific to the company's activity. Software development and licensing is typically straightforward. |

**Estimated cost:** EGP 15,000-25,000 for full formation (legal fees, registration, accountant, tax card, commercial register).

**Timeline:** 2-4 weeks for full formation through GAFI.

**[VERIFY WITH LOCAL COUNSEL]:** Whether a single-person company structure is available and appropriate for a software business, or whether a two-partner LLC is required. Also confirm whether any special license is needed for a company selling security-related software.

### 4.2 Essential Contract Clauses for the Pilot Agreement

The pilot agreement with ODH should include the following clauses, structured as a comprehensive services agreement:

#### 4.2.1 Scope and Service Description
- Detailed description of modules included (Incident Management, Personnel Management, Command Map, WhatsApp Integration, AI Features)
- Clear delineation of what is not included (gate management, asset tracking, CCTV integration, hardware)
- Service levels: system uptime target (99% during operating hours), support response times

#### 4.2.2 Data Processing Agreement (DPA)
- ODH as data controller, your company as data processor
- Processing purposes limited to those described in the agreement
- Security measures implemented (encryption at rest and in transit, access controls, audit logging)
- Sub-processor disclosure (Meta/WhatsApp for messaging, Cloudflare for tunnel)
- Breach notification obligations (72 hours per PDPL)
- Data return and deletion upon contract termination
- Audit rights for ODH to verify compliance

#### 4.2.3 Limitation of Liability

This is critical for a security management system. Key provisions:

- **Cap on liability:** Total liability under the contract should be capped at the total fees paid in the 12-month period preceding the claim. For the pilot, this would be approximately EGP 221,100 (6 months at pilot rate).
- **Exclusion of consequential damages:** Exclude liability for indirect, consequential, or incidental damages, including loss of revenue, reputational damage, or costs arising from security incidents.
- **Force majeure:** Include standard force majeure provisions covering system failures beyond reasonable control (hardware failure provided by ODH, network outages, power failures).
- **Express disclaimer:** "The Software is a management and coordination tool. It does not replace the judgment of trained security personnel, nor does it guarantee the prevention of security incidents. The Client retains full responsibility for the security of the El Gouna community and the actions of its security personnel."

**[VERIFY WITH LOCAL COUNSEL]:** Whether Egyptian law permits broad limitation of liability clauses in B2B service agreements, and whether there are any mandatory liability provisions that cannot be contractually excluded.

#### 4.2.4 System Failure During a Security Incident

The highest-risk legal scenario: the system goes down during a critical security incident, an officer is not dispatched, and harm occurs.

**Analysis:**
- The spec includes manual fallback procedures: if the system is down, security operations revert to manual (radio, paper). This is documented and should be drilled.
- The contract must make clear that the software is an enhancement to, not a replacement for, the existing security operation.
- ODH must maintain the ability to operate without the software at all times.
- Your company should not accept any liability for outcomes of security incidents. Your liability should be limited to the software functioning as described (or failing to function, in which case the remedy is fixing the software or refunding fees).

**Recommended contract language:** See Appendix A for a draft liability limitation clause.

#### 4.2.5 Intellectual Property

| IP Element | Ownership | Notes |
|---|---|---|
| Security OS source code | Your company | Core product IP. License granted to ODH for use, not ownership. |
| Customizations for ODH (zone configs, SLA rules, report templates) | Shared / licensed | Configuration data created by ODH using your platform. ODH owns the configuration; your company retains the right to use similar configurations for other clients. |
| Data generated by the system | ODH | All incident data, officer data, performance metrics, AI-generated reports belong to ODH. Your company has processing rights only for the duration of the contract. |
| AI models and prompt templates | Your company | The Ollama models are open-source. Your prompt templates and integration logic are your IP. |
| Aggregate anonymized insights | Your company (with ODH consent) | If you want to use aggregate (non-identifiable) data from ODH's deployment to improve the product for other clients, this must be explicitly agreed. |

**Recommended contract language:** Clear IP ownership clause assigning data ownership to ODH, software ownership to your company, with a license grant for ODH to use the software during the contract term. See Appendix A.

#### 4.2.6 Source Code Escrow

The go-to-market spec already mentions source code escrow as an objection-handling tool. Implementation options:

1. **Third-party escrow agent:** Deposit source code with a neutral party (there are international escrow services; local options may exist through the Egyptian Software Association). Escrow is released to ODH if your company ceases operations, fails to provide support for 90+ days, or enters bankruptcy.
2. **Simplified approach:** Provide ODH with a sealed USB containing the source code, held by ODH's IT department, with a contractual license that activates only under the escrow trigger conditions.

**[VERIFY WITH LOCAL COUNSEL]:** Whether source code escrow arrangements are recognized and enforceable under Egyptian law, and whether a simpler contractual mechanism (sealed USB with conditional license) is sufficient.

### 4.3 Tax Implications

1. **Corporate tax:** Egyptian LLCs are subject to 22.5% corporate income tax on net profits.
2. **VAT:** If your company's annual revenue exceeds EGP 500,000, you must register for VAT and charge 14% on invoices to ODH. Software services are generally subject to VAT.
3. **Withholding tax:** ODH may be required to withhold tax on payments to your company (typically 5% for professional services). This is creditable against your corporate tax liability.
4. **Stamp duty:** Service agreements in Egypt may be subject to stamp duty (0.225% of the contract value, capped).

**Recommended action:** Engage an accountant familiar with Egyptian tax law for software companies before issuing your first invoice to ODH.

---

## 5. WhatsApp Business API Compliance

### 5.1 Meta's Terms of Service for Business Messaging

Using the WhatsApp Business Platform (Cloud API) requires compliance with:

1. **WhatsApp Business Policy:** Prohibits certain types of content and messaging patterns. Security-related messaging is generally permissible.
2. **WhatsApp Commerce Policy:** Applies if any commercial transactions are conducted via WhatsApp (not applicable to Security OS).
3. **Meta Business Messaging Terms:** The overarching terms governing business use of WhatsApp.

**Key compliance requirements:**

- **Business verification:** The WhatsApp Business account must be verified with Meta (ODH's existing account may already be verified).
- **Template approval:** Outbound business-initiated messages must use pre-approved templates. The spec identifies four templates: `ticket_received`, `officer_assigned`, `incident_update`, `incident_resolved`. These must be submitted to Meta for approval.
- **Quality rating:** Meta monitors the quality rating of business accounts. High complaint rates or blocks by recipients can lead to reduced messaging limits or account restrictions.
- **Prohibited content:** Do not send marketing, promotional, or advertising content through the security WhatsApp number.

### 5.2 Opt-In Requirements

Meta requires that businesses obtain opt-in from users before sending business-initiated messages. For Security OS:

- **Inbound messages:** When a resident initiates contact, they are within the 24-hour messaging window and no additional opt-in is required for responses.
- **Business-initiated messages (after 24 hours):** Sending status updates outside the 24-hour window using templates requires prior opt-in. The resident's initial message to the security number constitutes an implicit opt-in for communications related to their complaint.
- **Ongoing communications:** If the system sends messages about future incidents or proactive communications (not in MVP scope), explicit opt-in would be required.

**Recommended action:**
- Include in the auto-reply message: "By contacting this number, you agree to receive status updates about your complaint via WhatsApp."
- Implement the STOP keyword to allow residents to opt out of further messages.
- Do not use the WhatsApp Business account for any purpose beyond security complaint management.

### 5.3 Data Handling for Messages Through Meta's Servers

**What data Meta processes:**
- Sender and recipient phone numbers
- Message content (text, photos, location)
- Delivery and read receipts
- Message metadata (timestamps, message IDs)

**Meta's data processing:**
- End-to-end encryption applies to WhatsApp messages, but the Business API operates differently -- messages are decrypted at Meta's servers before being delivered to the webhook endpoint.
- Meta retains message metadata for its own purposes per its privacy policy.
- Media (photos, voice notes) sent via WhatsApp is hosted on Meta's CDN temporarily and must be downloaded within 30 days.

**Compliance implications:**
- Meta is a sub-processor of personal data. This must be disclosed in the privacy notice and DPC registration.
- Media should be downloaded from Meta's CDN and stored locally as soon as possible, reducing the duration of external storage.
- The system should not send sensitive personal data (officer names, detailed incident descriptions) via WhatsApp messages. Use ticket reference numbers and generic status text only.

### 5.4 GDPR Exposure for European Tourists and Residents

El Gouna is a resort community with significant European tourism and expatriate residents. Any EU/EEA citizen whose personal data is processed by Security OS could invoke GDPR rights.

**Exposure scenarios:**

1. **EU tourist sends WhatsApp complaint:** Their phone number and message content are processed. Under GDPR Article 3(2), the regulation applies if you offer services to individuals in the EU or monitor their behavior. Processing a complaint from a tourist in Egypt who is not in the EU at the time is a gray area -- but a conservative reading suggests GDPR may apply because the service is offered to anyone in a resort that actively markets to Europeans.

2. **EU resident (expatriate) data processed:** More clearly within GDPR scope if the resident maintains EU residency/citizenship.

**Risk assessment:** Low for the MVP. El Gouna's security operation has been running without any software system, and adding a digital system does not increase the scope of data collection beyond what was already happening (complaints were received and processed manually). The risk becomes more significant in Tier 3 when surveillance systems are added.

**Recommended mitigations:**
- Ensure the privacy notice and data handling practices are GDPR-compatible (they largely overlap with PDPL requirements).
- Honor GDPR data subject access requests (right of access, erasure, portability) if received from EU citizens. The system's data export capabilities should support this.
- Do not appoint an EU representative (GDPR Article 27) unless the volume of EU data subjects is significant -- assess after pilot.

**[VERIFY WITH LOCAL COUNSEL]:** Whether GDPR applies to data processing of EU citizens physically present in Egypt, and whether any EU-Egypt mutual legal assistance agreements affect this analysis.

---

## 6. Future-Proofing: Tier 2-3 Regulatory Concerns

### 6.1 License Plate Recognition (Tier 2)

**Current Egyptian law:**

There is no comprehensive legislation specifically governing automated license plate recognition (LPR/ANPR) in Egypt. However, several regulations are relevant:

1. **PDPL (Law 151/2020):** Vehicle license plates are personal data when they can be linked to a registered owner (which they always can be, via the traffic authority database). LPR processing therefore falls under the PDPL.

2. **Traffic Law (Law No. 66 of 1973, as amended):** Regulates vehicle registration and plate issuance. Using LPR at a private community gate for access control is a private activity, but querying the traffic authority database for owner information would require authorization.

3. **Ministry of Interior considerations:** LPR systems with integration to government databases may require Ministry of Interior approval.

**Recommended actions for Tier 2:**
- Implement LPR as a closed system (capture plates, match against a local whitelist/blacklist maintained by the community, no external database queries).
- Obtain explicit consent from residents for plate registration in the community access system.
- Conduct a Data Protection Impact Assessment (DPIA) before deploying LPR.
- Register the LPR processing with the DPC as an additional data processing activity.

### 6.2 Facial Recognition (Tier 3)

**PDPL Article 2** explicitly classifies biometric data (including facial recognition data) as sensitive personal data. Processing sensitive data requires:

- Explicit, specific consent from the data subject
- Approval or license from the DPC
- Enhanced security measures
- A Data Protection Impact Assessment

**Egyptian constitutional considerations:**
- Article 54 of the Constitution prohibits measures that restrict personal freedom without judicial authorization except in cases of flagrante delicto.
- Mass facial recognition in a residential community raises significant constitutional privacy concerns.

**Recommended actions for Tier 3:**
- Facial recognition should be limited to voluntary opt-in scenarios (e.g., residents who choose to register for facial recognition-based gate access).
- Mass surveillance-style facial recognition (scanning all faces in public areas and matching against a database) should be avoided unless explicitly authorized by law.
- Conduct a DPIA with DPC consultation before deployment.
- Obtain external legal counsel specializing in biometric data regulation.

**[VERIFY WITH LOCAL COUNSEL]:** Whether any DPC guidance has been issued on facial recognition systems in private communities, and whether Ministry of Interior approval is required.

### 6.3 CCTV Integration (Tier 3)

**Current regulatory landscape:**

CCTV surveillance in Egypt is widespread but lightly regulated at the national level. Key considerations:

1. **PDPL:** CCTV footage containing identifiable individuals is personal data. The same registration, consent, and retention requirements apply.

2. **Signage and notice:** While there is no explicit CCTV-specific regulation, best practice (and likely DPC expectation) is to post clear signage in areas under surveillance, indicating that CCTV is in operation, who is responsible, and the purpose.

3. **Residential privacy:** CCTV in a residential community must avoid capturing private spaces (interiors of residences, private gardens). Camera positioning should be limited to public areas, roads, and common spaces.

4. **Retention:** CCTV footage is storage-intensive. Establish a clear retention policy (30-90 days is common practice) with automatic overwrite. Footage linked to incidents should be retained for the same period as incident records.

5. **Access control:** CCTV footage access should be strictly limited (RBAC) and all access logged in the audit trail.

**Recommended actions for Tier 3:**
- Conduct a DPIA before CCTV integration.
- Implement privacy-by-design: camera placement maps, masking of private areas, automatic retention and deletion.
- Update the DPC registration to include CCTV data processing.
- Post multilingual signage (Arabic and English) at all monitored areas.

### 6.4 GDPR Implications for EU Tourists (Tier 2-3)

The GDPR exposure identified in Section 5.4 becomes significantly more acute with:

- **LPR:** EU tourists' rental car plates are captured and processed.
- **Facial recognition:** EU tourists' biometric data is captured.
- **CCTV:** EU tourists are continuously recorded in community public areas.

Under GDPR, processing biometric data (Article 9) requires explicit consent or a specific legal exemption. Mass facial recognition of tourists without consent is almost certainly non-compliant with GDPR if EU tourists are the data subjects.

**Recommended actions:**
- Before deploying Tier 2-3 features, commission a formal GDPR compliance assessment.
- Consider whether an EU representative appointment (GDPR Article 27) is necessary.
- Implement GDPR-compliant notice and consent mechanisms for EU residents and tourists.
- Evaluate GDPR "legitimate interest" and "public interest" exemptions for CCTV (which are more established in European case law).

---

## 7. Recommended Legal Actions Before Signing Pilot

### 7.1 Priority-Ordered Checklist

The following actions are ordered by priority (must-do before pilot launch, should-do before or shortly after, and plan-for-future):

#### CRITICAL -- Must Complete Before Signing Pilot Agreement

| # | Action | Estimated Cost | Timeline | Notes |
|---|---|---|---|---|
| 1 | **Engage Egyptian tech/commercial lawyer** for 2-3 hour consultation covering all items in this document | EGP 5,000-15,000 | Week 1 | Non-negotiable. This document identifies the questions; local counsel provides the answers. |
| 2 | **Register Egyptian LLC** (or single-person company if available) | EGP 15,000-25,000 | Weeks 1-4 | Cannot invoice ODH or sign a binding agreement without a legal entity. Start this immediately. |
| 3 | **Draft and execute the pilot agreement** with ODH, incorporating all clauses from Section 4 and Appendix A | EGP 3,000-8,000 (lawyer review) | Weeks 3-5 | Do not begin deployment with real data without a signed agreement. |
| 4 | **Prepare Officer Privacy Notice** (Arabic) covering all data collection, GPS tracking, performance monitoring, and data subject rights | Internal effort | Weeks 4-5 | Must be distributed and acknowledged by officers before pilot launch. |
| 5 | **Prepare Resident Privacy Notice** (Arabic/English) for WhatsApp auto-reply integration | Internal effort | Weeks 4-5 | Short version in auto-reply; full version available on request. |

#### HIGH PRIORITY -- Must Complete Before or Within 30 Days of Pilot Launch

| # | Action | Estimated Cost | Timeline | Notes |
|---|---|---|---|---|
| 6 | **Register with the Data Protection Center** (DPC) as data processor; assist ODH in registering as data controller | TBD (DPC fee schedule) | Weeks 5-8 | File before live data processing begins. If DPC registration is delayed, document the filing attempt. |
| 7 | **Execute Data Processing Agreement (DPA)** between your company and ODH | Included in pilot agreement | Week 5 | Can be an annex to the pilot agreement. |
| 8 | **Implement data retention schedule** with automated purge/anonymization jobs | Internal effort | Weeks 6-8 | Configure retention periods per Section 1.5. |
| 9 | **Document breach notification procedure** | Internal effort | Week 6 | 72-hour notification to DPC, data subject notification protocol. |
| 10 | **Verify ODH's labor law compliance** for 12-hour shifts | Via legal counsel | Week 3 | Your software should not be complicit in a labor law violation. If the shift structure is non-compliant, flag it to ODH. |

#### MEDIUM PRIORITY -- Complete Within 90 Days of Pilot Launch

| # | Action | Estimated Cost | Timeline | Notes |
|---|---|---|---|---|
| 11 | **Obtain professional indemnity (errors and omissions) insurance** | EGP 10,000-30,000/year | Month 2-3 | Covers claims arising from software defects or failures. |
| 12 | **Obtain cyber liability insurance** | EGP 15,000-40,000/year | Month 2-3 | Covers data breach costs, regulatory fines, notification expenses. |
| 13 | **Register WhatsApp message templates** with Meta | Free (Meta process) | Month 1-2 | Required for business-initiated messages outside the 24-hour window. |
| 14 | **Implement audit log integrity verification** (hash chaining) | Internal effort | Month 2-3 | Ensures audit logs are tamper-evident for evidentiary purposes. |
| 15 | **Conduct internal compliance audit** | Internal effort | Month 3 | Verify all measures from this document are implemented. |

#### FUTURE -- Plan for Tier 2-3

| # | Action | Estimated Cost | Timeline | Notes |
|---|---|---|---|---|
| 16 | **Data Protection Impact Assessment (DPIA)** for LPR | EGP 10,000-25,000 | Before Tier 2 | Required before deploying LPR. |
| 17 | **DPIA for facial recognition** | EGP 15,000-30,000 | Before Tier 3 | Mandatory for biometric data processing. |
| 18 | **DPIA for CCTV integration** | EGP 10,000-25,000 | Before Tier 3 | Required before integrating CCTV feeds. |
| 19 | **GDPR compliance assessment** | EUR 3,000-8,000 | Before Tier 2 | Engage EU-qualified data protection counsel. |
| 20 | **DPC registration update** for additional processing activities | TBD | Before each tier | Update registration with each new data processing category. |

### 7.2 Insurance Considerations

#### 7.2.1 Professional Indemnity Insurance (Errors & Omissions)

Covers claims arising from:
- Software defects that cause operational failures
- Incorrect AI recommendations that lead to inappropriate responses
- System downtime during critical incidents
- Failure to meet contractual SLAs

**Recommended coverage:** Minimum EGP 5,000,000 per claim, EGP 10,000,000 aggregate annual.

**[VERIFY WITH LOCAL COUNSEL]:** Whether professional indemnity insurance is available in Egypt for software companies, and which Egyptian or international insurers offer relevant policies.

#### 7.2.2 Cyber Liability Insurance

Covers:
- Data breach investigation and response costs
- Regulatory fines and penalties (where insurable under Egyptian law)
- Data subject notification costs
- Legal defense costs
- Business interruption losses from cyber incidents

**Recommended coverage:** Minimum EGP 5,000,000.

#### 7.2.3 General Commercial Liability

Standard business liability insurance covering:
- Third-party bodily injury or property damage claims (unlikely for a software company, but prudent)
- Legal defense costs

---

## Appendix A: Template Contract Clauses

The following are template clauses for inclusion in the pilot agreement. These are starting points and must be reviewed and adapted by your legal counsel.

### A.1 Limitation of Liability

```
LIMITATION OF LIABILITY

(a) To the maximum extent permitted by applicable law, the total aggregate
liability of the Service Provider under or in connection with this Agreement,
whether in contract, tort (including negligence), breach of statutory duty,
or otherwise, shall not exceed the total fees paid by the Client under this
Agreement in the twelve (12) month period immediately preceding the event
giving rise to the claim.

(b) The Service Provider shall not be liable for any indirect, incidental,
special, consequential, or punitive damages, including but not limited to
loss of profits, loss of revenue, loss of data (except as provided under
the data protection provisions), loss of business opportunity, or damage to
reputation, arising out of or in connection with this Agreement, even if the
Service Provider has been advised of the possibility of such damages.

(c) The Software is provided as a management and operational coordination
tool. It is not a substitute for trained security personnel, professional
judgment, or established security procedures. The Client acknowledges and
agrees that:
    (i) The Client retains full responsibility for the security of the
        El Gouna community and the safety of its residents, visitors,
        and personnel;
    (ii) The Software supplements but does not replace the Client's
         existing security operations, procedures, and chain of command;
    (iii) The Client shall maintain the ability to conduct security
          operations without the Software at all times (manual fallback
          procedures);
    (iv) The Service Provider shall not be liable for any loss, damage,
         injury, or death arising from security incidents, regardless of
         whether the Software was operational at the time of such incident.

(d) Nothing in this clause shall limit or exclude liability for:
    (i) fraud or fraudulent misrepresentation;
    (ii) death or personal injury caused by the gross negligence of
         the Service Provider;
    (iii) any liability which cannot be limited or excluded by
          applicable law.
```

### A.2 Intellectual Property

```
INTELLECTUAL PROPERTY

(a) Software Ownership: The Service Provider retains all right, title, and
interest in and to the Software, including all source code, object code,
documentation, algorithms, AI models, prompt templates, and user interface
designs. The Client receives a non-exclusive, non-transferable license to
use the Software during the term of this Agreement, subject to the terms
herein.

(b) Client Data Ownership: All data generated, collected, or processed
by the Software in the course of the Client's operations ("Client Data")
is and shall remain the property of the Client. Client Data includes but
is not limited to: officer personal data, incident records, patrol logs,
performance metrics, resident complaint data, and AI-generated reports
based on Client Data.

(c) Configuration Data: Configuration settings, zone definitions, SLA
rules, patrol routes, and report templates created by the Client using
the Software ("Configuration Data") are the property of the Client. The
Service Provider may use the structure and format of Configuration Data
(but not its content) to improve the Software for other clients.

(d) Aggregate Insights: The Service Provider may collect and use
anonymized, aggregated, non-identifiable data derived from the Client's
use of the Software for the purposes of product improvement, benchmarking,
and research, provided that such data cannot reasonably be used to identify
the Client, any individual, or any specific incident.

(e) Data Return: Upon termination of this Agreement, the Service Provider
shall, at the Client's election: (i) provide a complete export of all
Client Data in a machine-readable format (JSON or CSV), or (ii) certify
the destruction of all Client Data in the Service Provider's possession
within thirty (30) days. The Client's obligation to pay any outstanding
fees is not contingent on the exercise of this right.
```

### A.3 Data Processing Agreement (Summary Provisions)

```
DATA PROCESSING

(a) Roles: The Client is the data controller. The Service Provider is the
data processor. The Service Provider shall process personal data only on
the documented instructions of the Client and for the purposes specified
in this Agreement.

(b) Sub-processors: The Service Provider uses the following sub-processors:
    - Meta Platforms, Inc. (WhatsApp Business API) -- for resident
      complaint messaging
    - Cloudflare, Inc. (Cloudflare Tunnel) -- for secure webhook
      routing
The Service Provider shall notify the Client before engaging any additional
sub-processors and shall ensure that each sub-processor is bound by data
protection obligations no less protective than those in this Agreement.

(c) Security Measures: The Service Provider implements and maintains the
following security measures:
    - Encryption in transit (TLS)
    - Encryption at rest (LUKS volume encryption)
    - Role-based access control with seven defined roles
    - Audit logging of all data access and modifications
    - Device binding and remote token revocation
    - PIN lockout after failed authentication attempts
    - Database backups with encryption

(d) Breach Notification: The Service Provider shall notify the Client
of any personal data breach within twenty-four (24) hours of becoming
aware of such breach. The Client is responsible for notifying the Data
Protection Center within the statutory seventy-two (72) hour period
and for notifying affected data subjects as required by law.

(e) Data Subject Rights: The Service Provider shall assist the Client
in fulfilling data subject access, rectification, erasure, and
portability requests through the Software's data export and deletion
capabilities.

(f) Data Protection Impact Assessment: The Service Provider shall
cooperate with the Client in conducting any DPIA required by the
Data Protection Center.

(g) Audit Rights: The Client may audit the Service Provider's
compliance with this Agreement once per calendar year upon thirty (30)
days' written notice.
```

### A.4 Source Code Escrow

```
SOURCE CODE ESCROW

(a) Within sixty (60) days of the Effective Date, the Service Provider
shall deposit a complete copy of the Software source code, build
instructions, and deployment documentation ("Escrow Materials") with
[escrow agent / sealed deposit held by Client's IT department].

(b) The Escrow Materials shall be updated with each major release of
the Software.

(c) The Client shall be entitled to access and use the Escrow Materials
solely in the event that:
    (i) The Service Provider ceases business operations;
    (ii) The Service Provider fails to provide support and maintenance
         for a continuous period exceeding ninety (90) days despite
         written notice from the Client;
    (iii) The Service Provider enters bankruptcy, liquidation, or
          similar proceedings.

(d) Access to the Escrow Materials grants the Client a non-exclusive,
perpetual license to use, modify, and maintain the Software solely
for its own internal operations, and does not grant any right to
sublicense, distribute, or commercialize the Software.
```

### A.5 Pilot-Specific Provisions

```
PILOT TERMS

(a) Pilot Duration: Six (6) months from the date of system deployment
("Pilot Period"), subject to the phased expansion schedule in Exhibit A.

(b) Pilot Pricing: Fifty percent (50%) discount on the standard monthly
fee during the Pilot Period. Setup fee waived.

(c) Termination: Either party may terminate this Agreement during the
Pilot Period with thirty (30) days' written notice. Upon termination:
    (i) The Service Provider shall provide a full data export per
        Section [Data Return];
    (ii) The Service Provider shall remove all Software from the
         Client's server within fourteen (14) days;
    (iii) No termination penalties apply during the Pilot Period.

(d) Post-Pilot Continuation: If neither party terminates within
thirty (30) days of the Pilot Period expiry, the Agreement
automatically converts to a twelve (12) month term at full pricing,
renewable annually.

(e) Case Study Rights: The Client grants the Service Provider the
right to reference the Client's name, logo, and aggregate (non-
confidential) performance metrics in marketing materials, case
studies, and sales presentations, subject to the Client's prior
written approval of the specific content.

(f) Success Criteria: The parties agree to the success criteria
defined in Exhibit B. Achievement of success criteria at the Month 3
review triggers the expansion phase. Non-achievement does not
automatically terminate the Agreement but may be grounds for
renegotiation or termination under Section (c).
```

---

## Summary of Key Risk Areas

| Risk Area | Severity | Primary Concern | Mitigation |
|---|---|---|---|
| DPC registration omission | HIGH | Fines up to EGP 500,000 | Register before pilot launch |
| Cross-border data transfer (WhatsApp) | HIGH | Fines up to EGP 2,000,000 | Document transfer, minimize data, obtain DPC approval if required |
| Officer GPS tracking without proper legal basis | MEDIUM | Privacy claims, labor disputes | Establish contractual necessity basis, distribute privacy notice |
| 12-hour shift non-compliance | MEDIUM | Labor law penalties (applies to ODH, not your company, but reputational risk) | Verify exemption with counsel; flag to ODH if non-compliant |
| System failure during security incident | HIGH | Liability claims, reputational damage | Strong contractual limitations, manual fallback procedures, insurance |
| No formal contract before deployment | CRITICAL | Unlimited exposure, IP disputes | Do not deploy without signed agreement |
| Biometric data classification (PINs) | MEDIUM | Fines up to EGP 3,000,000 if classified as sensitive and processed without explicit consent | Obtain explicit consent as precaution, verify classification with counsel |
| GDPR exposure (EU tourists) | LOW (MVP) | EU regulatory scrutiny, fines | GDPR-compatible practices, monitor exposure, assess before Tier 2 |

---

## Document Control

| Version | Date | Author | Status |
|---|---|---|---|
| 1.0 | 2026-03-20 | Legal Compliance Assessment | Draft -- Requires Local Counsel Review |

**Next step:** Schedule a 2-3 hour consultation with an Egyptian technology/commercial lawyer to validate the analysis in this document and resolve all items marked **[VERIFY WITH LOCAL COUNSEL]**. This consultation should occur before any pilot agreement is signed or any real data is processed.
