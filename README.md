# Snapserve Vault 🛡️📄

Next-generation e-signature, owner preset automation, and document management SaaS platform.

## Features ⚡
- **Document Management**: Create, send, and track PDF documents for electronic signing.
- **Owner Presets & Auto-Fill**: Instant single-click placement of owner signature, date, name, and company fields.
- **Bank-Grade Security**: 256-bit AES encryption and tamper-evident audit log trail.
- **Responsive UI**: Built with React, Vite, Tailwind CSS, and shadcn UI components.
- **Cloud Database Integration**: Powered by PostgreSQL (Supabase Cloud) and Prisma ORM.

## Tech Stack 🛠️
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide Icons, PDF.js
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, JSON Web Tokens (JWT)
- **Database**: Supabase PostgreSQL

## Getting Started 🚀

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ramsiva97465-dot/Snapserve_vault.git
   cd Snapserve_vault
   ```

2. **Backend API Setup**:
   ```bash
   cd api
   npm install
   npx prisma generate
   npm run dev
   ```

3. **Frontend Web Setup**:
   ```bash
   cd ../web
   npm install
   npm run dev
   ```

Open `http://localhost:5173` in your browser to access the app!
