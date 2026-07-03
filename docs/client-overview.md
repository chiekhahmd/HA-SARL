# Society ERP — Project Overview for HA SARL

> This document explains what we are building, what you will get in the first delivery, and how the system can grow with your business.

---

## What is Society ERP?

Society ERP is a web application built specifically for your company to manage project spending in one place. Instead of tracking budgets, worker hours, material costs, and vehicle insurance across spreadsheets or paper, everything lives in a single system accessible from your browser.

You log in, and you see: how much each project costs, where the money is going, who worked on what, and when your vehicle insurance expires.

---

## What problem does it solve?

| Today (manual) | With Society ERP |
|---|---|
| Budget tracking in Excel or on paper | Live dashboard: budget vs. actual spend per project |
| Worker hours tracked informally | Workers log their hours daily, cost calculated automatically |
| Material purchases scattered | All purchases recorded, allocated to the right project |
| Vehicle insurance dates forgotten | Automatic email alert 30 days before expiry |
| No clear view of total project cost | One-click report: labor + materials = total spend vs. budget |

---

## What you get in the first delivery

### 1. Project Management
- Create projects with a name and budget (in TND)
- See at a glance: budget, amount spent, remaining balance
- Know immediately if a project is over budget

### 2. Worker Management
- Register your workers with their hourly cost rate
- If the rate changes, old records keep the old rate (accurate history)

### 3. Time Tracking
- Workers (or you) record hours spent per project per day
- Labor cost is calculated automatically (hours × rate)
- You see total labor cost per project

### 4. Absence Tracking
- Record vacations, sick days, or other absences
- The system prevents double entries (no overlapping absences)

### 5. Material Purchases & Allocation
- Record every material purchase (name, quantity, cost, supplier)
- Allocate materials to projects (e.g., "50 kg of aluminium → Project Safran A")
- Material costs automatically count toward project spend

### 6. Vehicle Insurance Tracking
- Register company vehicles
- Record insurance periods (start date, end date, insurer)
- **Automatic email alert** 30 days before insurance expires (configurable)

### 7. Spend Reports
- Per-project breakdown: labor cost + material cost = total spend
- Compare actual spend vs. budget
- All-projects summary view

### 8. User Roles
- **Admin** (you): full control, manage users, see everything
- **Manager**: manage projects, workers, materials, vehicles, view reports
- **Worker**: log their own hours and absences only

---

## How it works (non-technical)

- **Web application**: you access it from any browser (computer, tablet, phone browser)
- **Your own address**: the app will have its own web address (e.g., app.hasarl.com)
- **Secure login**: username + password, each person has their own account
- **Always available**: the system runs on the cloud, accessible 24/7
- **Your data is yours**: your company's data is stored separately from anyone else's

---

## What it costs to run

The system is designed to cost nearly nothing while your business is getting started:

| Phase | Monthly cost |
|---|---|
| First 12 months (development + early use) | ~0 TND (free cloud tier) |
| After 12 months, light usage (2-3 users) | ~50-100 TND/month |
| Growth (more users, more data) | Scales with usage — no surprise jumps |

There is no per-user license fee. The cost is purely infrastructure (hosting).

---

## What can be added later

The system is built to grow. Here's what can be added when you need it:

| Feature | Difficulty | When you might need it |
|---|---|---|
| Mobile app (phone) | Medium | When workers need to log hours from the field |
| Custom fields on any entity | Easy | When you need to track extra data specific to your business |
| Invoice generation | Medium | When you want to produce invoices from project data |
| Multi-currency support (TND + EUR) | Easy | If you invoice in EUR for international clients (e.g., Safran) |
| Document attachments (photos, PDFs) | Easy | Receipts, contracts, delivery notes |
| Notifications (SMS, WhatsApp) | Medium | Beyond email alerts |
| Advanced reports / charts | Easy | Graphs, trends, export to PDF/Excel |
| Multiple companies | Already built-in | If you start another company or bring on another client |
| Custom branding | Already built-in | Your logo, your colors, your app name |
| Additional modules (inventory, clients, quotes...) | Medium | When your business processes expand |

---

## Timeline

| Phase | What gets delivered | Estimated time |
|---|---|---|
| Phase 1 | All 8 features listed above (full web app) | 6-8 weeks |
| Phase 2 | Mobile app for workers | +4 weeks |
| Phase 3 | Additional features based on your needs | Ongoing |

---

## What we need from you

Before we start building:

1. **Confirm the features above** match what you need for day one
2. **Your workers' names and hourly rates** (to set up the system)
3. **Your current projects** (names and budgets) — we can pre-load them
4. **Your vehicles** (license plates, current insurance dates)
5. **Your email address** (for receiving insurance alerts)
6. **A domain name** (optional) — or we provide one for you

---

## Guarantees

- **Your data is private**: nobody else can access it
- **No lock-in**: your data can be exported at any time
- **Scalable**: if your team grows from 3 to 30, the system handles it without changes
- **Customizable**: any feature can be adapted to your specific workflow
- **Reliable**: hosted on Amazon Web Services (same infrastructure used by Netflix, Airbnb, and major banks)

---

## Questions?

If anything in this document is unclear or doesn't match your needs, let's discuss before we start building. It's much easier to adjust the plan now than to change the software later.
