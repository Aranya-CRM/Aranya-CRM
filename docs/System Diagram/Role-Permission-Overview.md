# Aranya-CRM Role Permission Overview

## 1. Login & Authentication

All three roles share the same login flow. Upon successful authentication, users are redirected to their role-specific dashboard:

| Role | Dashboard After Login |
|---|---|
| Volunteer | Volunteer Dashboard (Limited Access) |
| Social Worker | Social Worker Dashboard (Full Access) |
| Manager | Manager Dashboard (Admin Access) |

---

## 2. Client Profile Management

The system applies **Dual-Lens Permission Logic** to control what each role can see and do within client profiles.

### Volunteer
- Can search for clients
- Views a restricted **Basic View** only:
  - Name & Mobility Info only
  - Tab 1 (Care & Timeline) visible
  - Tab 2 (Case Management) **hidden**
  - Advanced actions **disabled**
- Can link related contacts within allowed scope
- Cannot edit or delete client profiles

### Social Worker
- Can search for clients
- Views the full **Full View**, including:
  - Complete profile (incl. IC information)
  - Tab 1 (Care & Timeline) visible
  - Tab 2 (Case Management) visible
  - All actions **enabled**
- Can edit client profiles
- Can link related contacts
- Cannot delete client profiles

### Manager
- Views Full View with additional **Admin Controls**
- All Social Worker permissions, plus:
  - Delete client profile (requires confirmation)

---

## 3. Case Management

### Volunteer
- Search cases
- View case details — **read-only**
- Add notes to a case
- Track tasks / update task progress
- If an urgent observation is flagged, the system automatically triggers an alert to the Social Worker
- Cannot create, update status, close, clone, or assign cases

### Social Worker
- Full day-to-day case operations:
  - Create new case (initial status: New Intake)
  - Assign volunteers to a case
  - Update case status: New → Active → Critical → Closed/Archived
  - Close case (closure conditions must be confirmed)
  - Upload and edit documents
  - Clone case
  - Search cases
- System auto-triggers an urgent alert when a case status reaches Critical

### Manager
- All Social Worker permissions, plus:
  - Audit case — view all records
  - Flag a case and notify the responsible Social Worker if issues are found
  - Delete documents

> **Key restriction:** Creating a case is exclusive to Social Workers and Managers. If a Volunteer attempts to create a case, the server returns **403 Forbidden**.

---

## 4. Report Management

### Volunteer
- Create observation reports
- Can mark a report as urgent on submission
- View own reports — **read-only**
- Cannot edit or delete reports

### Social Worker
- Create reports (fill in title, notes, date; optionally link related contacts; status changes to Submitted on submission)
- Edit reports
- Delete reports
- Receive urgent alert notifications from Volunteer-submitted reports
- Mark urgent reports as resolved (status archived to regular timeline)

### Manager
- View all reports — **full access**
- Approve / archive reports
- Delete reports

---

## 5. User & System Administration

### Volunteer
- Login, logout, reset password, register
- No user management capabilities

### Social Worker
- Same as Volunteer
- No user management capabilities

### Manager
- All basic operations, plus:
  - Invite new users (system sends invitation email)
  - Assign roles to users

---

## Summary Permission Matrix

| Feature                          |       Volunteer        | Social Worker | Manager |
|----------------------------------|:----------------------:|:---:|:---:|
| Login / Logout / Reset Password  |           ✅            | ✅ | ✅ |
| Invite Users / Assign Roles      |           ❌            | ❌ | ✅ |
| View Client Profile (restricted) | ✅ Read-Only Basic View | ✅ Full View | ✅ Full View |
| Edit Client Profile              |           ❌            | ✅ | ✅ |
| Delete Client Profile            |           ❌            | ❌ | ✅ |
| Link Related Contacts            |           ❌            | ✅ | ✅ |
| Search / View Cases              |           ❌            | ✅ | ✅ |
| Add Notes to Case                |           ❌            | ✅ | ✅ |
| Create Case                      |           ❌            | ✅ | ✅ |
| Update Case Status               |           ❌            | ✅ | ✅ |
| Assign Volunteer to Case         |           ❌            | ✅ | ✅ |
| Close / Clone Case               |           ❌            | ✅ | ✅ |
| Upload / Edit Documents          |           ❌            | ✅ | ✅ |
| Delete Documents                 |           ❌            | ❌ | ✅ |
| Audit Cases                      |           ❌            | ❌ | ✅ |
| Create / Submit Reports          |           ✅            | ✅ | ✅ |
| Edit Reports                     |           ❌            | ✅ | ✅ |
| Delete Reports                   |           ❌            | ✅ | ✅ |
| view the Reports                 |    ✅ Only the list     | ✅ | ✅ |
| Receive Urgent Alerts            |   ❌ (triggers only)    | ✅ | ✅ |

---
