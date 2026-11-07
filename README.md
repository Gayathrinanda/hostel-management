# Hostel Management Web App

A complete frontend for managing a hostel: hostellers, in/out movements, weekly food
polls, rent and advance payments, washing machine subscriptions and automatic
reminders.

Built with **React 18**, **JavaScript (JSX)**, **plain CSS**, **React Router** and
**Vite**. Phase 1 is frontend-only: all data is stored in the browser with
LocalStorage, behind a service layer that can later be replaced with a backend API.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Demo credentials

| Role      | Username | Password   |
| --------- | -------- | ---------- |
| Admin     | `admin`  | `admin123` |
| Hosteller | `rahul`  | `rahul123` |
| Hosteller | `karan`  | `karan123` |
| Hosteller | `priya`  | `priya123` |

New hosteller accounts use the username and password set by the admin when the
profile is created. Deactivated accounts cannot sign in.

## Features

- **Admin dashboard** — hosteller counts, inside/outside status, today's outings,
  pending rent, upcoming due dates, reminders, activity feed and meal counts.
- **Hosteller management** — create/edit/search/filter profiles, upload and preview
  government ID proofs, manage rooms, rent, advance, subscriptions and login
  credentials, deactivate/reactivate without deleting history.
- **In/Out tracking** — Clock Out with browser geolocation (date, time, latitude,
  longitude) and retry on denied permission; Clock In calculates time outside.
  Admin live status, Google Maps links, filters and full outing history.
- **Food polls** — admin creates weekly polls with menus and a deadline, locks or
  reopens them and sees per-day meal counts plus individual selections. Hostellers
  submit once and can edit before the deadline.
- **Rent & advances** — monthly cycles by due day, Paid/Pending/Overdue status,
  partial payments, payment methods/references, separate advance deposit ledger and
  full payment histories.
- **Notifications** — rent reminders (2 days before, due today, overdue), new
  hostellers, open outings and food poll deadlines, all derived from live data.
- **Hosteller dashboard** — personal details, live status, clock actions, food poll,
  rent/advance, washing machine subscription, outing history and alerts.
- **Settings** — admin credentials, JSON backup download and demo data reset.

## Project structure

```
src/
  components/     reusable UI, layout and admin components
  context/        Auth, Data and Toast providers
  data/           demo seed data
  hooks/          small shared hooks
  lib/            dates, validation, rent, food and notification logic
  pages/          admin and hosteller screens
  services/       LocalStorage persistence layer
  styles/         global CSS
```

Data lives under the `hms.database.v1` and `hms.session.v1` LocalStorage keys.
Passwords are stored in plain text for this demo phase only.
