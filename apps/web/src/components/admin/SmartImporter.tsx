"use client";
// ──────────────────────────────────────────────────────────────────
// SmartImporter – 4-step bulk student importer for Colegio admins
// ──────────────────────────────────────────────────────────────────
// Accepts .csv AND .xlsx/.xls files.
// Step 1 · Upload  — drag-and-drop, file-type detection
// Step 2 · Map     — auto-detect column headers, admin verifies
// Step 3 · Validate — editable table, per-row error highlighting
// Step 4 · Import  — sequential creation with progress + error log
// ──────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";
import { bulkCreateStudents } from "@/app/actions/school";
import { isValidRut } from "@/lib/schemas";
import {
  Upload, X, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2,
  Loader2, FileText, Users, Trash2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

type Step = "upload" | "map" | "validate" | "import";

type FieldKey =
  | "firstName" | "lastName" | "email" | "tempPassword"
  | "rut" | "gender" | "cellphone" | "class_name" | "age"
  | "specialty" | "grade";

const REQUIRED_FIELDS: FieldKey[] = [
  "firstName", "lastName", "email", "tempPassword",
  "rut", "gender", "cellphone", "class_name", "age",
];
const OPTIONAL_FIELDS: FieldKey[] = ["specialty", "grade"];
const ALL_FIELDS: FieldKey[] = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const FIELD_LABELS: Record<FieldKey, string> = {
  firstName:    "Primer Nombre",
  lastName:     "Apellido",
  email:        "Correo",
  tempPassword: "Contraseña Temporal",
  rut:          "RUT",
  gender:       "Género",
  cellphone:    "Celular",
  class_name:   "Clase / Curso",
  age:          "Edad",
  specialty:    "Especialidad",
  grade:        "Grado",
};

const FIELD_PLACEHOLDERS: Record<FieldKey, string> = {
  firstName:    "Ej: Juan",
  lastName:     "Ej: Pérez",
  email:        "Ej: juan@colegio.cl",
  tempPassword: "Mín. 8 caracteres",
  rut:          "Ej: 12.345.678-9",
  gender:       "Masculino / Femenino / Otro",
  cellphone:    "Ej: +56912345678",
  class_name:   "Ej: 3°A Mecatrónica",
  age:          "Ej: 17",
  specialty:    "Ej: Mecatrónica",
  grade:        "Ej: 3°A",
};

// Auto-mapping: lowercased CSV/XLSX header → FieldKey
const AUTO_MAP: Record<string, FieldKey> = {
  nombre: "firstName",  nombres: "firstName",  "primer nombre": "firstName",
  name: "firstName",    firstname: "firstName", "first name": "firstName",
  apellido: "lastName", apellidos: "lastName",  lastname: "lastName",
  "last name": "lastName", surname: "lastName",
  email: "email",       correo: "email",        mail: "email",
  "correo electronico": "email", "correo electrónico": "email",
  rut: "rut",           "rut alumno": "rut",    "num doc": "rut",
  "documento": "rut",   "cedula": "rut",        "id": "rut",
  genero: "gender",     género: "gender",       sexo: "gender",
  gender: "gender",
  celular: "cellphone", telefono: "cellphone",  teléfono: "cellphone",
  fono: "cellphone",    movil: "cellphone",     móvil: "cellphone",
  cellphone: "cellphone", phone: "cellphone",   "num tel": "cellphone",
  clase: "class_name",  curso: "class_name",    "nombre curso": "class_name",
  class_name: "class_name", "clase curso": "class_name",
  edad: "age",          age: "age",             años: "age",
  especialidad: "specialty", specialty: "specialty", area: "specialty",
  carrera: "specialty", "área": "specialty",
  grado: "grade",       grade: "grade",         nivel: "grade",
  año: "grade",         ano: "grade",
  contrasena: "tempPassword", contraseña: "tempPassword",
  password: "tempPassword",   clave: "tempPassword",
  "temp password": "tempPassword",
};

type ColumnMapping = Record<FieldKey, string | null>;

interface StudentRow {
  _id:    number;
  _errors: Partial<Record<FieldKey, string>>;
  [header: string]: string | number | Partial<Record<FieldKey, string>>;
}

interface ImportResult {
  created: number;
  errors: Array<{ index: number; email: string; message: string }>;
}

// ── CSV parser ────────────────────────────────────────────────────

function parseCSV(raw: string): { headers: string[]; rows: Record<string, string>[] } {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const lines: string[] = [];
  let line = "";
  let inQuote = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '"') {
      if (inQuote && normalized[i + 1] === '"') { line += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "\n" && !inQuote) {
      lines.push(line); line = "";
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);

  function parseLine(l: string): string[] {
    const cells: string[] = [];
    let cell = ""; let inQ = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') {
        if (inQ && l[i + 1] === '"') { cell += '"'; i++; }
        else inQ = !inQ;
      } else if (c === "," && !inQ) {
        cells.push(cell.trim()); cell = "";
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim());
    return cells;
  }

  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
  const rows = lines.slice(1)
    .filter((l) => l.trim())
    .map((l) => {
      const cells = parseLine(l);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
      return row;
    });
  return { headers, rows };
}

