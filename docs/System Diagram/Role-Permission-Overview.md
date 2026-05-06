# Aranya CRM Role Permission Overview

Source: `D:\KON\Documents\OneDrive\Desktop\权限.txt`

## 1. Permission Model Boundary

The backend decides what the current authenticated user is allowed to access or execute.

The frontend owns layout, components, static labels, table columns, field names, and visual rendering. The frontend should not receive role names from the backend and should not branch directly on roles. It should only check capability ids such as route, feature, and widget permissions.

The backend must enforce permissions again on business APIs. The UI manifest is only used to help the frontend render the correct routes, buttons, widgets, and entry points.

## 2. Role Legend

| Short Name | Role |
|---|---|
| V | Volunteer |
| SW | Social Worker |
| M | Manager |

## 3. Page Entry Access

| Page | V | SW | M |
|---|:---:|:---:|:---:|
| Dashboard | yes | yes | yes |
| Reports | yes | yes | yes |
| Clients | no | yes | yes |
| Cases | no | yes | yes |
| Users | no | no | yes |

## 4. Operation Permission Matrix

| Area | Operation | V | SW | M |
|---|---|:---:|:---:|:---:|
| Authentication | Login | yes | yes | yes |
| Authentication | Logout | yes | yes | yes |
| Authentication | Reset password | yes | yes | yes |
| Dashboard | View dashboard page | yes | yes | yes |
| Dashboard | View own report count | yes | no | no |
| Dashboard | View own recent reports | yes | no | no |
| Dashboard | Submit report quick action | yes | no | no |
| Dashboard | View total clients stat | no | yes | yes |
| Dashboard | View active cases stat | no | yes | yes |
| Dashboard | View urgent cases stat | no | yes | yes |
| Dashboard | View pending reports stat | no | yes | yes |
| Dashboard | View recent cases | no | yes | yes |
| Dashboard | View all recent reports | no | yes | yes |
| Dashboard | View urgent report banner | no | yes | yes |
| Dashboard | Create case quick action | no | yes | yes |
| Dashboard | Add client quick action | no | yes | yes |
| Reports | View reports page | yes | yes | yes |
| Reports | View own report list | yes | yes | yes |
| Reports | View all report list | no | yes | yes |
| Reports | View report detail | yes | yes | yes |
| Reports | Submit new report | yes | yes | yes |
| Reports | Mark report urgent on submit | yes | no | no |
| Reports | Edit own report | yes | no | no |
| Reports | Edit any report | no | yes | no |
| Reports | Filter by reporter/type/status | no | yes | yes |
| Reports | See urgent report badge/highlight | no | yes | yes |
| Reports | Resolve urgent report | no | yes | yes |
| Reports | Link related contacts in report form | no | yes | yes |
| Reports | Delete report | no | no | yes |
| Reports | Approve report | no | no | yes |
| Reports | Archive report | no | no | yes |
| Cases | View cases page | no | yes | yes |
| Cases | Search/filter cases | no | yes | yes |
| Cases | View case list | no | yes | yes |
| Cases | View case detail | no | yes | yes |
| Cases | Create new case | no | yes | yes |
| Cases | Edit case | no | yes | yes |
| Cases | Assign volunteer to case | no | yes | yes |
| Cases | Update case status | no | yes | yes |
| Cases | Close case | no | no | yes |
| Cases | Edit service modules | no | yes | yes |
| Cases | View case notes | no | yes | yes |
| Cases | Add case note | no | yes | yes |
| Cases | View documents | no | yes | yes |
| Cases | Upload document | no | yes | yes |
| Cases | View document detail | no | yes | yes |
| Cases | Delete document | no | no | yes |
| Cases | View case history | no | yes | yes |
| Cases | View last modified field | no | yes | yes |
| Cases | Check/uncheck task checklist | no | yes | yes |
| Cases | Flag case | no | no | yes |
| Cases | Open audit view from list | no | no | yes |
| Cases | View audit tab/log | no | no | yes |
| New Case | Fill basic case fields | no | yes | yes |
| New Case | Select intensity level | no | yes | yes |
| New Case | Configure service assistance modules | no | yes | yes |
| New Case | Save case draft | no | yes | yes |
| New Case | Submit case creation | no | yes | yes |
| Clients | View clients page | no | yes | yes |
| Clients | Search clients | no | yes | yes |
| Clients | Filter by tradition | no | yes | yes |
| Clients | Filter by status | no | yes | yes |
| Clients | View basic information | no | yes | yes |
| Clients | View contact/address values | no | yes | yes |
| Clients | View identity documents / NRIC | no | yes | yes |
| Clients | View personal information | no | yes | yes |
| Clients | View ordination history | no | yes | yes |
| Clients | View health assessment | no | yes | yes |
| Clients | View special needs | no | yes | yes |
| Clients | Create client profile | no | yes | yes |
| Clients | Edit client profile | no | yes | yes |
| Clients | Link related contacts | no | yes | yes |
| Clients | Delete client profile | no | no | yes |
| Users | View users page | no | no | yes |
| Users | View user list | no | no | yes |
| Users | View user stats | no | no | yes |
| Users | Add user | no | no | yes |
| Users | Edit user | no | no | yes |
| Users | Deactivate/activate user | no | no | yes |
| Users | Delete user | no | no | yes |
| Alerts | Trigger urgent alert from volunteer report | yes | no | no |
| Alerts | Receive urgent alerts | no | yes | yes |

