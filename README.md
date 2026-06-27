# Al Qua'a Service Discovery

A submission for the **Tatweer Hackathon 2026** — Challenge: **Service Discovery**
("Connect residents with local services, opportunities, and events")

## Problem

Al Qua'a is a dispersed rural community in Al Ain, UAE, built around camel farming, with
growing tourism (stargazing) and small-business activity. Residents often don't know
**what services exist nearby, where they are, when they're open, or who to call** —
healthcare, government paperwork, transport, veterinary/agriculture support, education,
and emergency contacts are scattered across word-of-mouth and physical visits.

## Solution

A lightweight, **searchable directory** of local services that works on any phone with a
browser — no app install, no login, no data cost beyond loading a small JSON file once.

Residents can:
- **Search by keyword** (e.g. "camel", "permit", "clinic", "bus") across name, category,
  description, and tags.
- **Filter by category** (Healthcare, Government, Agriculture & Livestock, Education,
  Transport, Emergency, Tourism & Events, Entrepreneurship).
- **One-tap call** any listed service via `tel:` links.
- See a permanent **emergency quick-access banner** for 24/7 Civil Defense response.

## Why this approach

- **Feasibility & readiness**: No backend, no build step, no dependencies — it is a
  complete, working product right now, deployable instantly via GitHub Pages.
- **Evidence**: Seeded with realistic, Al Qua'a-specific services across every major
  community need (health, government, agriculture, education, transport, emergency,
  tourism, entrepreneurship) reflecting the area's real economy and geography.
- **Scalability**: Adding a new service is a one-line JSON entry in
  [`data/services.json`](data/services.json) — no code changes needed. This file could be
  swapped for a live API or a community-submission form without touching the UI.
- **Impact**: Directly reduces the time and friction for residents to find help —
  especially relevant in an emergency, for new entrepreneurs, or for residents without
  reliable internet access to search engines that don't know Al Qua'a exists.

## Handling mistaken or invalid submissions

Since anyone can add a listing via **+ Add a service**, bad data is a real risk. The app
guards against it in three ways:

1. **Validation before save** — required fields, a minimum description length, and a
   phone number format check. Duplicate names/phone numbers are rejected.
2. **Confirmation step** — before saving, the submitter sees a summary of what they
   entered and must confirm it's correct.
3. **Visible removal** — every community-submitted listing is tagged
   **"Community-submitted"** and shows a **Remove this listing** button, so a mistaken
   entry can be deleted in one click. The original seeded directory entries are not
   removable, so the core directory can't be wiped out by mistake.

In a production deployment with a real backend, this would extend to an admin
moderation queue before a submission goes public — the current client-side checks are
the hackathon-scale version of that same safeguard.

### Admin review (prototype)

New community submissions are saved with a **"pending"** status and stay hidden from
public search until approved. A passcode-gated **Admin** link (bottom of the page)
opens a review queue where pending submissions can be **approved** (goes live) or
**rejected** (deleted).

**Important limitation, by design**: this app has no backend, so all data — including
the pending queue — lives in the browser's `localStorage` on a single device. This
demo proves the moderation *workflow*, but it cannot let an admin review submissions
made on a different device. A production version would move this queue into a shared
database (e.g. Firebase/Supabase) so submissions are centrally stored and any admin,
from any device, can review them — the UI and approve/reject logic would not need to
change, only where the data lives.

## Tech Stack

Plain **HTML / CSS / JavaScript** — zero build tooling, zero dependencies. Chosen
deliberately for hackathon speed and to guarantee it runs anywhere, including low-spec
devices common in rural areas.

```
.
├── index.html          # Page structure
├── style.css           # Styling
├── app.js              # Search, filter, and render logic
└── data/
    └── services.json   # Service directory (the "database")
```

## Running it locally

No install required. Either:

1. Open `index.html` directly in a browser, **or**
2. Serve it locally (recommended, avoids `fetch` CORS issues with local files):
   ```bash
   python -m http.server 8000
   # then open http://localhost:8000
   ```

## Deployment

Deployed via **GitHub Pages** directly from this repository (Settings → Pages →
deploy from `main` branch, root folder).

## Future extensions

- Community-submitted listings via a simple form + moderation queue.
- Multi-language support (Arabic/English toggle).
- Offline support via a service worker (PWA) for low-connectivity areas.
- Map view using listed locations.

## Team / Hackathon

Built for the **Tatweer Hackathon**, 26–28 June 2026, Al Qua'a, Al Ain — in partnership
with Abu Dhabi University. Theme: *Solutions for rural communities.*
