# API Integration Status & TODO List

This document tracks the integration status of backend APIs into the frontend application.

## 🟢 integrated
These APIs are connected to the UI and working with real backend data.

### **Auth**
- [x] **Login** (`POST /auth/unified-client/login`) - used in `src/app/login/page.tsx`

### **Programs**
- [x] **List Programs** (`GET /client/program/list`) - used in `src/hooks/usePrograms.ts` for `src/app/programs/page.tsx`
- [x] **Create Program** (`POST /client/program/create`) - used in `src/app/programs/create/page.tsx`
- [x] **Update Program** (`PUT /client/program/:id`) - Integrated into `src/app/programs/edit/[id]/page.tsx`
- [x] **Get Program Details** (`GET /client/program/:id`) - used in `src/app/programAdmin/goals/page.tsx` and Edit page
- [x] **Generate Access Code** (`POST /client/program/:id/generate-access-code`) - used in `src/app/programs/create/invite-participants/page.tsx`
- [x] **Delete Program** (`DELETE /client/program/:id`) - used in `src/hooks/usePrograms.ts` and `ProgramCard.tsx`

### **Content**
- [x] **Create Content** (`POST /client/content/create`) - Consolidated into `contentService`
- [x] **Update Content** (`PUT /client/content/:id/update`) - Consolidated into `contentService`
- [x] **Delete Content** (`DELETE /client/content/:id`) - used in `ModularLearningPage` and `JourneyLearningPage`
- [x] **List Content** (Scheduled/Modular/Journey) - Simplified with robust service-level extraction

### **License & Management**
- [x] **List Plans** (`GET /client/license-plan/list`) - Integrated in `plansService` and `PlansPage`
- [x] **License Details** (`GET /client/license-plan/details`) - used in `ManageLicenseRetailPage` and `ManageLicenseCorporatePage`
- [x] **Create Order** (`POST /client/license-plan/order`) - Method added to `plansService`
- [x] **Verify Payment** (`POST /client/license-plan/order/verify`) - Method added to `plansService`

### **Knowledge Cards**
- [x] **List Cards** (`GET /client/knowledge-card/list/:programId`) - used in `KnowledgeCardsPage`
- [x] **Create Card** (`POST /client/knowledge-card/create`) - used in `KnowledgeCardsPage`
- [x] **Update Card** (`PUT /client/knowledge-card/:id`) - Integrated in `KnowledgeCardsPage`
- [x] **Delete Card** (`DELETE /client/knowledge-card/:id`) - Integrated in `KnowledgeCardsPage`

### **Goals & Habits**
- [x] **List Goals/Habits** (`GET /client/goal/list/:programId`, `GET /client/habit/list/:programId`)
- [x] **Create Goal/Habit** (`POST /client/goal/create`, `POST /client/habit/create`)
- [x] **Update Goal/Habit** (`PUT /client/goal/update`, `PUT /client/habit/update`)
- [x] **Delete Goal/Habit** (`DELETE /client/goal/:id`, `DELETE /client/habit/:id`)
- Integrated in `src/app/programAdmin/goals/GoalsContent.tsx` using `AddGoalHabitModal.tsx`

---

## 🔴 Pending Integration
These APIs are defined in the service layer but are **NOT** yet connected to any UI component.

### **Auth**
- [ ] **Register** (`POST /client/register`) - Service defined, no UI usage found.
- [ ] **Get User Profile (Me)** (`GET /client/me`) - Service defined, no UI usage found.
- [ ] **Upload Logo** (`POST /client/:id/logo`) - Service defined, no UI usage found.

### **Programs**
- [ ] **Search Programs** (`GET /client/program/list`) - Service defined, but currently using client-side filtering.


### **License & Plans**
- [ ] **Invite Participant** (`POST /client/license/invite-participant`)

### **Support**
- [ ] **List Tickets** (`GET /client/support-ticket/list`)
- [ ] **Get Ticket** (`GET /client/support-ticket/:id`)
- [ ] **Respond to Ticket** (`POST /client/support-ticket/:id/respond`)

---

## 📝 Next Steps
1.  **Checkout Integration**: Fully connect the `plans/checkout` page with Razorpay and the `createOrder/verifyPayment` APIs.
2.  **Trial Plan Activation**: Connect the `plans/trialplan` page to activate a trial on the user's account.
3.  **Invite Participant**: Implement the invite flow in the license management or program participants page.
4.  **Support Tickets**: Create a UI for listing and responding to support tickets.
