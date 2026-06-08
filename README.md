# Experience My India - Enterprise Task & Operations Portal

An enterprise-grade, comprehensive operations and task management portal engineered specifically for the operational needs of the Experience My India corporation. Built on a modern Next.js 14 architecture, this application serves as the central nervous system for internal operations, employee tracking, project management, and cross-departmental communication.

## Architectural Overview

This portal is designed to handle high-concurrency internal traffic with a focus on security, real-time data synchronization, and an intuitive user experience. 

- **Frontend Framework:** Next.js 14 (App Router) paired with React 18
- **Styling & UI:** Tailwind CSS, Radix UI primitives, and Framer Motion for high-performance micro-interactions.
- **State Management:** Zustand for global state, React Query for asynchronous data fetching, caching, and synchronization.
- **Backend Infrastructure:** Node.js API routes (Next.js serverless functions) backed by MongoDB (via Mongoose) for flexible document storage.
- **Authentication:** Custom JWT-based authentication system with Role-Based Access Control (RBAC).
- **File Management:** Integrated Cloudinary storage for secure, cloud-based asset and document management.

## Core Systems & Functionalities

The platform is strictly segregated by role, ensuring data privacy and operational hierarchy. The three primary roles are Employee, Admin, and Master Admin.

### 1. Hierarchical Role-Based Access Control (RBAC)
- **Employee Portal:** Focused on daily execution. Employees can manage assigned tasks, log daily work, submit evidence of completion, and communicate with team members.
- **Admin Portal:** Designed for middle management and department leads. Admins can monitor employee activity logs in real-time, generate SEO and performance reports, manage user access, and oversee departmental task boards.
- **Master Admin (Superadmin) Portal:** The executive oversight layer. Provides macro-level organizational statistics, final review capabilities for admin micro-tasks, and systemic configuration controls.

### 2. Comprehensive Task & Project Management
- **Task Board:** A robust Kanban-style interface for tracking task lifecycles from assignment to review. Includes priority flagging, deadlines, and real-time status updates.
- **Project Tracking:** Centralized repositories for client projects, allowing teams to collaborate, attach files, and track milestone progression.
- **Time & Evidence Tracking:** Built-in timer functionality for tasks and mandatory evidence submission (files/links) before a task can be marked complete.

### 3. Real-time Communication & Notifications
- **Internal Messaging System:** Direct, context-aware messaging. Users can link conversations directly to specific tasks, projects, or work logs to maintain operational context.
- **Global Notification Engine:** System-wide alerts for task assignments, status changes, mentions, and administrative broadcasts.

### 4. Auditing & Reporting
- **Activity Logging:** Every significant action within the system is permanently logged and auditable by administrators.
- **Automated Work Logs:** Employees submit daily comprehensive work logs which are aggregated into department-wide reports for management review.
- **SEO & Departmental Reports:** Specialized reporting modules tailored for specific department metrics (e.g., SEO tracking, content generation statistics).

## Development Setup

To run this project locally, ensure you have Node.js (v18+) installed.

1. Clone the repository
2. Install dependencies:
   npm install
3. Configure your environment variables in a .env file (database URIs, JWT secrets, Cloudinary credentials).
4. Run the database seeder to populate mock data and structural requirements:
   npm run seed
5. Start the development server:
   npm run dev

The application will be accessible at http://localhost:3000.

## Security Considerations

This application handles sensitive corporate data. As such, it implements strict route-level protection, API request validation via Zod, and encrypted credential storage using bcryptjs. All API requests must be accompanied by a valid bearer token, and cross-departmental data access is strictly enforced at the database query level.
