# Waypoint — Product Requirements Document v2.0

**Document Version:** 2.0  
**Date:** March 5, 2026  
**Author:** Mike (Director of Asset Management, King Energy)  
**Status:** Draft  
**Classification:** Confidential  

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | — | Mike | Initial feature requirements |
| 2.0 | 2026-03-05 | Mike / Claude | Full PRD with vision, user stories, phases, tech stack |

---

## Table of Contents

1. Product Vision & Mission
2. Problem Statement
3. Target Users & Personas
4. Competitive Landscape & Differentiators
5. Core Feature Areas
6. User Stories & Acceptance Criteria by Phase
7. Development Phases & Roadmap
8. Tech Stack & Architecture
9. Mockup & Screen Inventory
10. Claude Code Build Plan
11. Security, Compliance & Privacy
12. Success Metrics
13. Risks & Mitigations
14. Open Questions

---

## 1. Product Vision & Mission

### Vision
Every California family raising a child with a developmental or learning difference has a clear, personalized path through the services ecosystem — from diagnosis through adulthood.

### Mission
Waypoint is an AI-native platform that replaces the fragmented, overwhelming experience of navigating Regional Centers, IEPs, Medi-Cal, SSI, IHSS, and therapy services with a unified, guided journey tailored to each family's diagnosis, location, income level, and language.

### Product Thesis
Parents of children with disabilities spend **hundreds of hours** navigating disconnected systems — often missing critical deadlines, eligible services, or legal rights they don't know they have. Waypoint turns institutional knowledge into personalized action plans, making the complex simple and the invisible visible.

---

## 2. Problem Statement

### Primary Problems

- **Fragmentation:** Families interact with 5–15+ agencies/providers (Regional Centers, school districts, therapists, insurers, SSA, IHSS) with no single system of record.
- **Knowledge Gap:** Critical services, rights, and deadlines are buried in jargon-heavy documents that most families never fully understand.
- **Isolation:** Parents lack peer networks of families navigating similar diagnoses and service combinations.
- **Administrative Burden:** Managing IEPs, authorizations, appointments, and correspondence is a part-time job with no tools purpose-built for it.
- **Inequity:** Families with fewer resources, limited English, or less institutional knowledge receive systematically worse outcomes.

### Why Now

- California's Regional Center system serves 400,000+ individuals — growing 5–7% annually
- AI capabilities (document understanding, personalization, conversational guidance) have reached the quality threshold needed for this use case
- No purpose-built platform exists for this population (competitors are generic care coordination or disability resource directories)
- Post-pandemic, families expect digital-first service navigation

---

## 3. Target Users & Personas

### Persona 1: "First Diagnosis Maria"
- **Demographics:** Spanish-speaking mother, household income $55K, East Bay, child age 3
- **Diagnosis:** Autism Spectrum Disorder — just received diagnosis
- **Situation:** Overwhelmed, doesn't know where to start. Referred to RCEB but unclear on intake process, timelines, or what services are available.
- **Key Needs:** Step-by-step intake guidance in Spanish, service eligibility checker, appointment reminders, peer connection with other Spanish-speaking families
- **Tech Comfort:** Moderate — uses smartphone daily, WhatsApp, basic apps

### Persona 2: "Advocacy Veteran Sarah"
- **Demographics:** English-speaking mother, household income $120K, suburban Bay Area, child age 10
- **Diagnosis:** ADHD + Specific Learning Disability (dyslexia)
- **Situation:** Deep in the IEP process, has had multiple IEP meetings, knows the system but drowning in paperwork. Wants AI help reviewing IEP documents and drafting correspondence.
- **Key Needs:** IEP document review, email templates, legal rights reference, document storage with version tracking
- **Tech Comfort:** High — uses multiple apps, comfortable with AI tools

### Persona 3: "Transition Planning David"
- **Demographics:** Father, household income $80K, Central Valley (remote), child age 16
- **Diagnosis:** Intellectual Disability
- **Situation:** Approaching transition age (18–22). Needs to navigate conservatorship, SSI, IHSS, adult day programs, and Regional Center transition from children's to adult services.
- **Key Needs:** Transition planning action plan, legal resource directory, SSI/IHSS application guidance, calendar management for multiple agencies
- **Tech Comfort:** Low-moderate — needs simple, clear interface

### Persona 4: "Multi-System Navigating Priya"
- **Demographics:** Mother, household income $35K (Medi-Cal eligible), South Bay, child age 7
- **Diagnosis:** Autism + Speech Language Impairment (co-occurring)
- **Situation:** Navigating RCEB, school district IEP, Medi-Cal behavioral health, and private therapy simultaneously. Frequently falls through cracks between systems.
- **Key Needs:** Unified calendar across all providers, authorization tracking, resource discovery filtered by Medi-Cal acceptance, multilingual support (Hindi/English)
- **Tech Comfort:** Moderate — smartphone-first user

---

## 4. Competitive Landscape & Differentiators

### Existing Solutions & Gaps

| Competitor / Category | What It Does | What It Misses |
|---|---|---|
| **Undivided** | Parent advocacy coaching, IEP support | No tech platform, high cost ($200+/mo), no self-service |
| **Joshin** | Care provider marketplace | No navigation, no IEP support, no Regional Center integration |
| **IEP&Me / SpedTrack** | IEP tracking tools | Narrow scope — no broader service navigation, no AI |
| **211.org / Aunt Bertha (findhelp.org)** | Resource directories | Generic, not disability-specific, no personalization, no action plans |
| **MyChart / Health Gorilla** | Healthcare portal | Medical only — no education, Regional Center, or legal integration |
| **Facebook Groups** | Peer community | Unstructured, no tools, privacy concerns, no moderation |