## 5. Dashboard Permissions

### Shared

| Operation | V | SW | M |
|---|:---:|:---:|:---:|
| View page title and welcome area | yes | yes | yes |

### Volunteer

| Operation | V | SW | M |
|---|:---:|:---:|:---:|
| View own report count | yes | no | no |
| View recent reports submitted by self | yes | no | no |
| Submit report quick action | yes | no | no |

### Social Worker + Manager

| Operation | V | SW | M |
|---|:---:|:---:|:---:|
| View total clients / active cases / urgent cases / pending reports cards | no | yes | yes |
| View recent cases | no | yes | yes |
| View recent reports from all users | no | yes | yes |
| View urgent report banner | no | yes | yes |
| Create case quick action | no | yes | yes |
| Add client quick action | no | yes | yes |

### Manager Only

No Manager-only dashboard block is defined in the current permission source. Manager currently matches Social Worker for dashboard-specific content.

## 6. Report Permissions

### Report List Columns

| Column | V | SW | M |
|---|:---:|:---:|:---:|
| Date | yes | yes | yes |
| Monastic | yes | yes | yes |
| Type | yes | yes | yes |
| Location | yes | yes | yes |
| Submitted By | no | yes | yes |
| Status | no | yes | yes |
| Actions | yes | yes | yes |

### Actions

| Operation | V | SW | M |
|---|:---:|:---:|:---:|
| View report list | yes | yes | yes |
| View report detail | yes | yes | yes |
| Submit new report | yes | yes | yes |
| Mark urgent | yes | no | no |
| Edit own report | yes | no | no |
| Edit any report | no | yes | no |
| Filter by reporter/type/status | no | yes | yes |
| Resolve urgent report | no | yes | yes |
| Link related contacts in form | no | yes | yes |
| Delete report | no | no | yes |
| Approve report | no | no | yes |
| Archive report | no | no | yes |

## 7. Case Permissions

### Case List Columns

| Column | V | SW | M |
|---|:---:|:---:|:---:|
| Intensity | no | yes | yes |
| Case No. | no | yes | yes |
| Monastic | no | yes | yes |
| Tradition | no | yes | yes |
| Caseworker | no | yes | yes |
| Status | no | yes | yes |
| Opened | no | yes | yes |
| Actions | no | yes | yes |

### Case List Actions

| Operation | V | SW | M |
|---|:---:|:---:|:---:|
| View case list | no | yes | yes |
| Search/filter cases | no | yes | yes |
| Create case | no | yes | yes |
| View case detail | no | yes | yes |
| Open audit view | no | no | yes |
| Audit a case from row action | no | no | yes |

### Case Detail Actions

| Operation | V | SW | M |
|---|:---:|:---:|:---:|
| View overview | no | yes | yes |
| View services | no | yes | yes |
| View notes | no | yes | yes |
| Add note | no | yes | yes |
| View documents | no | yes | yes |
| Upload document | no | yes | yes |
| View document detail | no | yes | yes |
| Delete document | no | no | yes |
| View linked reports tab | no | yes | yes |
| View history | no | yes | yes |
| Assign volunteer | no | yes | yes |
| Update status | no | yes | yes |
| Edit case | no | yes | yes |
| Close case | no | no | yes |
| Edit service modules | no | yes | yes |
| Check task checklist | no | yes | yes |
| Flag case | no | no | yes |
| View audit tab/log | no | no | yes |

## 8. New Case Permissions

Manager and Social Worker currently have the same new-case form permissions.

| Operation / Field Group | V | SW | M |
|---|:---:|:---:|:---:|
| Basic case information | no | yes | yes |
| Intensity level selection | no | yes | yes |
| Service assistance modules | no | yes | yes |
| Save draft | no | yes | yes |
| Submit case creation | no | yes | yes |

## 9. Client Profile Permissions

### Client Detail Section Visibility

| Section | V | SW | M |
|---|:---:|:---:|:---:|
| Basic information | no | yes | yes |
| Contact / address values | no | yes | yes |
| Identity documents / NRIC | no | yes | yes |
| Personal information | no | yes | yes |
| Ordination history | no | yes | yes |
| Health assessment | no | yes | yes |
| Special needs | no | yes | yes |

### Client Actions

| Operation | V | SW | M |
|---|:---:|:---:|:---:|
| View clients page | no | yes | yes |
| Search clients | no | yes | yes |
| Filter by tradition | no | yes | yes |
| Filter by status | no | yes | yes |
| Create client profile | no | yes | yes |
| Edit client profile | no | yes | yes |
| Link related contacts | no | yes | yes |
| Delete client profile | no | no | yes |

## 10. User Management Permissions

The Users page is Manager-only.

| Operation | V | SW | M |
|---|:---:|:---:|:---:|
| View users page | no | no | yes |
| View user list | no | no | yes |
| View user stats | no | no | yes |
| Add user | no | no | yes |
| Edit user | no | no | yes |
| Deactivate/activate user | no | no | yes |
| Delete user | no | no | yes |
