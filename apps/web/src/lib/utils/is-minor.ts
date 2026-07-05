export function isMinorProfile(role: string | null | undefined, age: number | null | undefined): boolean {
  return role === "Estudiante" && (age == null || age < 18);
}