### Waypoint's Competitive Moat

1. **AI-Powered Journey Maps:** Personalized, step-by-step action plans by diagnosis × age × location × income — not static content
2. **Regional Center Integration:** First platform with structured service directories, intake guidance, and provider listings mapped to all 21 California Regional Centers
3. **IEP Intelligence:** AI-assisted IEP review, deadline tracking, and templated correspondence
4. **Healthcare System Bridge:** MyChart/Epic FHIR integration to pull medical appointments into unified calendar
5. **Equity-First Design:** Multilingual (Spanish, Mandarin, Vietnamese, Hindi), income-aware resource filtering, accessibility-first UI
6. **Community + Tools:** Peer forums paired with structured tools (not one or the other)

---

## 5. Core Feature Areas

| # | Feature Area | Priority | Phase |
|---|---|---|---|
| F1 | Onboarding & Family Profile | Critical | 1 |
| F2 | Personalized Action Plans (Journey Maps) | Critical | 1 |
| F3 | Resource Discovery & Library | Critical | 1 |
| F4 | Regional Center Integration | Critical | 1 |
| F5 | Appointment Management & Calendar | High | 1–2 |
| F6 | Document Management | High | 2 |
| F7 | IEP Review & Support | High | 2 |
| F8 | Email Integration & Templates | High | 2 |
| F9 | Notifications & Reminders | High | 1–2 |
| F10 | Peer Community | Medium | 3 |
| F11 | Healthcare Integration (MyChart/FHIR) | Medium | 3 |
| F12 | Insurance & Authorization Tracking | Medium | 3 |
| F13 | Legal Support Resources | Medium | 3 |
| F14 | Analytics & Family Dashboard | Medium | 4 |
| F15 | Provider/Advocate Portal | Low | 4 |

---

## 6. User Stories & Acceptance Criteria by Phase

---

### PHASE 1: Foundation MVP (Weeks 1–10)
**Goal:** Core navigation experience — onboarding, action plans, resource library, Regional Center basics

---

#### F1: Onboarding & Family Profile

**US-1.1: Family Profile Creation**
> As a parent, I want to create a family profile with my child's diagnosis, age, location (zip code), and primary language so that Waypoint can personalize my experience.

**Acceptance Criteria:**
- [ ] User can sign up via email, Google, or Apple SSO
- [ ] Onboarding wizard collects: child name (optional), diagnosis (multi-select from structured list), date of birth, zip code, primary language, income bracket (optional)
- [ ] Diagnosis list includes: Autism, ADHD, Intellectual Disability, Speech Language Impairment, Specific Learning Disability, PDA, Cerebral Palsy, Down Syndrome, Other (free text)
- [ ] Zip code auto-resolves to Regional Center catchment area
- [ ] Profile can be edited at any time from Settings
- [ ] Multiple children can be added to one family profile
- [ ] All data encrypted at rest (AES-256)

**US-1.2: Regional Center Lookup**
> As a parent, I want to see which Regional Center serves my area based on my zip code so I know where to start.

**Acceptance Criteria:**
- [ ] Zip code entry returns correct Regional Center name, address, phone, website
- [ ] Covers all 21 California Regional Centers
- [ ] Displays service coordinator contact info if available
- [ ] Shows intake process summary for that Regional Center
- [ ] Works for California zip codes; out-of-state shows "coming soon" message

---

#### F2: Personalized Action Plans (Journey Maps)

**US-2.1: Generate Initial Action Plan**
> As a parent who just received a diagnosis, I want a step-by-step action plan tailored to my child's diagnosis and age so I know exactly what to do next.

**Acceptance Criteria:**
- [ ] Upon completing onboarding, system generates personalized action plan
- [ ] Action plan is structured as ordered steps with: title, description, estimated time, links to resources, and status (not started / in progress / complete)
- [ ] Plans vary by diagnosis (at minimum: Autism, ADHD, SLD, SLI, Intellectual Disability, PDA — the 6 journey maps from Waypoint Entity Navigation Matrix)
- [ ] Plans account for child age brackets: 0–3 (Early Start), 3–5 (preschool transition), 5–14 (school age), 14–18 (transition planning), 18–22 (adult transition)
- [ ] Each step links to relevant resources, templates, or contacts
- [ ] User can mark steps complete, skip, or add notes

**US-2.2: Action Plan Reminders**
> As a parent, I want to receive reminders for upcoming action plan steps so I don't miss critical deadlines.

**Acceptance Criteria:**
- [ ] System sends push notification 7 days and 1 day before deadline-sensitive steps
- [ ] User can customize reminder timing (1 day, 3 days, 7 days, custom)
- [ ] Reminders link directly to the relevant action plan step
- [ ] User can snooze or dismiss reminders

**US-2.3: Action Plan Progress Tracking**
> As a parent, I want to see my overall progress through my action plan so I feel a sense of accomplishment and know what's left.

**Acceptance Criteria:**
- [ ] Dashboard shows progress bar (% complete) per action plan
- [ ] Completed steps are visually distinguished (strikethrough or checkmark)
- [ ] "Up Next" section highlights the next 3 recommended steps
- [ ] If multiple children, each child has their own action plan with separate tracking

---

#### F3: Resource Discovery & Library

**US-3.1: Browse Resources by Category**
> As a parent, I want to browse a curated library of resources filtered by diagnosis, age, location, and service type so I can find help relevant to my situation.