// ── XLSX parser (uses SheetJS) ────────────────────────────────────

async function parseXLSX(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[sheetName];
  // raw: false → coerces everything to string; header:1 → array of arrays
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (data.length < 2) return { headers: [], rows: [] };

  const headerRow = (data[0] as unknown[]).map((h) =>
    String(h ?? "").toLowerCase().trim()
  );

  const rows: Record<string, string>[] = (data.slice(1) as unknown[][])
    .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
    .map((r) => {
      const row: Record<string, string> = {};
      headerRow.forEach((h, i) => { row[h] = String(r[i] ?? "").trim(); });
      return row;
    });

  return { headers: headerRow, rows };
}

// ── Validation ────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_GENDERS = new Set(["masculino", "femenino", "otro", "prefiero no decir"]);

function validateRow(
  row: Record<string, string>,
  mapping: ColumnMapping
): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  const get = (f: FieldKey) => (mapping[f] ? row[mapping[f]!] ?? "" : "").trim();

  if (!get("firstName")) errors.firstName = "Requerido";
  else if (get("firstName").length < 2) errors.firstName = "Mínimo 2 caracteres";

  if (!get("lastName")) errors.lastName = "Requerido";
  else if (get("lastName").length < 2) errors.lastName = "Mínimo 2 caracteres";

  if (!get("email")) errors.email = "Requerido";
  else if (!EMAIL_RE.test(get("email"))) errors.email = "Correo inválido";

  if (!get("tempPassword")) errors.tempPassword = "Requerido";
  else if (get("tempPassword").length < 8) errors.tempPassword = "Mínimo 8 caracteres";

  if (!get("rut")) errors.rut = "Requerido";
  else if (!isValidRut(get("rut"))) errors.rut = "RUT inválido";

  if (!get("gender")) errors.gender = "Requerido";
  else if (!VALID_GENDERS.has(get("gender").toLowerCase())) errors.gender = "Valor inválido";

  if (!get("cellphone")) errors.cellphone = "Requerido";
  else if (get("cellphone").replace(/\D/g, "").length < 7) errors.cellphone = "Teléfono muy corto";

  if (!get("class_name")) errors.class_name = "Requerido";

  const ageStr = get("age");
  if (!ageStr) {
    errors.age = "Requerido";
  } else {
    const ageNum = parseInt(ageStr, 10);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) errors.age = "Edad inválida (10–100)";
  }

  return errors;
}

// ── Props ─────────────────────────────────────────────────────────

interface Props { onClose: () => void; onSuccess: (count: number) => void; }

// ── Component ─────────────────────────────────────────────────────

