// ──────────────────────────────────────────────────────────
// ClassLink – Global TypeScript Types
// ──────────────────────────────────────────────────────────
// All shared data interfaces live here so every component
// imports from one authoritative source.
//
// Sections:
//  1. Primitives & unions
//  2. User / profile models
//  3. Social feed
//  4. Talent directory
//  5. Messaging
//  6. Gamification
//  7. Navigation
//  8. School administration
// ──────────────────────────────────────────────────────────

/* ── 1. Primitives & Unions ─────────────────────────────── */

/** The four user archetypes in the platform */
export type Role = "Estudiante" | "Egresado" | "Empresa" | "Colegio";

/* ── 2. User / Profile Models ───────────────────────────── */

/**
 * Core user account that adapts to all four roles.
 * Optional fields are populated depending on the role:
 *  - Students/Egresados: xp, level, streak, gpa, skills, portfolio
 *  - Companies:          companyName, industry, employeeCount, website, openPositions
 *  - Schools:            schoolName, studentCount, allianceCount, employabilityRate
 */
export interface UserProfile {
  id:         string;
  role:       Role;
  name:       string;
  /** Absolute URL to the user's avatar image */
  avatar:     string;
  email:      string;
  bio:        string;
  location:   string;
  /** ISO date string of when the user joined the platform */
  joinedDate: string;

  /* ─ Student / Egresado specific ─ */
  specialty?:        string;
  title?:            string;
  skills?:           string[];
  xp?:               number;
  xpMax?:            number;
  level?:            number;
  streak?:           number;        // consecutive days active
  gpa?:              number;        // academic grade point average
  availability?:     "Disponible" | "En prácticas" | "No disponible";
  certifications?:   string[];
  yearsExperience?:  number;
  portfolio?:        PortfolioItem[];

  /* ─ Student soft skills & academic data ─ */
  softSkills?:    string[];
  attendance?:    number;           // 0–100 percentage
  schoolReport?:  SchoolReport;

  /* ─ Company specific ─ */
  rut?:          string;
  companyName?:  string;
  industry?:     string;
  employeeCount?: string;           // e.g. "250+" — stored as string for display
  website?:      string;
  openPositions?: number;
  vacancies?:    Vacancy[];

  /* ─ School specific ─ */
  schoolName?:        string;
  studentCount?:      number;
  allianceCount?:     number;
  employabilityRate?: number;       // percentage 0–100
}

/**
 * Academic report issued by the school for a student.
 */
export interface SchoolReport {
  period:         string;
  summary:        string;
  teacherComment: string;
  behaviorNote:   string;
}

/**
 * A job applicant for a company vacancy.
 */
export interface JobApplicant {
  id:         string;
  name:       string;
  avatar:     string;
  specialty:  string;
  matchScore: number;
  status:     "pending" | "reviewing" | "interviewing" | "accepted" | "rejected" | "hired";
}

/**
 * A company vacancy / internship posting.
 */
export interface Vacancy {
  id:          string;
  title:       string;
  department:  string;
  type:        "Pasantia" | "Tiempo completo" | "Part-time";
  status:      "Activa" | "Cerrada";
  duration?:   string;
  paid:        boolean;
  salary?:     string;
  description?: string;
  applicants:  JobApplicant[];
}

/**
 * A student entry in the school's student roster.
 */
export interface SchoolStudent {
  id:           string;
  name:         string;
  avatar:       string;
  specialty:    string;
  grade:        string;
  attendance:   number;
  gpa:          number;
  availability: "Disponible" | "En prácticas" | "No disponible";
  badgeCount:   number;
}

/**
 * A single item in a student's or graduate's portfolio.
 * Displayed as a card in the profile Portafolio tab.
 */
export interface PortfolioItem {
  id:          string;
  title:       string;
  description: string;
  /** Technology / topic tags shown as chips */
  tags:        string[];
  /** Cover image URL */
  image?:      string;
  /** External project URL */
  link?:       string;
}

/* ── 3. Notifications ───────────────────────────────────── */

/**
 * Platform-wide notification sent to specific roles.
 * `forRoles` lets the context filter notifications
 * to only those relevant to the currently active role.
 */
export interface AppNotification {
  id:          string;
  title:       string;
  description: string;
  /** Human-readable relative time string, e.g. "Hace 2 horas" */
  time:        string;
  /** Whether this notification has been read (server-side initial state) */
  read:        boolean;
  /** Which roles should see this notification */
  forRoles:    Role[];
  /** Notification category/type (e.g. "badge", "message", "job") */
  type?:       string;
}

/* ── 4. Social Feed ─────────────────────────────────────── */

/**
 * A post on El Muro (the community feed).
 * category distinguishes regular posts from portfolio showcases.
 */
export interface FeedPost {
  id:          string;
  title:       string;
  description: string;
  /** Full post body text (optional — description is used as fallback) */
  content?:    string;
  author:      string;              // internal username / id
  authorName?: string;              // display name
  authorAvatar: string;
  authorRole:  Role | string;
  /** Featured image URL */
  image:       string;
  /** Primary topic tag, e.g. "Mecatronica" */
  tag:         string;
  likes:       number;
  /** Whether the current viewer has liked this post */
  liked:       boolean;
  comments:    number;
  category:    "publicacion" | "portafolio" | "evento" | "oferta";
  /** ISO date string (YYYY-MM-DD) */
  createdAt:   string;
  /* ─ Offer-specific fields (only when category === "oferta") ─ */
  offerSpecialty?: string;
  offerDuration?:  string;
  offerPaid?:      boolean;
  offerSalary?:    string;
  offerLocation?:  string;
}