**Acceptance Criteria:**
- [ ] Resource library contains minimum 200 curated entries at launch (California-focused)
- [ ] Each resource has: name, description, category, service type, diagnoses served, age range, geographic coverage, contact info, website, cost (free/sliding scale/paid), languages offered
- [ ] Filters: diagnosis, age range, service type (therapy, education, legal, financial, social), geography (zip code radius), cost, language
- [ ] Search bar with keyword matching against name, description, and tags
- [ ] Results sortable by relevance, distance, rating

**US-3.2: Bookmark & Share Resources**
> As a parent, I want to bookmark resources and share them with my partner or advocate.

**Acceptance Criteria:**
- [ ] User can bookmark any resource (saved to "My Resources" section)
- [ ] Share via link, email, or in-app message
- [ ] Bookmarked resources are accessible offline (cached)

**US-3.3: Parent-Contributed Resources**
> As a parent, I want to recommend resources I've found helpful so other families can benefit.

**Acceptance Criteria:**
- [ ] "Suggest a Resource" form with: name, website, description, category, diagnosis relevance
- [ ] Submitted resources go to moderation queue before publishing
- [ ] Contributing parent gets attribution (optional, can be anonymous)
- [ ] Community upvote/downvote on resources after publication

---

#### F4: Regional Center Integration

**US-4.1: Regional Center Service Directory**
> As a parent, I want to see what services my Regional Center offers so I can understand what I'm eligible for.

**Acceptance Criteria:**
- [ ] Directory of services per Regional Center (at minimum RCEB at launch)
- [ ] Services categorized: Early Intervention, Behavioral Services, Respite, Supported Living, Transportation, Day Programs, Therapy, Assistive Technology
- [ ] Each service entry includes: description, eligibility criteria, how to request, typical timeline, vendor list (if available)
- [ ] Data sourced from public Regional Center documentation; refresh quarterly

**US-4.2: Intake Process Guidance**
> As a new parent, I want step-by-step guidance on the Regional Center intake process so I can prepare for my first appointment.

**Acceptance Criteria:**
- [ ] Intake guide includes: what to bring, what to expect, typical timeline (45-day assessment window), rights during the process
- [ ] Checklist format with printable/downloadable version
- [ ] Specific to user's Regional Center where data is available
- [ ] Links to relevant forms (if publicly available)

**US-4.3: Eligibility Guidance**
> As a parent, I want to understand whether my child may be eligible for Regional Center services based on their diagnosis.

**Acceptance Criteria:**
- [ ] Eligibility screener asks key questions (diagnosis, functional limitations, age of onset)
- [ ] Returns: "Likely Eligible," "May Be Eligible — Further Assessment Needed," or "May Not Meet Criteria"
- [ ] Clear disclaimer: "This is informational only, not a formal eligibility determination"
- [ ] Links to formal intake request process regardless of screening result
- [ ] Explains the 5 qualifying conditions under Lanterman Act

---

#### F9 (Phase 1 subset): Basic Notifications

**US-9.1: Push Notifications**
> As a parent, I want to receive push notifications for action plan reminders and important deadlines.

**Acceptance Criteria:**
- [ ] Push notifications work on iOS and Android
- [ ] Notification types at launch: action plan reminders, new resources matching profile
- [ ] User can toggle notification types on/off in Settings
- [ ] Notifications respect device Do Not Disturb settings

---

### PHASE 2: Document Intelligence & Communication Tools (Weeks 11–20)
**Goal:** IEP support, document management, email integration, calendar

---

#### F5: Appointment Management & Calendar

**US-5.1: Create & Manage Appointments**
> As a parent, I want to create, edit, and delete appointments within the app so I have a single view of my family's care schedule.

**Acceptance Criteria:**
- [ ] Create appointment with: title, date/time, location, provider, notes, child (if multi-child), category (medical, therapy, school, Regional Center, legal, other)
- [ ] Edit and delete existing appointments
- [ ] Recurring appointment support (weekly, biweekly, monthly)
- [ ] Calendar views: day, week, month, agenda list

**US-5.2: Google Calendar Sync**
> As a parent, I want to sync Waypoint appointments with my Google Calendar so everything is in one place.

**Acceptance Criteria:**
- [ ] OAuth-based Google Calendar connection
- [ ] Two-way sync: Waypoint appointments appear in Google Calendar and vice versa
- [ ] User selects which Google Calendar(s) to sync
- [ ] Sync frequency: real-time or within 5 minutes
- [ ] Conflict detection: warn if new appointment overlaps existing

**US-5.3: Shared Family Calendar**
> As a parent, I want to share the care calendar with my partner/co-parent so we're both informed.

**Acceptance Criteria:**
- [ ] Invite co-parent by email to view/edit shared calendar
- [ ] Co-parent sees same calendar data without needing to re-enter information
- [ ] Permission levels: view only, edit, admin
- [ ] Changes by either parent are reflected in real-time

---

#### F6: Document Management

**US-6.1: Upload & Store Documents**
> As a parent, I want to upload and organize my child's important documents (IEPs, assessments, medical reports) in one secure place.

**Acceptance Criteria:**
- [ ] Upload via camera scan, file picker, or drag-and-drop (web)
- [ ] Supported formats: PDF, DOCX, JPG, PNG, HEIC
- [ ] Auto-categorization suggestions based on filename/content (IEP, Assessment, Medical, Insurance, Legal, Other)
- [ ] Folder structure: by child → by category → by date
- [ ] Max file size: 25MB per document
- [ ] Storage: 1GB per free user, 10GB per premium user

**US-6.2: Document Annotation**
> As a parent, I want to highlight and annotate sections of my child's documents so I can prepare for meetings.