export default function SmartImporter({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(
    Object.fromEntries(ALL_FIELDS.map((f) => [f, null])) as ColumnMapping
  );
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── File processing ───────────────────────────────────────────

  const applyParsed = (h: string[], rows: Record<string, string>[]) => {
    setHeaders(h);
    setRawRows(rows);
    const auto: ColumnMapping = Object.fromEntries(
      ALL_FIELDS.map((f) => [f, null])
    ) as ColumnMapping;
    h.forEach((header) => {
      const normalised = header.replace(/[^a-záéíóúñü ]/gi, "").toLowerCase();
      const key = AUTO_MAP[normalised];
      if (key && !auto[key]) auto[key] = header;
    });
    setMapping(auto);
    setStep("map");
  };

  const processFile = async (file: File) => {
    setParseError(null);
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm");
    const isCsv   = name.endsWith(".csv") || file.type === "text/csv";

    if (!isExcel && !isCsv) {
      setParseError("Solo se aceptan archivos .csv, .xlsx o .xls");
      return;
    }

    if (isExcel) {
      const buffer = await file.arrayBuffer();
      try {
        const { headers: h, rows } = await parseXLSX(buffer);
        if (h.length === 0) { setParseError("El archivo no tiene encabezados detectables."); return; }
        if (rows.length === 0) { setParseError("No se encontraron filas de datos."); return; }
        applyParsed(h, rows);
      } catch {
        setParseError("No se pudo leer el archivo Excel. Verifique que no esté protegido.");
      }
      return;
    }

    // CSV path
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows } = parseCSV(text);
      if (h.length === 0) { setParseError("El archivo está vacío o no tiene encabezados."); return; }
      if (rows.length === 0) { setParseError("No se encontraron filas de datos."); return; }
      applyParsed(h, rows);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const buildStudents = useCallback(() => {
    const built: StudentRow[] = rawRows.map((row, i) => {
      const errors = validateRow(row, mapping);
      return { _id: i, _errors: errors, ...row };
    });
    setStudents(built);
    setStep("validate");
  }, [rawRows, mapping]);

  const setCell = (rowId: number, field: FieldKey, value: string) => {
    setStudents((prev) => prev.map((s) => {
      if (s._id !== rowId) return s;
      const col = mapping[field];
      if (!col) return s;
      const updated = { ...s, [col]: value };
      updated._errors = validateRow(updated as Record<string, string>, mapping);
      return updated;
    }));
  };

  const removeRow = (rowId: number) =>
    setStudents((prev) => prev.filter((s) => s._id !== rowId));

  const validCount   = students.filter((s) => Object.keys(s._errors).length === 0).length;
  const invalidCount = students.length - validCount;

  const runImport = async () => {
    const valid = students.filter((s) => Object.keys(s._errors).length === 0);
    if (valid.length === 0) return;
    setImporting(true);
    setImportProgress(0);

    const payload = valid.map((s) => {
      const get = (f: FieldKey) => (mapping[f] ? (s[mapping[f]!] as string) ?? "" : "").trim();
      return {
        name:       `${get("firstName")} ${get("lastName")}`.trim(),
        email:      get("email"),
        password:   get("tempPassword"),
        rut:        get("rut"),
        gender:     get("gender"),
        cellphone:  get("cellphone"),
        class_name: get("class_name"),
        age:        parseInt(get("age"), 10) || 0,
        specialty:  get("specialty") || undefined,
        grade:      get("grade")     || undefined,
      };
    });

    const ticker = setInterval(() => {
      setImportProgress((p) => Math.min(p + 2, 90));
    }, 300);

    const raw = await bulkCreateStudents(payload);
    clearInterval(ticker);
    setImportProgress(100);

    if ("error" in raw && raw.error) {
      setImportResult({ created: 0, errors: [{ index: -1, email: "", message: raw.error }] });
    } else {
      const result = raw as ImportResult;
      setImportResult(result);
      if (result.created > 0) onSuccess(result.created);
    }
    setImporting(false);
    setStep("import");
  };

  // ── Step indicator ────────────────────────────────────────────

  const STEPS: { key: Step; label: string }[] = [
    { key: "upload",   label: "Cargar" },
    { key: "map",      label: "Mapear" },
    { key: "validate", label: "Validar" },
    { key: "import",   label: "Importar" },
  ];
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold">Importador Inteligente</h2>
              <p className="text-xs text-slate-500 mt-0.5">CSV y Excel (.xlsx/.xls) · incluye RUT, género, celular, clase, edad</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 flex-1 ${i <= stepIndex ? "text-cyan-600" : "text-slate-300"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                    i < stepIndex ? "bg-emerald-500 text-white" :
                    i === stepIndex ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-400"
                  }`}>
                    {i < stepIndex ? <CheckCircle2 size={12} /> : i + 1}
                  </div>
                  <span className="text-[11px] font-semibold hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-1 ${i < stepIndex ? "bg-emerald-300" : "bg-slate-100"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP 1: UPLOAD ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl py-16 cursor-pointer transition-all ${
                  dragging ? "border-cyan-400 bg-cyan-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Upload size={32} className={dragging ? "text-cyan-500" : "text-slate-300"} />
                <div className="text-center">
                  <p className="font-semibold text-slate-700 text-sm">Arrastra tu archivo aquí</p>
                  <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionar</p>
                </div>
                <span className="text-[10px] text-slate-300 bg-slate-100 px-3 py-1 rounded-full">
                  Formatos aceptados: .csv · .xlsx · .xls
                </span>
                <input
                  ref={fileRef} type="file"
                  accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
                />
              </div>

              {parseError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} /> {parseError}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-500 space-y-1.5">
                <p className="font-bold text-slate-600 mb-2 flex items-center gap-1.5"><FileText size={13} /> Columnas esperadas</p>
                <code className="block bg-white rounded-lg px-3 py-2 text-[11px] border border-slate-200 font-mono">
                  Nombre, Apellido, Email, Contraseña, RUT, Género, Celular, Clase, Edad, Especialidad, Grado
                </code>
                <p>El sistema detecta las columnas automáticamente. Campos obligatorios: <strong>Nombre, Apellido, Email, Contraseña, RUT, Género, Celular, Clase, Edad</strong>.</p>
              </div>
            </div>
          )}

          {/* ── STEP 2: MAP ── */}
          {step === "map" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
                <FileText size={15} />
                <span>Archivo cargado: <strong>{rawRows.length}</strong> filas detectadas</span>
              </div>

              <p className="text-xs text-slate-500">
                Verifica o ajusta el mapeo de columnas detectadas:
              </p>

              <div className="space-y-3">
                {ALL_FIELDS.map((field) => {
                  const isRequired = REQUIRED_FIELDS.includes(field);
                  const mapped = mapping[field];
                  const autoDetected = mapped !== null;
                  return (
                    <div key={field} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      autoDetected ? "border-emerald-200 bg-emerald-50/40" : isRequired ? "border-red-200 bg-red-50/30" : "border-slate-100"
                    }`}>
                      <div className="w-36 shrink-0">
                        <span className="text-xs font-bold text-slate-700">{FIELD_LABELS[field]}</span>
                        {isRequired && <span className="text-red-500 ml-0.5 text-[10px]">*</span>}
                        {autoDetected && <span className="ml-1.5 text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">Auto</span>}
                      </div>
                      <ChevronRight size={13} className="text-slate-300 shrink-0" />
                      <select
                        value={mapped ?? ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || null }))}
                        className={`flex-1 text-xs rounded-lg border px-2.5 py-2 outline-none bg-white ${
                          autoDetected ? "border-emerald-300 text-emerald-700 font-semibold" : "border-slate-200 text-slate-500"
                        }`}
                      >
                        <option value="">— No mapear —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {REQUIRED_FIELDS.some((f) => !mapping[f]) && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} />
                  Faltan campos obligatorios: {REQUIRED_FIELDS.filter((f) => !mapping[f]).map((f) => FIELD_LABELS[f]).join(", ")}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: VALIDATE ── */}
          {step === "validate" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 size={13} /> {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-red-500 font-bold">
                      <AlertTriangle size={13} /> {invalidCount} con errores
                    </span>
                  )}
                </div>
                <span className="text-slate-400">{students.length} filas total</span>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {ALL_FIELDS.map((f) => (
                          <th key={f} className="px-3 py-2 text-left font-bold text-slate-500 whitespace-nowrap">{FIELD_LABELS[f]}</th>
                        ))}
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((s) => {
                        const hasError = Object.keys(s._errors).length > 0;
                        return (
                          <tr key={s._id} className={hasError ? "bg-red-50/30" : "hover:bg-slate-50/60"}>
                            {ALL_FIELDS.map((field) => {
                              const col = mapping[field];
                              const val = col ? (s[col] as string) ?? "" : "";
                              const err = (s._errors as Partial<Record<FieldKey, string>>)[field];
                              return (
                                <td key={field} className={`px-2 py-1.5 ${err ? "bg-red-50" : ""}`}>
                                  <input
                                    value={val}
                                    onChange={(e) => col && setCell(s._id, field, e.target.value)}
                                    placeholder={col ? FIELD_PLACEHOLDERS[field] : "—"}
                                    disabled={!col}
                                    title={err}
                                    className={`w-full min-w-[80px] px-2 py-1 rounded-lg text-[11px] border outline-none bg-transparent ${
                                      err
                                        ? "border-red-300 text-red-700 placeholder-red-300"
                                        : "border-transparent focus:border-cyan-300 focus:bg-white"
                                    } ${!col ? "opacity-30 cursor-not-allowed" : ""}`}
                                  />
                                  {err && <p className="text-[9px] text-red-500 mt-0.5 px-1">{err}</p>}
                                </td>
                              );
                            })}
                            <td className="px-2 py-1.5">
                              <button onClick={() => removeRow(s._id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: IMPORT ── */}
          {step === "import" && (
            <div className="space-y-5 py-4">
              {importing && (
                <div className="text-center space-y-4">
                  <Loader2 size={40} className="animate-spin text-cyan-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">Creando cuentas de estudiantes…</p>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                  </div>
                  <p className="text-xs text-slate-400">{importProgress}% completado</p>
                </div>
              )}

              {importResult && !importing && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                    <div>
                      <p className="font-extrabold text-emerald-700 text-lg">{importResult.created} estudiantes creados</p>
                      {importResult.errors.length > 0 && (
                        <p className="text-xs text-amber-600 mt-0.5">{importResult.errors.length} filas no pudieron importarse</p>
                      )}
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                        <AlertTriangle size={13} /> Informe de errores
                      </p>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5 max-h-36 overflow-y-auto">
                        {importResult.errors.map((e) => (
                          <div key={e.index} className="text-xs text-red-700">
                            <span className="font-semibold">{e.email || `Fila ${e.index + 1}`}:</span> {e.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={onClose} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors">
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        {step !== "import" && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                if (step === "map") setStep("upload");
                else if (step === "validate") setStep("map");
              }}
              className={`flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors ${step === "upload" ? "invisible" : ""}`}
            >
              <ChevronLeft size={16} /> Atrás
            </button>

            {step === "upload" && (
              <span className="text-xs text-slate-400">Sube un archivo para continuar</span>
            )}

            {step === "map" && (
              <button
                onClick={buildStudents}
                disabled={REQUIRED_FIELDS.some((f) => !mapping[f])}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                Validar datos <ChevronRight size={16} />
              </button>
            )}

            {step === "validate" && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  Se importarán <strong>{validCount}</strong> filas válidas
                </span>
                <button
                  onClick={runImport}
                  disabled={validCount === 0}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <Users size={15} /> Importar {validCount} estudiantes
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
