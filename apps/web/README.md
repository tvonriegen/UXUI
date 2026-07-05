# ClassLink – Vocational Excellence Platform

A fully functional React (Next.js 14 App Router) prototype for a technical high school platform connecting vocational students with local companies.

## 🚀 Quick Start

```bash
# 1. Install Node.js (v18+) if not already installed
#    https://nodejs.org/ or via nvm:
#    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
#    nvm install 20

# 2. Navigate to the project
cd classlink-app

# 3. Install dependencies
npm install

# 4. Run the dev server
npm run dev

# 5. Open in browser
#    http://localhost:3000
```

## ✨ Features

### 🔄 Global Role Switcher
- Dropdown in the header: **Estudiante / Egresado / Empresa / Colegio**
- All screens dynamically re-render based on selected role

### 📊 Dynamic Dashboards (per role)
- **Colegio**: Institutional KPIs, request queue with dismiss actions
- **Estudiante**: XP progress bar, daily streak, badge grid (gamification)
- **Empresa**: Talent pipeline metrics, recent matches
- **Egresado**: Profile views, alumni ranking, suggested actions

### 🔔 Interactive Notifications
- Role-based notification bubbles with unread count
- "Colegio" → Company contact requests
- "Estudiante" → New badge approved
- Mark individual or all as read

### 📌 El Muro (Feed)
- Stateful tabs: **Publicaciones y Eventos** / **Portafolios Destacados**
- "Crear Publicación" button opens a modal dialog
- Like/unlike toggle with count

### 🔍 Talent Directory (Buscador de Alumnos)
- Real-time search by name or skill
- Dropdown filters: Specialty + Student/Graduate role
- **Privacy render logic**:
  - `Egresado` → "Contacto Directo" button
  - `Estudiante` → "Solicitar vía Colegio" button
  - `Empresa` → "Solicitar Contacto" button

### 💬 Messages
- Conversation list with active highlight
- Real-time chat with send functionality
- Mobile-responsive: list → chat view toggle

### 👤 Profile & Gamification
- XP progress bar with level
- Daily streak counter
- Verified badge grid (earned/locked)
- "Descargar CV Público" button with feedback state
- Portfolio showcase

### 📱 Responsive Design
- **Desktop**: Fixed left sidebar + wide content
- **Mobile (≤768px)**: Sidebar hidden → Instagram-style bottom nav
- Smooth transitions throughout

## 🛠 Tech Stack
- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** (utility-first)
- **React Context** (global state management)
- **Material Symbols** (icon system)
- **Manrope** (typography)

## 📁 Project Structure

```
src/
├── app/
│   ├── globals.css          # Tailwind + custom animations
│   ├── layout.tsx           # Root layout with RoleProvider
│   ├── page.tsx             # Dashboard (role-dynamic)
│   ├── muro/page.tsx        # El Muro feed
│   ├── talent/page.tsx      # Talent directory
│   ├── messages/page.tsx    # Chat/Messages
│   └── profile/page.tsx     # Profile + Gamification
├── components/
│   ├── dashboard/
│   │   ├── DashboardColegio.tsx
│   │   ├── DashboardEstudiante.tsx
│   │   ├── DashboardEmpresa.tsx
│   │   └── DashboardEgresado.tsx
│   ├── layout/
│   │   ├── TopNavBar.tsx     # Header + role switcher + notifications
│   │   ├── SideNavBar.tsx    # Desktop sidebar
│   │   ├── BottomMobileNav.tsx # Mobile bottom nav
│   │   └── PageLayout.tsx    # Shell wrapper
│   └── ui/
│       ├── Icon.tsx          # Material Symbols wrapper
│       └── Modal.tsx         # Reusable dialog
└── lib/
    ├── types.ts             # TypeScript interfaces
    ├── data.ts              # Mock/seed data
    └── role-context.tsx     # Global role context
```