**Acceptance Criteria:**
- [ ] Highlight text in PDF/DOCX viewer
- [ ] Add sticky-note-style comments to specific sections
- [ ] Annotations are saved and persist across sessions
- [ ] Export annotated version as PDF

**US-6.3: Share Documents with Providers**
> As a parent, I want to securely share documents with my child's advocate, therapist, or attorney.

**Acceptance Criteria:**
- [ ] Generate secure share link with optional expiration (24h, 7d, 30d, no expiration)
- [ ] Optional password protection on shared links
- [ ] Track who accessed shared documents (view log)
- [ ] Revoke access at any time

**US-6.4: Version Tracking**
> As a parent, I want to see previous versions of uploaded documents so I can track changes over time (e.g., annual IEP updates).

**Acceptance Criteria:**
- [ ] Upload new version of existing document (maintains version history)
- [ ] View and download any previous version
- [ ] Side-by-side comparison view (stretch goal)
- [ ] Version label: auto-dated, user can add custom label

---

#### F7: IEP Review & Support

**US-7.1: AI-Assisted IEP Review**
> As a parent, I want AI to review my child's IEP document and flag areas of concern, missing elements, or suggestions.

**Acceptance Criteria:**
- [ ] Upload IEP (PDF or DOCX) triggers AI analysis
- [ ] AI identifies and flags: missing required sections (per IDEA), vague goals (not measurable), missing baselines, services below typical ranges for diagnosis, placement concerns
- [ ] Each flag includes: section reference, concern description, suggested improvement, relevant legal citation
- [ ] Results displayed as annotated overlay on document
- [ ] Disclaimer: "AI suggestions are informational. Consult an advocate or attorney for legal advice."

**US-7.2: IEP Timeline Reminders**
> As a parent, I want reminders for IEP-related deadlines (annual review, triennial evaluation, consent timelines).

**Acceptance Criteria:**
- [ ] User enters last IEP date; system calculates annual review due date
- [ ] Triennial evaluation reminder (every 3 years from initial)
- [ ] Consent timeline tracking: 15-day assessment plan, 60-day assessment completion
- [ ] Push and email reminders at 30 days, 14 days, 7 days, 1 day before deadline

**US-7.3: IEP Goal Tracking**
> As a parent, I want to track my child's IEP goals and their progress so I can prepare for meetings with data.

**Acceptance Criteria:**
- [ ] Extract goals from uploaded IEP (AI-assisted) or manual entry
- [ ] Each goal has: description, baseline, target, measurement method, progress notes
- [ ] Parent can log progress observations (date + note)
- [ ] Progress visualization (simple chart showing trajectory toward target)
- [ ] Export progress report as PDF for IEP meetings

---

#### F8: Email Integration & Templates

**US-8.1: Email Templates**
> As a parent, I want pre-written email templates for common communications so I don't have to start from scratch.

**Acceptance Criteria:**
- [ ] Template library includes at minimum:
  - IEP meeting request
  - Independent Educational Evaluation (IEE) request
  - Prior Written Notice request
  - Teacher communication (progress check-in)
  - Therapy coordination (schedule change)
  - Regional Center service request
  - Complaint/due process filing notification
  - Records request (educational, medical)
- [ ] Templates are customizable (user fills in blanks)
- [ ] AI can personalize template based on family profile and child's details
- [ ] Templates cite relevant legal authority where applicable (IDEA, Section 504, CA Ed Code)

**US-8.2: Gmail Integration**
> As a parent, I want to draft and send emails from within the app using my Gmail account.

