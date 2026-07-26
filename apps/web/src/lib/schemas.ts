import { z } from "zod";
import { POST_TAGS } from "./specialties";

// ── Chilean RUT utilities ────────────────────────────────────────────

/** Compute the expected check digit for a RUT body string (digits only). */
function rutCheckDigit(body: string): string {
  let sum = 0;
  let mult = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (sum % 11);
  if (r === 11) return "0";
  if (r === 10) return "K";
  return String(r);
}

/** Returns true when the RUT string has a valid check digit. Accepts any
 *  common formatting (dots, dashes, spaces) and is case-insensitive. */
export function isValidRut(rut: string): boolean {
  const cleaned = rut.replace(/[\.\s]/g, "").toUpperCase();
  // Must be body + '-' + dv, or body + dv with no dash (7-8 digits + [0-9K])
  const match = cleaned.match(/^(\d{7,8})-?([0-9K])$/);
  if (!match) return false;
  return rutCheckDigit(match[1]) === match[2];
}

/** Formats a raw RUT string to XX.XXX.XXX-Y canonical form. */
export function formatRut(rut: string): string {
  const cleaned = rut.replace(/[\.\s-]/g, "").toUpperCase();
  if (cleaned.length < 2) return cleaned;
  const body = cleaned.slice(0, -1);
  const dv   = cleaned.slice(-1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted}-${dv}`;
}

const rutSchema = z
  .string()
  .min(1, "RUT requerido")
  .refine(isValidRut, { message: "RUT inválido (dígito verificador incorrecto)" });

// ── Auth ────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

// Only Empresa and Colegio can self-register.
// Students are created exclusively by their school via the admin Server Action.
export const registerSchema = z.object({
  name:     z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email:    z.string().email("Email inválido"),
  password: z.string()
    .min(12, "La contraseña debe tener al menos 12 caracteres")
    .regex(/[0-9]/, "Debe incluir al menos un número")
    .regex(/[^a-zA-Z0-9]/, "Debe incluir al menos un carácter especial"),
  confirmPassword: z.string(),
  role: z.enum(["Empresa", "Colegio"], {
    error: () => ({ message: "Solo Empresa y Colegio pueden registrarse aquí." }),
  }),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// School creates a student account
export const createStudentSchema = z.object({
  firstName:    z.string().min(2, "Nombre muy corto").max(50),
  lastName:     z.string().min(2, "Apellido muy corto").max(50),
  email:        z.string().email("Email inválido"),
  tempPassword: z.string()
    .min(8,  "Mínimo 8 caracteres")
    .max(72, "Máximo 72 caracteres"),
  rut:          rutSchema,
  gender:       z.enum(["Masculino","Femenino","Otro","Prefiero no decir"], {
    error: () => ({ message: "Género inválido" }),
  }),
  cellphone:    z.string().min(7, "Teléfono muy corto").max(20),
  class_name:   z.string().min(1, "Clase requerida").max(30),
  age:          z.coerce.number().int().min(10).max(100),
  specialty:    z.string().max(100).optional(),
  grade:        z.string().max(20).optional(),
});

// School edits existing student profile (all fields optional except identity)
export const editStudentSchema = z.object({
  rut:          rutSchema.optional(),
  gender:       z.enum(["Masculino","Femenino","Otro","Prefiero no decir"]).optional(),
  cellphone:    z.string().min(7).max(20).optional(),
  class_name:   z.string().min(1).max(30).optional(),
  age:          z.coerce.number().int().min(10).max(100).optional(),
  specialty:    z.string().max(100).optional(),
  grade:        z.string().max(20).optional(),
  attendance:   z.coerce.number().int().min(0).max(100).optional(),
  soft_skills:  z.array(z.string()).optional(),
});

// ── Profile ─────────────────────────────────────────────────
export const THEME_COLORS = [
  "cyan", "violet", "amber", "rose", "emerald", "blue", "fuchsia", "slate",
] as const;
export type ThemeColor = typeof THEME_COLORS[number];

export const profileEditSchema = z.object({
  name:         z.string().min(2).max(100),
  bio:          z.string().max(500).optional(),
  location:     z.string().max(100).optional(),
  specialty:    z.string().max(100).optional(),
  title:        z.string().max(100).optional(),
  availability: z.enum(["Disponible", "En prácticas", "No disponible"]).optional(),
  website:      z.string().url("URL inválida").optional().or(z.literal("")),
  theme_color:  z.enum(THEME_COLORS).optional().nullable(),
});

// ── Post ─────────────────────────────────────────────────────
export const postSchema = z.object({
  title:       z.string().min(3, "El título es demasiado corto").max(120),
  description: z.string().max(2000).optional(),
  tag:         z.enum(POST_TAGS as unknown as [string, ...string[]]),
  category:    z.enum(["publicacion", "portafolio"]),
});

// ── Message ──────────────────────────────────────────────────
export const messageSchema = z.object({
  text: z.string().min(1).max(2000),
  conversationId: z.string().uuid(),
});

// ── Job Posting ──────────────────────────────────────────────
export const jobPostingSchema = z.object({
  title:       z.string().min(5).max(150),
  description: z.string().min(20).max(5000),
  location:    z.string().max(100).optional(),
  type:        z.enum(["full-time", "part-time", "pasantia", "contrato"]),
  specialty:   z.string().max(100).optional(),
  salary_min:  z.number().nonnegative().optional(),
  salary_max:  z.number().nonnegative().optional(),
});

// ── File upload ──────────────────────────────────────────────
export const fileUploadSchema = z.object({
  size: z.number().max(5 * 1024 * 1024, "El archivo debe ser menor a 5MB"),
  type: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).refine(
    (v) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(v),
    { message: "Solo se permiten imágenes (JPEG, PNG, WebP, GIF)" }
  ),
});
