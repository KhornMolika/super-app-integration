# DSP Super App Integration Platform (POC)

Welcome to the Digital Public Service (DSP) Super App Integration Platform. This Proof of Concept (POC) serves as the core onboarding and management portal for integrating third-party **Mini-Apps** into the main Super App ecosystem.

## Overview

The platform provides an automated, secure, and streamlined workflow for third-party developers to register their Mini-Apps, submit them for automated technical validation, and eventually get approved for publication within the Super App. 

It supports multiple integration methodologies, heavily focusing on **WebView** and **Flutter In-App Modules**.

## Architecture & Tech Stack

This repository is split into two primary applications:

1. **Backend API (`/dps_backend`)**: 
   - **Framework**: NestJS (Node.js)
   - **Database**: PostgreSQL (via TypeORM)
   - **Features**: Handles Mini-App schema validation, asynchronous background validation checks (URL reachability), and automated email notifications using the Resend SDK.

2. **Admin Back-Office (`/dps_webapp_backoffice`)**: 
   - **Framework**: Next.js 16 (React, Turbopack)
   - **Styling**: Tailwind CSS
   - **Features**: A comprehensive dashboard for administrators to review submitted Mini-Apps, check validation statuses, and interactively preview Mini-Apps across Desktop, Tablet, and Mobile views.

## Current Capabilities

- **Robust Registration Flow**: Developers can register Mini-Apps with detailed metadata (Name, Description, Owner Email, Integration Methods).
- **Automated Pre-Integration Validation**: The backend automatically performs asynchronous reachability and format checks on submitted URLs (enforcing HTTPS for production, allowing localhost for dev).
- **Automated Email Notifications**: Integration with **Resend** to automatically dispatch success or failure emails directly to the Mini-App developer based on the automated validation results.
- **Interactive Multi-Device Preview**: A built-in iframe-based preview modal inside the Back-Office allows administrators to natively test the Mini-App UI in simulated Desktop, Tablet, and Mobile device frames.
- **Global Action Safety**: Critical actions (like approving or deleting an app) are protected by a globally accessible Tailwind confirmation modal.

## Getting Started: How to Run the Projects

### 1. Database Setup
Ensure you have a PostgreSQL instance running locally or remotely. Create a database named `dps_db`.

### 2. Running the Backend API
The backend is powered by NestJS. To run it locally:

```bash
# 1. Navigate to the backend directory
cd dps_backend

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
# Duplicate .env.example (or create a .env file) and fill in the required variables:
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=your_username
# DB_PASSWORD=your_password
# DB_DATABASE=dps_db
# RESEND_API_KEY=your_resend_api_key
# RESEND_FROM_EMAIL=onboarding@resend.dev

# 4. Start the development server
pnpm run start:dev
```
The backend API will start on `http://localhost:3000`.

### 3. Running the Admin Back-Office (Frontend)
The frontend is powered by Next.js. To run it locally alongside the backend:

```bash
# 1. Navigate to the frontend directory
cd dps_webapp_backoffice

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
# Create a .env.local file and set the API URL pointing to the backend:
# NEXT_PUBLIC_API_URL=http://localhost:3000

# 4. Start the development server
pnpm run dev
```
The frontend application will start on `http://localhost:3001` (or whichever port Next.js assigns). Open it in your browser to view the Back-Office dashboard.

## Roadmap (Upcoming Features)

According to our `doc/tasks.md` roadmap, the following major features are currently under development:

1. **Native Permission Management**: Designing flows to handle, review, and enforce native device permissions requested by Mini-Apps.
2. **Flutter Package Integration**: Automated source-code security scanning and compiled artifact validation for Flutter modules.
3. **Validation Status Dashboard**: A granular UI detailing the exact Pass/Fail status of every micro-check (Security, Build, Integration).
4. **Automated Issue Classification**: System-level intelligence to determine if a failure is the fault of the Mini-App team or the Super App platform.
5. **Strict Approval Gates**: Locking the final Super App approval controls until all automated validation phases pass successfully.

---
*Built for the DSP Super App Ecosystem.*