**Acceptance Criteria:**
- [ ] OAuth-based Gmail connection
- [ ] Compose email within app using templates or free-form
- [ ] Save drafts to Gmail drafts folder
- [ ] Send email via Gmail (appears in user's Sent folder)
- [ ] Attach Waypoint documents to emails

**US-8.3: Communication Log**
> As a parent, I want to maintain a log of important communications with schools, providers, and agencies for my records.

**Acceptance Criteria:**
- [ ] Auto-log emails sent through Waypoint (date, recipient, subject, body)
- [ ] Manual entry for phone calls and in-person meetings (date, contact, notes)
- [ ] Filterable by: contact, date range, category (school, medical, Regional Center, legal)
- [ ] Exportable as PDF or CSV

---

### PHASE 3: Community & Healthcare Integration (Weeks 21–32)
**Goal:** Peer community, MyChart integration, insurance tracking, legal resources

---

#### F10: Peer Community

**US-10.1: Topic-Based Discussion Forums**
> As a parent, I want to participate in discussion forums organized by topic so I can connect with parents in similar situations.

**Acceptance Criteria:**
- [ ] Forum categories: by diagnosis, by Regional Center area, by age group, General, Parenting Tips, Legal/Advocacy, School Issues, Therapy, Transition Planning
- [ ] Users can create new threads, reply, and react (like, helpful, hug)
- [ ] Rich text editor with image upload support
- [ ] Threads sortable by: newest, most active, most helpful
- [ ] User profiles show: parent since [year], child's diagnosis (optional), Regional Center (optional)

**US-10.2: Direct Messaging**
> As a parent, I want to privately message other parents I connect with in forums.

**Acceptance Criteria:**
- [ ] Send direct message to any community member (unless blocked)
- [ ] Real-time messaging with read receipts
- [ ] Block and report functionality
- [ ] Message history persisted

**US-10.3: Anonymous Posting**
> As a parent, I want the option to post anonymously in forums when discussing sensitive topics.

**Acceptance Criteria:**
- [ ] Toggle "Post Anonymously" when creating a thread or reply
- [ ] Anonymous posts show generic avatar and "Anonymous Parent" label
- [ ] Identity still known to moderators for safety/moderation purposes
- [ ] Anonymous posts cannot receive direct messages

**US-10.4: Local Parent Groups**
> As a parent, I want to find and join groups of parents near me for potential meetups and local support.

**Acceptance Criteria:**
- [ ] Auto-suggest groups based on zip code and Regional Center area
- [ ] Group features: shared feed, events calendar, member directory
- [ ] Group admins can manage membership and moderate content
- [ ] Privacy: groups can be public or private (request to join)

**US-10.5: Moderation & Safety**
> As a platform operator, I want robust content moderation to keep the community safe.

**Acceptance Criteria:**
- [ ] AI-powered content moderation flags harmful content for review
- [ ] User reporting mechanism (flag post → reason → moderator review)
- [ ] Community guidelines displayed at signup and accessible in-app
- [ ] Moderator dashboard for reviewing flagged content
- [ ] Auto-ban after 3 confirmed violations
- [ ] COPPA compliance: no accounts for users under 13

---

#### F11: Healthcare Integration (MyChart / Epic FHIR)

**US-11.1: Import Medical Appointments**
> As a parent, I want to import my child's upcoming medical appointments from MyChart so they appear in my Waypoint calendar.

**Acceptance Criteria:**
- [ ] OAuth-based MyChart (Epic) connection via FHIR R4 APIs
- [ ] Import: appointment date/time, provider name, location, appointment type
- [ ] Imported appointments tagged as "Medical" in Waypoint calendar
- [ ] One-way sync (MyChart → Waypoint) at launch; refresh on user request + daily auto-sync
- [ ] HIPAA-compliant data handling (BAA with Epic, encrypted transit/rest)

**US-11.2: Provider Details**
> As a parent, I want to see provider details (name, specialty, office address, phone) for imported medical appointments.

**Acceptance Criteria:**
- [ ] Display provider info from FHIR Practitioner resource
- [ ] Link to MyChart for full provider profile
- [ ] Cached locally for offline access

---

#### F12: Insurance & Authorization Tracking

**US-12.1: Store Insurance Information**
> As a parent, I want to store my child's insurance details so I can quickly reference them.

**Acceptance Criteria:**
- [ ] Store: plan name, member ID, group number, phone, insurance type (private, Medi-Cal, both)
- [ ] Multiple plans per child (e.g., private + Medi-Cal)
- [ ] Photo capture of insurance card (front/back)
- [ ] Encrypted storage

**US-12.2: Track Authorizations**
> As a parent, I want to track therapy and service authorizations so I know when they expire or need renewal.

**Acceptance Criteria:**
- [ ] Create authorization entry: service type, provider, start date, end date, units authorized, units used
- [ ] Visual indicator: green (active, plenty remaining), yellow (nearing limit), red (expired or exhausted)
- [ ] Reminder at 30 days and 7 days before expiration
- [ ] History of past authorizations

---

#### F13: Legal Support Resources

**US-13.1: Legal Resource Library**
> As a parent, I want access to guides on special education law, disability rights, and advocacy strategies.

**Acceptance Criteria:**
- [ ] Content library includes: IDEA overview, Section 504, ADA, Lanterman Act, CA Education Code key sections, IEP rights, due process procedures, complaint procedures
- [ ] Written in plain language (8th grade reading level)
- [ ] Available in English and Spanish at launch
- [ ] Links to full legal text for reference

**US-13.2: Attorney & Advocate Directory**
> As a parent, I want to find special education attorneys and advocates in my area.

**Acceptance Criteria:**
- [ ] Directory of attorneys and advocates filtered by: location, specialty, languages, free/paid, Regional Center area
- [ ] Each listing: name, firm, phone, email, website, specialties, reviews/ratings
- [ ] Community reviews and ratings from Waypoint parents
- [ ] Disclaimer: "Waypoint does not endorse or guarantee any provider"

---

### PHASE 4: Scale & Intelligence (Weeks 33–48)
**Goal:** Analytics, provider portal, advanced AI features, multi-state expansion prep

---

#### F14: Analytics & Family Dashboard

**US-14.1: Family Progress Dashboard**
> As a parent, I want a dashboard showing my overall journey progress, upcoming deadlines, and activity summary.

**Acceptance Criteria:**
- [ ] Dashboard widgets: action plan progress, upcoming appointments (7-day view), pending tasks, recent community activity, document upload count
- [ ] Per-child view for multi-child families
- [ ] Weekly summary email (opt-in)

**US-14.2: Platform Analytics (Internal)**
> As a product owner, I want analytics on user engagement, feature usage, and community health.

**Acceptance Criteria:**
- [ ] Track: DAU/MAU, feature usage by area, action plan completion rates, community engagement metrics, resource search patterns
- [ ] Dashboard for internal team (Supabase + analytics integration)
- [ ] Funnel analysis: onboarding → action plan → engagement → retention

---

#### F15: Provider & Advocate Portal

**US-15.1: Provider Account**
> As a therapist, advocate, or attorney, I want a provider profile so families can find and connect with me.

**Acceptance Criteria:**
- [ ] Separate provider registration flow
- [ ] Profile: name, credentials, specialties, service area, availability, website, bio
- [ ] Verification workflow (credential check before listing goes live)
- [ ] Provider can respond to community questions (tagged as "Verified Provider")

**US-15.2: Secure Document Receipt**
> As an advocate, I want to receive documents shared by families through a secure portal.

**Acceptance Criteria:**
- [ ] Provider receives notification of shared documents
- [ ] View documents in secure web viewer (no download unless family allows)
- [ ] Comment/feedback on shared documents visible to family
- [ ] Audit trail of all access

---

## 7. Development Phases & Roadmap

### Phase 1: Foundation MVP (Weeks 1–10)
| Sprint | Focus | Key Deliverables |
|--------|-------|-----------------|
| Sprint 1–2 | Project setup, auth, onboarding | Expo app scaffold, Supabase schema, auth flow, onboarding wizard |
| Sprint 3–4 | Family profile & Regional Center lookup | Profile CRUD, zip-to-RC mapping, RC data for all 21 centers |
| Sprint 5–6 | Action Plans (Journey Maps) | AI-generated action plans, 6 diagnosis journey maps, progress tracking |
| Sprint 7–8 | Resource Library | Resource database, search/filter UI, bookmarking |
| Sprint 9–10 | Notifications + MVP polish | Push notifications, onboarding refinement, bug fixes, TestFlight/internal beta |

**Phase 1 Exit Criteria:** 10 beta families can onboard, receive personalized action plan, browse resources, and get push reminders.

### Phase 2: Document Intelligence & Communication (Weeks 11–20)
| Sprint | Focus | Key Deliverables |
|--------|-------|-----------------|
| Sprint 11–12 | Calendar & appointment management | Calendar UI, Google Calendar sync, recurring appointments |
| Sprint 13–14 | Document management | Upload, storage, categorization, folder structure |
| Sprint 15–16 | IEP review & AI analysis | IEP upload, AI review pipeline, flag display, goal tracking |
| Sprint 17–18 | Email integration & templates | Gmail OAuth, template library, compose/send flow, communication log |
| Sprint 19–20 | Phase 2 polish + expanded beta | Integration testing, UX refinement, expand beta to 50 families |

**Phase 2 Exit Criteria:** Beta families can manage documents, get IEP AI review, send templated emails, and manage calendar — all from one app.

### Phase 3: Community & Healthcare (Weeks 21–32)
| Sprint | Focus | Key Deliverables |
|--------|-------|-----------------|
| Sprint 21–24 | Peer community | Forums, DM, anonymous posting, moderation, local groups |
| Sprint 25–28 | MyChart integration + insurance tracking | Epic FHIR integration, authorization tracking, insurance storage |
| Sprint 29–32 | Legal resources + Phase 3 polish | Legal library, attorney directory, community review system, public beta launch |

**Phase 3 Exit Criteria:** Public beta launch in California with full feature set. 200+ active families.

### Phase 4: Scale & Intelligence (Weeks 33–48)
| Sprint | Focus | Key Deliverables |
|--------|-------|-----------------|
| Sprint 33–36 | Dashboard & analytics | Family dashboard, internal analytics, engagement tracking |
| Sprint 37–40 | Provider portal | Provider accounts, verification, secure document sharing |
| Sprint 41–44 | Advanced AI features | Conversational AI assistant, smart recommendations, predictive next-steps |
| Sprint 45–48 | Scale prep | Performance optimization, multi-state data model (prep for expansion beyond CA), App Store launch, accessibility audit |

**Phase 4 Exit Criteria:** App Store public launch (iOS + Android). Provider portal live. Analytics operational. Architecture ready for multi-state expansion.

---

## 8. Tech Stack & Architecture

### Recommended Stack (aligned with existing Waypoint work)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Mobile Framework** | Expo / React Native (TypeScript, strict mode) | Cross-platform iOS + Android from single codebase. Aligns with TrailWatch stack. |
| **Web App** | Next.js 14+ (App Router, TypeScript) | SSR for resource library SEO, shared component library with mobile |
| **Backend / Database** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | Managed Postgres, built-in auth (supports SSO), file storage for documents, Row Level Security for HIPAA-adjacent data isolation |
| **AI / LLM** | Claude API (Anthropic) | IEP review, action plan generation, personalized guidance, document analysis, content moderation |
| **Search** | Supabase full-text search + pgvector | Resource library search, semantic search for community/resources |
| **File Storage** | Supabase Storage (S3-compatible) | Document uploads, insurance card photos, encrypted at rest |
| **Push Notifications** | Expo Notifications + OneSignal | Reliable cross-platform push |
| **Email Integration** | Gmail API (OAuth 2.0) | Compose, send, draft management |
| **Healthcare Integration** | Epic FHIR R4 APIs | MyChart appointment import (Phase 3) |
| **Calendar Sync** | Google Calendar API | Two-way appointment sync |
| **Analytics** | PostHog (self-hosted or cloud) | Privacy-first analytics, funnel analysis, feature flags |
| **Monitoring** | Sentry | Error tracking, performance monitoring |
| **CI/CD** | GitHub Actions | Automated testing, EAS Build for Expo |
| **Version Control** | Git (GitHub) | Standard — all code in repo with conventional commits |

### Architecture Diagram (Simplified)

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Expo/RN     │  │  Next.js     │  │  Provider    │  │
│  │  Mobile App  │  │  Web App     │  │  Portal      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Backend                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Auth     │  │  Edge    │  │  Storage │              │
│  │  (SSO)   │  │  Fns     │  │  (Docs)  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│  ┌──────────────────────────────────────┐               │
│  │  PostgreSQL + RLS + pgvector         │               │
│  │  (families, resources, plans, docs)  │               │
│  └──────────────────────────────────────┘               │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Claude   │ │ Gmail    │ │ Epic     │
    │ API      │ │ API      │ │ FHIR    │
    │ (AI)     │ │ (Email)  │ │ (Health) │
    └──────────┘ └──────────┘ └──────────┘
```

### Database Schema (Key Tables)

```
families
├── id (uuid, PK)
├── created_at
├── primary_email
├── language_preference
├── zip_code
├── regional_center_id (FK)
└── income_bracket (optional, encrypted)

children
├── id (uuid, PK)
├── family_id (FK → families)
├── display_name (optional)
├── date_of_birth
├── diagnoses (jsonb array)
└── created_at

action_plans
├── id (uuid, PK)
├── child_id (FK → children)
├── diagnosis_type
├── age_bracket
├── steps (jsonb array of step objects)
├── progress_pct (computed)
└── generated_at

resources
├── id (uuid, PK)
├── name
├── description
├── service_types (text array)
├── diagnoses (text array)
├── age_range (int4range)
├── geo_coverage (text / geometry)
├── cost_type (enum: free, sliding, paid)
├── languages (text array)
├── contact_info (jsonb)
├── approved (boolean)
├── submitted_by (FK → families, nullable)
└── embedding (vector, for semantic search)

documents
├── id (uuid, PK)
├── child_id (FK → children)
├── family_id (FK → families)
├── category (enum)
├── file_path (storage ref)
├── version (int)
├── parent_document_id (FK → documents, nullable, for versioning)
├── annotations (jsonb)
└── uploaded_at

appointments
├── id (uuid, PK)
├── family_id (FK → families)
├── child_id (FK → children, nullable)
├── title
├── datetime_start
├── datetime_end
├── location
├── category (enum)
├── provider_name
├── google_calendar_event_id (nullable)
├── mychart_appointment_id (nullable)
├── recurrence_rule (text, nullable)
└── notes

regional_centers
├── id (uuid, PK)
├── name
├── zip_codes (text array)
├── address
├── phone
├── website
├── intake_guide (jsonb)
├── services (jsonb array)
└── provider_listings (jsonb array)
```

---

## 9. Mockup & Screen Inventory

### Phase 1 Screens

| Screen | Description | Priority |
|--------|-------------|----------|
| **Splash / Welcome** | Brand intro, "Get Started" CTA | P1 |
| **Sign Up / Login** | Email + Google + Apple SSO | P1 |
| **Onboarding Wizard (3–5 steps)** | Child info, diagnosis, zip code, language, income | P1 |
| **Home Dashboard** | Action plan progress, upcoming items, quick links | P1 |
| **Action Plan Detail** | Step-by-step journey map with progress tracking | P1 |
| **Action Plan Step Detail** | Step description, resources, notes, mark complete | P1 |
| **Resource Library (Browse)** | Search + filters + resource cards | P1 |
| **Resource Detail** | Full resource info, bookmark, share, contribute | P1 |
| **Regional Center Info** | RC details, services, intake guide for user's area | P1 |
| **Settings** | Profile edit, notifications, language, account | P1 |

### Phase 2 Screens

| Screen | Description | Priority |
|--------|-------------|----------|
| **Calendar (Month/Week/Day)** | Unified appointment view | P2 |
| **Appointment Create/Edit** | Form with category, provider, recurrence | P2 |
| **Document Library** | Folder tree by child → category → date | P2 |
| **Document Viewer** | PDF/DOCX viewer with annotation tools | P2 |
| **IEP Review Results** | Annotated IEP with AI flags and suggestions | P2 |
| **IEP Goal Tracker** | Goal list with progress bars and log entries | P2 |
| **Email Compose** | Template selector + compose + send via Gmail | P2 |
| **Template Library** | Browsable email templates by category | P2 |
| **Communication Log** | Chronological log of all outreach | P2 |

### Phase 3 Screens

| Screen | Description | Priority |
|--------|-------------|----------|
| **Community Home** | Forum categories, trending, local groups | P3 |
| **Forum Thread** | Posts, replies, reactions, anonymous toggle | P3 |
| **Direct Messages** | Chat-style messaging between parents | P3 |
| **Local Group** | Group feed, events, members | P3 |
| **Insurance Info** | Card photos, plan details, authorization tracker | P3 |
| **Authorization Detail** | Units used vs. authorized, expiration | P3 |
| **Legal Library** | Browse guides by topic | P3 |
| **Attorney/Advocate Directory** | Search, filter, reviews | P3 |

### Phase 4 Screens

| Screen | Description | Priority |
|--------|-------------|----------|
| **Family Dashboard (Enhanced)** | Widgets, weekly summary, multi-child toggle | P4 |
| **Provider Registration** | Provider sign-up and profile creation | P4 |
| **Provider Dashboard** | Incoming document shares, community badge | P4 |
| **AI Assistant (Chat)** | Conversational guidance interface | P4 |

---

## 10. Claude Code Build Plan

### Development Environment Setup

```bash
# Initialize monorepo
mkdir waypoint && cd waypoint
git init
npx create-expo-app@latest apps/mobile --template expo-template-blank-typescript
npx create-next-app@latest apps/web --typescript --tailwind --app
mkdir packages/shared  # shared types, utils, API client

# Supabase
npx supabase init
# Configure supabase/config.toml for local development

# Git
git add .
git commit -m "feat: initial monorepo scaffold with Expo + Next.js + Supabase"
```

### Recommended Monorepo Structure

```
waypoint/
├── apps/
│   ├── mobile/          # Expo / React Native app
│   │   ├── app/         # Expo Router file-based routing
│   │   ├── components/  # Mobile-specific components
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API calls, Supabase client
│   │   └── constants/
│   └── web/             # Next.js web app
│       ├── app/         # App Router pages
│       ├── components/
│       └── lib/
├── packages/
│   └── shared/          # Shared TypeScript types, utils, validation
│       ├── types/       # Database types, API types
│       ├── utils/       # Date helpers, formatters
│       └── validators/  # Zod schemas
├── supabase/
│   ├── migrations/      # SQL migrations
│   ├── functions/       # Edge Functions (AI pipeline, etc.)
│   └── seed.sql         # Seed data (Regional Centers, resources)
├── docs/                # PRD, architecture docs, ADRs
├── .github/
│   └── workflows/       # CI/CD
├── package.json         # Workspace root
└── turbo.json           # Turborepo config
```

### Claude Code Sprint Workflow

Each sprint follows this pattern in Claude Code CLI:

1. **Branch:** `git checkout -b feat/sprint-N-description`
2. **Build:** Implement features per sprint backlog
3. **Test:** Run `npx jest` + manual testing
4. **Commit:** Conventional commits (`feat:`, `fix:`, `chore:`)
5. **PR / Merge:** `git merge` to `main` after review
6. **Tag:** `git tag vX.Y.Z` at sprint completion

### Key Implementation Notes

- **TypeScript strict mode** everywhere — `strict: true` in all `tsconfig.json`
- **Supabase RLS policies** on every table — families can only see their own data
- **Edge Functions** for AI pipeline (IEP review, action plan generation) — keeps Claude API keys server-side
- **Expo Router** for file-based navigation (mirrors Next.js patterns)
- **Zod** for runtime validation of all API inputs/outputs in `packages/shared`
- **React Query (TanStack Query)** for data fetching/caching on both mobile and web

---

## 11. Security, Compliance & Privacy

### HIPAA Compliance Approach

| Requirement | Implementation |
|-------------|---------------|
| Encryption at rest | Supabase Postgres encryption + Storage encryption (AES-256) |
| Encryption in transit | TLS 1.2+ for all API calls |
| Access controls | Supabase RLS, role-based access, session management |
| Audit logging | Supabase audit log extension, custom audit table for document access |
| BAA | Required with Supabase (available on Pro plan), Epic (for FHIR), any sub-processors |
| Data minimization | Collect only necessary data; income bracket optional; child name optional |
| Breach notification | Incident response plan documented; notification within 60 days per HIPAA |

### Additional Privacy Measures

- **COPPA compliance:** No accounts for children under 13; parental consent flow
- **Data deletion:** Users can delete account and all data (CCPA compliance)
- **Anonymous community posting:** Identity shielded from other users (visible to moderators)
- **Share controls:** Document sharing is opt-in with expiration and revocation
- **AI data handling:** IEP documents sent to Claude API are not used for training (per Anthropic's data policy); user consent modal before first AI analysis

---

## 12. Success Metrics

### Phase 1 (MVP)

| Metric | Target |
|--------|--------|
| Beta signups | 50 families |
| Onboarding completion rate | > 80% |
| Action plan generation success | > 95% |
| Weekly active users (beta) | > 60% of signups |
| Resource library entries | 200+ |

### Phase 2

| Metric | Target |
|--------|--------|
| Documents uploaded per user | > 3 avg |
| IEP reviews completed | > 50 |
| Emails sent via app | > 100 total |
| Calendar sync adoption | > 40% of users |

### Phase 3

| Metric | Target |
|--------|--------|
| Community posts | > 500/month |
| DAU/MAU ratio | > 30% |
| Public beta users | 200+ families |
| NPS | > 50 |

### Phase 4

| Metric | Target |
|--------|--------|
| App Store launch | iOS + Android live |
| Total registered families | 1,000+ |
| Provider portal accounts | 50+ |
| Revenue (if premium tier) | $5K MRR |

---

## 13. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Epic FHIR access denied or delayed | Phase 3 healthcare integration blocked | Medium | Build calendar without MyChart first; apply to Epic App Orchard early; fallback to manual appointment entry |
| HIPAA compliance complexity | Legal/architectural overhead | High | Start with HIPAA-adjacent best practices; engage compliance consultant before Phase 3; use Supabase BAA |
| Regional Center data inconsistency | Inaccurate service directories | Medium | Start with RCEB (known entity); validate with parents; build community correction mechanism |
| AI hallucination in IEP review | Incorrect legal/educational advice | Medium | Strong disclaimers; human-in-the-loop for flagged reviews; constrained prompts with citations; legal review of AI outputs |
| Community moderation at scale | Toxic content, legal liability | Medium | AI moderation + human moderators; clear TOS; report mechanisms; legal shield (Section 230) |
| Low initial adoption | Insufficient user base for community | High | Partner with parent advocacy orgs (DREDF, COPAA, Disability Rights CA); Regional Center outreach; school district partnerships |
| Scope creep | Timeline and resource overrun | High | Strict phase gating; MVP-first mindset; user stories have clear acceptance criteria |

---

## 14. Open Questions

1. **Pricing model:** Free tier + Premium ($9.99/mo?) vs. Regional Center reimbursement model (per your existing financial modeling)?
2. **Multi-state expansion timing:** California-first is clear — when does expansion planning begin? Phase 4 or post-Phase 4?
3. **Epic FHIR partnership:** Has outreach to Epic App Orchard begun? What's the typical approval timeline?
4. **Content partnerships:** Which advocacy organizations should be approached for resource library seeding and user acquisition?
5. **Accessibility audit scope:** WCAG 2.1 AA target? Specific accommodations for parents with disabilities?
6. **Multilingual launch scope:** English + Spanish at Phase 1, or English-only MVP with Spanish in Phase 2?
7. **Apple App Store AI disclosure:** Per Apple's Nov 2025 guidelines, the AI consent modal design needs to be specified — carry over from existing Waypoint planning?

---

*End of Document — Waypoint PRD v2.0*