/** A comment on a wall post, joined with the author's profile */
export interface PostComment {
  id:           string;
  postId:       string;
  authorId:     string;
  authorName:   string;
  authorAvatar: string;
  authorRole:   Role | string;
  content:      string;
  createdAt:    string;
}

/* ── 5. Talent Directory ────────────────────────────────── */

/**
 * A searchable talent profile (student or graduate).
 * Used in the /talent directory and company dashboards.
 */
export interface TalentProfile {
  id:           string;
  name:         string;
  role:         "Estudiante" | "Egresado";
  title:        string;
  avatar:       string;
  skills:       string[];
  specialty:    string;
  bio:          string;
  location:     string;
  availability: "Disponible" | "En prácticas" | "No disponible";
  /** AI-computed compatibility score 0–100 (only relevant for Empresa viewers) */
  matchScore?:  number;
  xp:           number;
  level:        number;
  gpa?:         number;
  certifications:   string[];
  yearsExperience?: number;
  portfolio:    PortfolioItem[];
}

/* ── 6. Messaging ───────────────────────────────────────── */

/** A conversation thread entry shown in the sidebar of /messages */
export interface Conversation {
  id:          string;
  name:        string;
  /** Two-letter initials for avatar fallback */
  initials:    string;
  role:        string;
  /** Avatar image URL */
  avatar:      string;
  lastMessage: string;
  /** Human-readable time of the last message, e.g. "10:32" */
  lastTime:    string;
  /** Number of unread messages in this conversation */
  unread:      number;
  /** Whether the other participant is currently online */
  online:      boolean;
}

/** A single chat bubble inside a conversation */
export interface ChatMessage {
  id:             string;
  conversationId: string;
  /** "me" = sent by the current user; "them" = received */
  sender:         "me" | "them";
  text:           string;
  /** Display time string, e.g. "14:22" */
  time:           string;
}

/* ── 7. Gamification ────────────────────────────────────── */

/**
 * An achievement badge earned (or not yet earned) by a student.
 * Locked badges are shown with reduced opacity in the grid.
 */
export interface Badge {
  id:          string;
  name:        string;
  /** Lucide icon name in kebab-case, passed to the <Icon> component */
  icon:        string;
  earned:      boolean;
  /** ISO date string when the badge was earned (only set if earned === true) */
  date?:       string;
  description: string;
}

/* ── 8. Navigation ──────────────────────────────────────── */

/**
 * A sidebar navigation link definition.
 * visibleFor controls which roles see the link —
 * used by SideNavBar and BottomMobileNav to filter the link list.
 */
export interface SidebarLink {
  path:       string;
  label:      string;
  /** Lucide icon name */
  icon:       string;
  visibleFor: Role[];
}

/* ── 9. School Administration ───────────────────────────── */

/**
 * A pending request in the school admin queue.
 * Examples: internship approval, alliance request, certification.
 */
export interface QueueRequest {
  id:          string;
  title:       string;
  description: string;
  /** Name of the person / company who submitted the request */
  author:      string;
  /** Marks high-priority items that need immediate attention */
  urgent:      boolean;
  type:        "practica" | "alianza" | "certificacion" | "reporte";
  /** Submission date string */
  date:        string;
}

/* ── 10. Gamification ───────────────────────────────────── */

export type XpTier = "Bronce" | "Plata" | "Oro" | "Platino" | "Diamante";

export interface DailyQuestTemplate {
  code:         string;
  title:        string;
  description:  string;
  icon:         string;
  target_count: number;
  xp_reward:    number;
  category:     "engagement" | "learning" | "social" | "career";
}

export interface DailyQuestProgress {
  template_code: string;
  quest_date:    string;
  current_count: number;
  completed_at:  string | null;
}

/* ── 11. Tech Radar ─────────────────────────────────────── */

export type RadarTrend = "rising" | "stable" | "falling" | "new";

export interface TechRadarEntry {
  week_start:   string;
  specialty:    string;
  skill:        string;
  heat_score:   number;
  demand_count: number;
  supply_count: number;
  trend:        RadarTrend;
}

export interface UserRadarSnapshot {
  user_id:         string;
  week_start:      string;
  specialty:       string;
  matched_skills:  string[];
  gap_skills:      string[];
  emerging_skills: string[];
  radar_score:     number;
  computed_at:     string;
}

/* ── 12. Interviews ─────────────────────────────────────── */

export type InterviewStatus =
  | "proposed" | "accepted" | "declined"
  | "completed" | "cancelled" | "rescheduled";

export type InterviewModality = "video" | "presencial" | "telefono";

export interface Interview {
  id:             string;
  application_id: string;
  company_id:     string;
  student_id:     string;
  proposed_at:    string;
  duration_mins:  number;
  modality:       InterviewModality;
  location:       string;
  meeting_link:   string;
  status:         InterviewStatus;
  notes:          string;
  created_at:     string;
  updated_at:     string;
}
