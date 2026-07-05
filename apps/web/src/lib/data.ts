import type {
  UserProfile,
  AppNotification,
  FeedPost,
  TalentProfile,
  Conversation,
  ChatMessage,
  Badge,
  QueueRequest,
  SchoolStudent,
} from "./types";

// ═══════════════════════════════════════════════
// MODEL PROFILES – Student, Company, School
// ═══════════════════════════════════════════════

export const PROFILES: Record<string, UserProfile> = {
  student: {
    id: "u-student",
    role: "Estudiante",
    name: "Felipe Castro",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=face",
    email: "felipe.castro@classlink.cl",
    bio: "Estudiante de 3er año de Mecatrónica en CECJMC. Apasionado por la robótica educativa, IoT y la impresión 3D. Buscando prácticas en automatización.",
    location: "Lo Espejo, Santiago",
    joinedDate: "2024-08-15",
    specialty: "Mecatrónica",
    title: "Estudiante de Mecatrónica",
    skills: ["Arduino", "Raspberry Pi", "Python", "Impresión 3D", "MQTT", "Electrónica Básica"],
    xp: 980,
    xpMax: 1000,
    level: 5,
    streak: 4,
    gpa: 86.0,
    availability: "Disponible",
    certifications: ["Arduino Starter Certified"],
    yearsExperience: 0,
    softSkills: ["Trabajo en equipo", "Puntualidad", "Comunicacion asertiva", "Resolucion de problemas", "Proactividad"],
    attendance: 94,
    schoolReport: {
      period: "Primer Semestre 2026",
      summary: "Felipe ha demostrado un desempeño académico sólido durante el primer semestre, destacándose en los módulos de electrónica y programación de microcontroladores. Su participación activa en clases y proyectos grupales ha contribuido positivamente al ambiente del taller.",
      teacherComment: "Felipe es un alumno comprometido, con gran curiosidad técnica y capacidad para resolver problemas. Se le recomienda continuar desarrollando sus habilidades en programación avanzada.",
      behaviorNote: "Comportamiento ejemplar. Respeta las normas del taller, colabora con sus compañeros y demuestra responsabilidad en el uso de los equipos.",
    },
    portfolio: [
      { id: "pf1", title: "Robot Seguidor de Línea", description: "Robot autónomo con sensores IR y control PID.", tags: ["Arduino", "Robótica", "PID"], image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop" },
      { id: "pf2", title: "Estación Meteorológica IoT", description: "Monitoreo de temperatura, humedad y presión con MQTT.", tags: ["IoT", "MQTT", "Python"], image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop" },
    ],
  },
  company: {
    id: "u-company",
    role: "Empresa",
    name: "MetalChile S.A.",
    avatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop",
    email: "rrhh@metalchile.cl",
    bio: "Empresa líder en fabricación de estructuras metálicas y automatización industrial. Buscamos talento técnico comprometido con la excelencia y la innovación.",
    location: "Quilicura, Santiago",
    joinedDate: "2025-01-10",
    rut: "76.543.210-K",
    companyName: "MetalChile S.A.",
    industry: "Fabricación Metálica e Industria",
    employeeCount: "200-500",
    website: "metalchile.cl",
    openPositions: 5,
    vacancies: [
      {
        id: "v1",
        title: "Pasante Soldadura TIG",
        department: "Producción",
        type: "Pasantia",
        status: "Activa",
        duration: "3 meses",
        paid: true,
        salary: "$280.000/mes",
        description: "Buscamos estudiantes de soldadura con conocimientos en TIG acero inoxidable. El pasante apoyará la línea de producción de estructuras metálicas bajo supervisión de un maestro soldador certificado.",
        applicants: [
          { id: "a1", name: "Marco Rivera", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", specialty: "Soldadura", matchScore: 92, status: "pending" },
          { id: "a2", name: "Sofia Vargas", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face", specialty: "Soldadura", matchScore: 87, status: "accepted" },
          { id: "a3", name: "Roberto Vásquez", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop&crop=face", specialty: "Soldadura", matchScore: 79, status: "pending" },
        ],
      },
      {
        id: "v2",
        title: "Técnico Mecatrónico Jr.",
        department: "Automatización",
        type: "Tiempo completo",
        status: "Activa",
        duration: "Indefinido",
        paid: true,
        salary: "$650.000/mes",
        description: "Requerimos técnico mecatrónico para mantenimiento de líneas automatizadas. Se valorará experiencia en PLC Siemens y robótica industrial. Beneficios: bono de desempeño y capacitación continua.",
        applicants: [
          { id: "a4", name: "Alejandro Mendoza", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", specialty: "Mecatrónica", matchScore: 95, status: "accepted" },
          { id: "a5", name: "Felipe Castro", avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face", specialty: "Mecatrónica", matchScore: 68, status: "pending" },
        ],
      },
      {
        id: "v3",
        title: "Pasante Electricidad Industrial",
        department: "Mantención",
        type: "Pasantia",
        status: "Activa",
        duration: "4 meses",
        paid: false,
        description: "Pasantía en el área de mantención eléctrica. El estudiante aprenderá sobre tableros industriales, motores trifásicos y protecciones eléctricas en ambiente real de planta.",
        applicants: [
          { id: "a6", name: "Valentina Ruiz", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", specialty: "Electricidad", matchScore: 84, status: "pending" },
          { id: "a7", name: "Pedro Sanchez", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", specialty: "Electricidad", matchScore: 62, status: "rejected" },
        ],
      },
      {
        id: "v4",
        title: "Operador CNC Ebanistería",
        department: "Carpintería Industrial",
        type: "Tiempo completo",
        status: "Cerrada",
        duration: "Indefinido",
        paid: true,
        salary: "$580.000/mes",
        description: "Posición cubierta. Operador de router CNC para fabricación de muebles en serie. Se requería experiencia en software de diseño CAD/CAM y acabados de madera.",
        applicants: [
          { id: "a8", name: "Camila Ortiz", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face", specialty: "Ebanistería", matchScore: 88, status: "accepted" },
        ],
      },
    ],
  },
  school: {
    id: "u-school",
    role: "Colegio",
    name: "CECJMC",
    avatar: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop",
    email: "coordinacion@cecjmc.cl",
    bio: "Centro Educacional Cardenal José María Caro. Formación técnico-profesional en Lo Espejo con especialidades en Mecatrónica, Soldadura, Electricidad, Ebanistería e Informática.",
    location: "Lo Espejo, Santiago",
    joinedDate: "2024-01-01",
    schoolName: "Centro Educacional Cardenal José María Caro",
    studentCount: 480,
    allianceCount: 18,
    employabilityRate: 84.7,
  },
};

// ═══════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════

export const NOTIFICATIONS: AppNotification[] = [
  { id: "n1", title: "Solicitud de contacto", description: "MetalChile S.A. desea contactar a 3 estudiantes de Soldadura.", time: "Hace 5 min", read: false, forRoles: ["Colegio"] },
  { id: "n2", title: "Nueva alianza pendiente", description: "Innova Green Ltda. quiere unirse al banco de talento.", time: "Hace 20 min", read: false, forRoles: ["Colegio"] },
  { id: "n3", title: "Solicitud de prácticas", description: "AutoParts Chile busca 2 pasantes de Mecatrónica.", time: "Hace 1 hora", read: false, forRoles: ["Colegio"] },
  { id: "n4", title: "¡Nueva Insignia!", description: "Has ganado la insignia Maestro en Soldadura TIG.", time: "Hace 10 min", read: false, forRoles: ["Estudiante"] },
  { id: "n5", title: "Reto completado", description: "Completaste el reto semanal de Mecatrónica. +150 XP", time: "Hace 30 min", read: false, forRoles: ["Estudiante"] },
  { id: "n6", title: "Empresa vio tu perfil", description: "MetalChile S.A. revisó tu portafolio.", time: "Hace 1 hora", read: false, forRoles: ["Estudiante"] },
  { id: "n7", title: "Perfil visto", description: "4 empresas vieron tu perfil esta semana.", time: "Hace 2 horas", read: true, forRoles: ["Egresado"] },
  { id: "n8", title: "Nuevo candidato destacado", description: "Alejandro Mendoza cumple 95% de tu búsqueda.", time: "Hace 15 min", read: false, forRoles: ["Empresa"] },
  { id: "n9", title: "Acceso aprobado", description: "CECJMC aprobó tu solicitud de acceso al talento.", time: "Hace 45 min", read: false, forRoles: ["Empresa"] },
  { id: "n10", title: "Aplicación recibida", description: "Diego Herrera aplicó a Soldador TIG Junior.", time: "Hace 2 horas", read: false, forRoles: ["Empresa"] },
  { id: "n11", title: "Alianza activa", description: "Tu alianza con Innova Green Ltda. fue aprobada.", time: "Hace 1 día", read: true, forRoles: ["Colegio"] },
  { id: "n12", title: "Nuevo mensaje", description: "Frío del Sur S.A. te envió un mensaje.", time: "Hace 3 horas", read: false, forRoles: ["Egresado"] },
];

// ═══════════════════════════════════════════════
// FEED POSTS
// ═══════════════════════════════════════════════

export const FEED_POSTS: FeedPost[] = [
  {
    id: "p1", title: "Estructura Tubular 400x en Acero Inoxidable",
    description: "Finalización de la estructura principal para el prototipo de movilidad sostenible. Soldadura TIG calibre 16.",
    author: "Marco Rivera", authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", authorRole: "Estudiante",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop", tag: "Soldadura TIG", likes: 24, liked: false, comments: 8, category: "publicacion", createdAt: "2026-03-22",
  },
  {
    id: "p2", title: "Ensamble Artesanal Cola de Milano en Roble",
    description: "Técnica de cola de milano realizada completamente a mano. Tres semanas de trabajo meticuloso.",
    author: "Camila Ortiz", authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face", authorRole: "Estudiante",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop", tag: "Ebanistería", likes: 18, liked: false, comments: 5, category: "portafolio", createdAt: "2026-03-21",
  },
  {
    id: "p3", title: "Sistema SCADA para Monitoreo de Planta Solar",
    description: "Monitoreo en tiempo real de paneles solares con ESP32 y dashboard React. Incluye alertas automáticas.",
    author: "Alejandro Mendoza", authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", authorRole: "Egresado",
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop", tag: "Mecatrónica", likes: 31, liked: false, comments: 12, category: "portafolio", createdAt: "2026-03-20",
  },
  {
    id: "p4", title: "Diagnóstico OBD-II en Motor Common Rail",
    description: "Análisis de inyectores y presión de riel en motor TDI. Herramienta: VCDS + Bosch FSA 740.",
    author: "Ana Beltrán", authorAvatar: "https://images.unsplash.com/photo-1558203728-00f45181dd84?w=100&h=100&fit=crop&crop=face", authorRole: "Egresado",
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop", tag: "Automotriz", likes: 14, liked: false, comments: 4, category: "portafolio", createdAt: "2026-03-19",
  },
  {
    id: "p5", title: "Feria Técnica CECJMC 2026 — ¡Inscríbete!",
    description: "Participa en la feria de innovación técnica del 15 al 18 de abril. Inscripciones abiertas para todas las especialidades.",
    author: "CECJMC", authorAvatar: "https://images.unsplash.com/photo-1562774053-701939374585?w=100&h=100&fit=crop", authorRole: "Colegio",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop", tag: "Evento", likes: 52, liked: false, comments: 23, category: "publicacion", createdAt: "2026-03-18",
  },
  {
    id: "p6", title: "Tablero de Distribución NEC — Casa de 2 Pisos",
    description: "Cableado completo para vivienda según norma NEC. Tablero de distribución 12 circuitos con diferencial.",
    author: "Valentina Ruiz", authorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", authorRole: "Estudiante",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop", tag: "Electricidad", likes: 11, liked: false, comments: 3, category: "portafolio", createdAt: "2026-03-17",
  },
  {
    id: "p7", title: "Cámara Frigorífica -18°C para Supermercado",
    description: "Instalación y puesta en marcha de cámara de congelados con R404A. Capacidad 40m³.",
    author: "Bastián Torres", authorAvatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&crop=face", authorRole: "Estudiante",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop", tag: "Refrigeración", likes: 9, liked: false, comments: 2, category: "portafolio", createdAt: "2026-03-16",
  },
  {
    id: "p8", title: "Sistema de Gestión Escolar en Python/Flask",
    description: "Aplicación web para control de asistencia, notas y reportes. Base de datos MySQL. Deploy en servidor Linux.",
    author: "Javiera Muñoz", authorAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face", authorRole: "Estudiante",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop", tag: "Informática", likes: 16, liked: false, comments: 6, category: "portafolio", createdAt: "2026-03-15",
  },
  {
    id: "p9", title: "Práctica Profesional en MetalChile S.A.",
    description: "Feliz de anunciar que inicié mis prácticas profesionales en MetalChile. Trabajando en la celda de soldadura robotizada.",
    author: "Sofia Vargas", authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face", authorRole: "Estudiante",
    image: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&h=400&fit=crop", tag: "Soldadura TIG", likes: 38, liked: false, comments: 15, category: "publicacion", createdAt: "2026-03-14",
  },
  {
    id: "p10", title: "Buscamos Técnico Electricista — Innova Green",
    description: "Innova Green Ltda. busca 2 técnicos electricistas con conocimiento en instalaciones solares. Postula en nuestra web.",
    author: "Innova Green Ltda.", authorAvatar: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=100&h=100&fit=crop", authorRole: "Empresa",
    image: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&h=400&fit=crop", tag: "Electricidad", likes: 29, liked: false, comments: 10, category: "oferta", createdAt: "2026-03-13",
    offerSpecialty: "Electricidad", offerDuration: "6 meses", offerPaid: true, offerSalary: "$420.000/mes", offerLocation: "Pudahuel, Santiago",
  },
  {
    id: "p13", title: "Pasantía Mecatrónica — Tech Solutions S.A.",
    description: "Buscamos 2 estudiantes de Mecatrónica para pasantía en planta de automatización. Trabajarás con robots FANUC y PLCs Siemens en proyectos reales de producción.",
    author: "Tech Solutions S.A.", authorAvatar: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop", authorRole: "Empresa",
    image: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&h=400&fit=crop", tag: "Mecatrónica", likes: 34, liked: false, comments: 14, category: "oferta", createdAt: "2026-04-01",
    offerSpecialty: "Mecatronica", offerDuration: "3 meses", offerPaid: true, offerSalary: "$320.000/mes", offerLocation: "Quilicura, Santiago",
  },
  {
    id: "p14", title: "Técnico Soldador — AutoParts Ltda.",
    description: "AutoParts Ltda. requiere soldadores TIG y MIG/MAG para línea de producción de repuestos automotrices. Turno fijo de lunes a viernes.",
    author: "AutoParts Ltda.", authorAvatar: "https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=100&h=100&fit=crop", authorRole: "Empresa",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop", tag: "Soldadura", likes: 19, liked: false, comments: 7, category: "oferta", createdAt: "2026-04-02",
    offerSpecialty: "Soldadura", offerDuration: "Tiempo completo", offerPaid: true, offerSalary: "$580.000/mes", offerLocation: "Maipú, Santiago",
  },
  {
    id: "p11", title: "Planos Arquitectónicos con Revit — Proyecto Habitacional",
    description: "Modelado BIM de conjunto habitacional de 24 unidades en San Bernardo. Incluye instalaciones sanitarias y eléctricas.",
    author: "Lucas Espinoza", authorAvatar: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=100&h=100&fit=crop&crop=face", authorRole: "Estudiante",
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=400&fit=crop", tag: "Construcción", likes: 7, liked: false, comments: 1, category: "portafolio", createdAt: "2026-03-12",
  },
  {
    id: "p12", title: "Inspector CWI — Gasoducto Maipú-Pudahuel",
    description: "Supervisando soldaduras en tubería API 5L para red de gas natural. Ensayos RT y UT en proceso.",
    author: "Roberto Vásquez", authorAvatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop&crop=face", authorRole: "Egresado",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop", tag: "Soldadura TIG", likes: 22, liked: false, comments: 7, category: "publicacion", createdAt: "2026-03-11",
  },
];

// ═══════════════════════════════════════════════
// TALENT PROFILES
// ═══════════════════════════════════════════════

export const TALENT_PROFILES: TalentProfile[] = [
  {
    id: "t1", name: "Alejandro Mendoza", role: "Egresado", title: "Técnico Mecatrónico",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    skills: ["PLC Siemens S7", "Arduino", "SolidWorks", "Python", "IoT", "SCADA", "TIA Portal"],
    specialty: "Mecatrónica", bio: "Egresado 2024 con experiencia en automatización industrial e IoT para manufactura.", location: "Lo Espejo, Santiago",
    availability: "Disponible", matchScore: 95, xp: 3600, level: 15, gpa: 92.5,
    certifications: ["Siemens S7-1200 Certified", "Arduino Professional", "OSHA 30"],
    yearsExperience: 1,
    portfolio: [
      { id: "pf1", title: "Sistema SCADA Planta Solar", description: "Monitoreo en tiempo real con ESP32 y React.", tags: ["SCADA", "IoT", "React"] },
      { id: "pf2", title: "Brazo Robótico 6DOF", description: "Control cinemático inverso con visión artificial.", tags: ["Robótica", "Python", "OpenCV"] },
    ],
  },
  {
    id: "t2", name: "Elena Rodriguez", role: "Egresado", title: "Técnica Electricista Industrial",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    skills: ["Instalaciones Industriales", "NEC 2020", "Tableros Eléctricos", "AutoCAD Electrical", "Energía Solar", "VFD"],
    specialty: "Electricidad", bio: "Egresada con experiencia en instalaciones industriales y proyectos de energía renovable en Santiago.", location: "Maipú, Santiago",
    availability: "Disponible", matchScore: 88, xp: 4200, level: 18, gpa: 95.0,
    certifications: ["NEC Certified", "AutoCAD Electrical Professional", "Instaladora Solar SEC"],
    yearsExperience: 2,
    portfolio: [
      { id: "pf3", title: "Planta Procesadora NEC", description: "Instalación eléctrica completa para fábrica de alimentos.", tags: ["Industrial", "NEC"] },
      { id: "pf4", title: "Sistema Fotovoltaico 10kW", description: "Instalación residencial con respaldo de baterías.", tags: ["Solar", "Renovable"] },
    ],
  },
  {
    id: "t3", name: "Diego Herrera", role: "Egresado", title: "Soldador Certificado AWS",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
    skills: ["TIG", "MIG/MAG", "Plasma", "SMAW", "Lectura de Planos", "AWS D1.1", "Metalografía"],
    specialty: "Soldadura", bio: "Soldador certificado AWS con 3 años de experiencia en estructuras metálicas y tuberías de presión.", location: "Pudahuel, Santiago",
    availability: "En prácticas", matchScore: 82, xp: 5100, level: 22, gpa: 88.0,
    certifications: ["AWS D1.1 Structural", "CWI Level I", "OSHA 30"],
    yearsExperience: 3,
    portfolio: [
      { id: "pf5", title: "Estructura Puente Peatonal", description: "Soldadura TIG en acero A36 para pasarela municipal.", tags: ["Estructural", "TIG"] },
      { id: "pf6", title: "Tanque de Agua 50m3", description: "Construcción y soldadura de depósito inoxidable.", tags: ["INOX", "TIG"] },
    ],
  },
  {
    id: "t4", name: "Valentina Ruiz", role: "Estudiante", title: "Técnica en Electricidad",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    skills: ["Cableado Residencial", "NEC 2020", "Tableros", "Domótica", "Energía Solar", "Iluminación LED"],
    specialty: "Electricidad", bio: "Estudiante de 3er año de electricidad con enfoque en energías renovables y domótica.", location: "La Florida, Santiago",
    availability: "Disponible", matchScore: 78, xp: 1800, level: 9, gpa: 90.0,
    certifications: ["Electricidad Residencial Nivel I"],
    portfolio: [
      { id: "pf7", title: "Casa Inteligente KNX", description: "Sistema domótico con Home Assistant y sensores KNX.", tags: ["IoT", "Domótica", "KNX"] },
    ],
  },
  {
    id: "t5", name: "Camila Ortiz", role: "Estudiante", title: "Técnica en Ebanistería",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
    skills: ["Cola de Milano", "Lacado UV", "Diseño 3D SketchUp", "CNC Router", "Restauración", "Torneado"],
    specialty: "Ebanistería", bio: "Ebanista en formación con pasión por técnicas tradicionales y fabricación CNC. Ganadora feria técnica 2025.", location: "San Miguel, Santiago",
    availability: "Disponible", matchScore: 72, xp: 1200, level: 7, gpa: 87.0,
    certifications: ["Ebanistería Básica INACAP"],
    portfolio: [
      { id: "pf8", title: "Mesa de Roble con Incrustaciones", description: "Ensamble cola de milano con acabado natural.", tags: ["Madera", "Artesanal", "Roble"] },
      { id: "pf9", title: "Armario Empotrado CNC", description: "Diseño paramétrico en SketchUp y corte CNC router.", tags: ["CNC", "SketchUp", "MDF"] },
    ],
  },
  {
    id: "t6", name: "Andres Lopez", role: "Egresado", title: "Técnico Mecatrónico Sr.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    skills: ["PLC Allen Bradley", "Arduino", "CAD/CAM", "Robótica Industrial Fanuc", "HMI", "Neumática"],
    specialty: "Mecatrónica", bio: "Técnico mecatrónico con 4 años en líneas de producción automotriz y electrónica de consumo.", location: "Quilicura, Santiago",
    availability: "No disponible", matchScore: 90, xp: 6800, level: 25, gpa: 94.0,
    certifications: ["Rockwell Automation Certified", "Fanuc Robotics Level II", "Six Sigma Green Belt"],
    yearsExperience: 4,
    portfolio: [
      { id: "pf10", title: "Celda Robótica Automotriz", description: "Automatización con 4 robots Fanuc M-10iA.", tags: ["Robótica", "PLC", "Fanuc"] },
      { id: "pf11", title: "Sistema HMI Planta Alimentos", description: "Interfaz operador SCADA para línea de envasado.", tags: ["HMI", "SCADA", "WinCC"] },
    ],
  },
  {
    id: "t7", name: "Sofia Vargas", role: "Estudiante", title: "Técnica en Soldadura",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face",
    skills: ["TIG Aluminio", "MIG/MAG", "Lectura de Planos", "Metalografía", "Corte Plasma"],
    specialty: "Soldadura", bio: "Estudiante de 4to año destacada en soldadura TIG de aluminio y acero inoxidable.", location: "Lo Prado, Santiago",
    availability: "Disponible", matchScore: 75, xp: 1600, level: 8, gpa: 91.0,
    certifications: ["Soldadura TIG Nivel I AWS"],
    portfolio: [
      { id: "pf12", title: "Depósito Aluminio 6061", description: "Soldadura TIG orbital para industria alimentaria.", tags: ["TIG", "Aluminio", "Alimentaria"] },
    ],
  },
  {
    id: "t8", name: "Carlos Mendez", role: "Egresado", title: "Técnico Electricista Senior",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
    skills: ["Alta Tensión", "Transformadores", "Protecciones Eléctricas", "ETAP", "AutoCAD Electrical", "Subestaciones"],
    specialty: "Electricidad", bio: "Electricista senior especializado en subestaciones de media tensión y sistemas de protección eléctrica.", location: "Estación Central, Santiago",
    availability: "Disponible", matchScore: 85, xp: 7200, level: 28, gpa: 93.0,
    certifications: ["ETAP Certified", "Alta Tensión Nivel III SEC", "NEC Master Electrician"],
    yearsExperience: 5,
    portfolio: [
      { id: "pf13", title: "Subestación 34.5kV Maipú", description: "Diseño, montaje y comisionamiento de subestación industrial.", tags: ["Potencia", "ETAP", "34.5kV"] },
    ],
  },
  {
    id: "t9", name: "Felipe Castro", role: "Estudiante", title: "Técnico en Mecatrónica",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=face",
    skills: ["Arduino", "Raspberry Pi", "Python", "Impresión 3D", "Electrónica Básica", "MQTT"],
    specialty: "Mecatrónica", bio: "Estudiante de mecatrónica apasionado por la robótica educativa y la impresión 3D.", location: "Lo Espejo, Santiago",
    availability: "Disponible", matchScore: 68, xp: 980, level: 5, gpa: 86.0,
    certifications: [],
    portfolio: [
      { id: "pf14", title: "Robot Seguidor de Línea", description: "Robot autónomo con sensores IR y control PID.", tags: ["Arduino", "Robótica", "PID"] },
      { id: "pf15", title: "Estación Meteorológica IoT", description: "Monitoreo de temperatura y humedad con MQTT.", tags: ["IoT", "MQTT", "Python"] },
    ],
  },
  {
    id: "t10", name: "Javiera Munoz", role: "Estudiante", title: "Técnica en Informática",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face",
    skills: ["Python", "JavaScript", "HTML/CSS", "Redes TCP/IP", "SQL", "Soporte Técnico", "Windows Server"],
    specialty: "Informática", bio: "Técnica en informática con enfoque en desarrollo web y administración de redes locales.", location: "Cerrillos, Santiago",
    availability: "Disponible", matchScore: 70, xp: 1100, level: 6, gpa: 89.0,
    certifications: ["CCNA Introduction to Networks", "Google IT Support"],
    portfolio: [
      { id: "pf16", title: "Sistema Web Gestión Escolar", description: "Aplicación Python/Flask con base de datos MySQL.", tags: ["Python", "Flask", "MySQL"] },
      { id: "pf17", title: "Red LAN Empresarial con VLANs", description: "Implementación de red con VLANs y control de acceso.", tags: ["Redes", "VLAN", "Cisco"] },
    ],
  },
  {
    id: "t11", name: "Bastian Torres", role: "Estudiante", title: "Técnico en Refrigeración",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop&crop=face",
    skills: ["Sistemas Split", "Refrigeración Comercial", "Carga de Gas R410A", "Diagnóstico HVAC", "Bombas de Calor", "Vacuómetro"],
    specialty: "Refrigeración", bio: "Técnico en refrigeración y climatización con experiencia en mantenimiento de cámaras frigoríficas.", location: "Pedro Aguirre Cerda, Santiago",
    availability: "En prácticas", matchScore: 65, xp: 950, level: 5, gpa: 85.0,
    certifications: ["Técnico HVAC Nivel I"],
    portfolio: [
      { id: "pf18", title: "Cámara Frigorífica -18°C", description: "Instalación y puesta en marcha para supermercado.", tags: ["Refrigeración", "R404A", "Comercial"] },
    ],
  },
  {
    id: "t12", name: "Lucas Espinoza", role: "Estudiante", title: "Técnico en Construcción",
    avatar: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=200&h=200&fit=crop&crop=face",
    skills: ["AutoCAD 2D/3D", "Revit BIM", "Hormigón Armado", "Instalaciones Sanitarias", "Cubicación", "Topografía"],
    specialty: "Construcción", bio: "Estudiante de construcción civil con conocimientos en gestión de obra y dibujo arquitectónico BIM.", location: "San Bernardo, Santiago",
    availability: "Disponible", matchScore: 60, xp: 820, level: 5, gpa: 84.0,
    certifications: ["AutoCAD 2D Nivel II"],
    portfolio: [
      { id: "pf19", title: "Planos Casa 100m2 BIM", description: "Proyecto completo de vivienda social con AutoCAD y Revit.", tags: ["AutoCAD", "Revit", "Vivienda"] },
    ],
  },
  {
    id: "t13", name: "Ana Beltran", role: "Egresado", title: "Técnica Automotriz",
    avatar: "https://images.unsplash.com/photo-1558203728-00f45181dd84?w=200&h=200&fit=crop&crop=face",
    skills: ["Diagnóstico OBD-II", "Motor Combustión Interna", "Frenos ABS", "Suspensión", "Electricidad Automotriz", "Scanner Profesional"],
    specialty: "Automotriz", bio: "Técnica automotriz egresada 2023, especializada en diagnóstico electrónico y mecánica preventiva.", location: "Pudahuel, Santiago",
    availability: "Disponible", matchScore: 80, xp: 3200, level: 14, gpa: 88.5,
    certifications: ["Mecánica Automotriz INACAP", "Técnico Diagnóstico OBD"],
    yearsExperience: 2,
    portfolio: [
      { id: "pf20", title: "Diagnóstico Motor Common Rail", description: "Análisis de inyectores y presión de riel en motor TDI.", tags: ["Diesel", "OBD", "Common Rail"] },
      { id: "pf21", title: "Revisión Técnica 90 Puntos", description: "Protocolo de inspección completo para vehículos livianos.", tags: ["Preventivo", "Inspección", "OBD-II"] },
    ],
  },
  {
    id: "t14", name: "Roberto Vasquez", role: "Egresado", title: "Soldador Inspector AWS CWI",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=face",
    skills: ["TIG Orbital", "Inspección Visual CWI", "Radiografía Industrial", "ASME IX", "AWS D1.1", "Ensayos No Destructivos"],
    specialty: "Soldadura", bio: "Soldador inspector certificado CWI con experiencia en proyectos de oil & gas y plantas industriales.", location: "Maipú, Santiago",
    availability: "Disponible", matchScore: 87, xp: 5800, level: 24, gpa: 90.0,
    certifications: ["AWS CWI Certified", "ASME IX", "Nivel II RT/UT/PT"],
    yearsExperience: 4,
    portfolio: [
      { id: "pf22", title: "Gasoducto DN200 API 5L", description: "Supervisión y control de calidad de soldaduras en tubería.", tags: ["Oil&Gas", "ASME", "CWI"] },
    ],
  },
  {
    id: "t15", name: "Daniela Reyes", role: "Egresado", title: "Técnica Ebanistería Industrial",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
    skills: ["CNC Router Multicam", "Fusion 360", "Lacado Industrial", "Tapizado", "Restauración Patrimonial", "Barnizado UV"],
    specialty: "Ebanistería", bio: "Ebanista con 3 años en industria del mueble, especializada en producción CNC y acabados de alta calidad.", location: "Macul, Santiago",
    availability: "No disponible", matchScore: 77, xp: 4500, level: 19, gpa: 89.0,
    certifications: ["CNC Router Nivel II", "Tapizado Profesional SENCE"],
    yearsExperience: 3,
    portfolio: [
      { id: "pf23", title: "Colección Muebles Nórdicos", description: "8 piezas en pino oregón con acabado natural mate.", tags: ["CNC", "Nórdico", "Pino"] },
      { id: "pf24", title: "Restauración Sillón Colonial", description: "Recuperación de sillón siglo XIX para museo regional.", tags: ["Restauración", "Patrimonio", "Tapizado"] },
    ],
  },
  {
    id: "t16", name: "Marco Rivera", role: "Estudiante", title: "Técnico en Soldadura",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
    skills: ["Soldadura TIG", "Lectura de Planos", "Seguridad Industrial", "Corte con Disco"],
    specialty: "Soldadura", bio: "Estudiante de 4to año de Soldadura en CECJMC. Especialización en TIG acero inoxidable.", location: "Lo Espejo, Santiago",
    availability: "Disponible", matchScore: 66, xp: 1350, level: 7, gpa: 88.0,
    certifications: ["Soldadura Básica SENCE"],
    portfolio: [
      { id: "pf25", title: "Estructura Tubular Movilidad", description: "Estructura en acero inoxidable calibre 16 con TIG.", tags: ["TIG", "Estructural", "INOX"] },
    ],
  },
  {
    id: "t17", name: "Pedro Sanchez", role: "Estudiante", title: "Técnico en Electricidad",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    skills: ["Cableado Residencial", "Tableros", "NEC Básico", "Mediciones Eléctricas", "Seguridad Eléctrica"],
    specialty: "Electricidad", bio: "Estudiante de electricidad con interés en instalaciones industriales y fotovoltaica.", location: "Lo Espejo, Santiago",
    availability: "Disponible", matchScore: 62, xp: 780, level: 4, gpa: 83.0,
    certifications: [],
    portfolio: [
      { id: "pf26", title: "Instalación Residencial NEC", description: "Cableado para casa de 2 pisos con 12 circuitos.", tags: ["NEC", "Residencial", "Tablero"] },
    ],
  },
];

// ═══════════════════════════════════════════════
// CONVERSATIONS & CHAT
// ═══════════════════════════════════════════════

export const CONVERSATIONS: Conversation[] = [
  { id: "c1", name: "MetalChile S.A.", initials: "MC", role: "Empresa - Reclutador", avatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop", lastMessage: "¿Revisaste la propuesta de prácticas?", lastTime: "Ahora", unread: 2, online: true },
  { id: "c2", name: "Elena Rodriguez", initials: "ER", role: "Ing. Electricista", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", lastMessage: "Excelente avance en el módulo PLC!", lastTime: "10:24", unread: 0, online: true },
  { id: "c3", name: "Coordinación CECJMC", initials: "CE", role: "Colegio - Coordinador", avatar: "https://images.unsplash.com/photo-1562774053-701939374585?w=100&h=100&fit=crop", lastMessage: "El cronograma de prácticas está actualizado.", lastTime: "Ayer", unread: 0, online: false },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  { id: "m1", conversationId: "c1", sender: "them", text: "Hola Felipe! Revisamos tu portafolio y nos impresionó el proyecto del robot.", time: "10:15" },
  { id: "m2", conversationId: "c1", sender: "them", text: "Tenemos una vacante de pasantía en automatización que podría interesarte.", time: "10:16" },
  { id: "m3", conversationId: "c1", sender: "me", text: "Muchas gracias! Me encantaría saber más sobre la posición.", time: "10:18" },
  { id: "m4", conversationId: "c1", sender: "them", text: "¿Revisaste la propuesta de prácticas?", time: "10:20" },
  { id: "m5", conversationId: "c2", sender: "them", text: "Hola! Vi tu proyecto de la estación meteorológica IoT.", time: "09:30" },
  { id: "m6", conversationId: "c2", sender: "me", text: "Gracias Elena! Fue bastante retador pero aprendí mucho sobre MQTT.", time: "09:35" },
  { id: "m7", conversationId: "c2", sender: "them", text: "Excelente avance en el módulo PLC!", time: "10:24" },
  { id: "m8", conversationId: "c3", sender: "them", text: "Recordatorio: el cronograma de prácticas para abril ya está disponible.", time: "Ayer" },
  { id: "m9", conversationId: "c3", sender: "me", text: "Perfecto, lo reviso hoy mismo. Gracias!", time: "Ayer" },
];

// ═══════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════

export const BADGES: Badge[] = [
  { id: "b1", name: "Soldadura TIG Nivel I", icon: "flame", earned: true, date: "2026-02-15", description: "Completar módulo básico de soldadura TIG" },
  { id: "b2", name: "Ebanistería Básica", icon: "hammer", earned: true, date: "2026-01-20", description: "Dominar técnicas básicas de carpintería" },
  { id: "b3", name: "Electricidad Residencial", icon: "zap", earned: true, date: "2026-03-01", description: "Aprobar evaluación de instalaciones residenciales" },
  { id: "b4", name: "Seguridad Industrial", icon: "shield-check", earned: true, date: "2026-03-10", description: "Certificación en normas de seguridad OSHA" },
  { id: "b5", name: "Mecatrónica Avanzada", icon: "cpu", earned: false, description: "Completar proyecto integrador de mecatrónica" },
  { id: "b6", name: "Proyecto Final", icon: "trophy", earned: false, description: "Presentar proyecto de graduación" },
  { id: "b7", name: "Pasantía Completada", icon: "briefcase", earned: false, description: "Completar 480 horas de práctica profesional" },
  { id: "b8", name: "Mentor Comunitario", icon: "users", earned: false, description: "Mentorear a 3 estudiantes de nivel inferior" },
  { id: "b9", name: "Informática Nivel I", icon: "monitor", earned: false, description: "Aprobar módulo básico de programación" },
  { id: "b10", name: "Refrigeración Básica", icon: "thermometer", earned: false, description: "Completar módulo de sistemas de refrigeración" },
];

// ═══════════════════════════════════════════════
// QUEUE REQUESTS
// ═══════════════════════════════════════════════

export const QUEUE_REQUESTS: QueueRequest[] = [
  { id: "q1", title: "Validación de Prácticas: MetalChile S.A.", description: "5 estudiantes esperando confirmación para mayo 2026", author: "MetalChile S.A.", urgent: true, type: "practica", date: "2026-03-24" },
  { id: "q2", title: "Nueva Alianza: Innova Green Ltda.", description: "Solicitud de acceso al banco de talento de Electricidad", author: "Innova Green Ltda.", urgent: false, type: "alianza", date: "2026-03-23" },
  { id: "q3", title: "Reporte Asistencia: Módulo Soldadura", description: "Pendiente revisión del instructor — 3 ausencias injustificadas", author: "Instructor Solano", urgent: false, type: "reporte", date: "2026-03-22" },
  { id: "q4", title: "Certificación AWS: 4 estudiantes", description: "Documentos listos para envío a certificadora internacional", author: "Coord. Académica", urgent: true, type: "certificacion", date: "2026-03-21" },
  { id: "q5", title: "Prácticas AutoParts Chile", description: "2 pasantes de Mecatrónica pendientes de asignación", author: "AutoParts Chile", urgent: true, type: "practica", date: "2026-03-20" },
  { id: "q6", title: "Alianza: Constructora Andina SpA", description: "Solicitud de alianza para especialidad de Construcción", author: "Constructora Andina SpA", urgent: false, type: "alianza", date: "2026-03-19" },
  { id: "q7", title: "Validación Badge Informática", description: "Javiera Muñoz solicita validación de insignia Informática Nivel I", author: "Javiera Muñoz", urgent: false, type: "certificacion", date: "2026-03-18" },
];

// ═══════════════════════════════════════════════
// SCHOOL STUDENTS
// ═══════════════════════════════════════════════

export const SCHOOL_STUDENTS: SchoolStudent[] = [
  { id: "ss1", name: "Felipe Castro", avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face", specialty: "Mecatronica", grade: "3° Medio", attendance: 94, gpa: 86.0, availability: "Disponible", badgeCount: 4 },
  { id: "ss2", name: "Sofia Vargas", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face", specialty: "Soldadura", grade: "4° Medio", attendance: 97, gpa: 91.0, availability: "En prácticas", badgeCount: 6 },
  { id: "ss3", name: "Valentina Ruiz", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", specialty: "Electricidad", grade: "3° Medio", attendance: 88, gpa: 90.0, availability: "Disponible", badgeCount: 3 },
  { id: "ss4", name: "Camila Ortiz", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face", specialty: "Ebanisteria", grade: "4° Medio", attendance: 92, gpa: 87.0, availability: "Disponible", badgeCount: 5 },
  { id: "ss5", name: "Marco Rivera", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", specialty: "Soldadura", grade: "4° Medio", attendance: 79, gpa: 88.0, availability: "Disponible", badgeCount: 2 },
  { id: "ss6", name: "Lucas Espinoza", avatar: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=100&h=100&fit=crop&crop=face", specialty: "Electricidad", grade: "2° Medio", attendance: 72, gpa: 84.0, availability: "Disponible", badgeCount: 1 },
  { id: "ss7", name: "Javiera Muñoz", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face", specialty: "Mecatronica", grade: "3° Medio", attendance: 96, gpa: 89.0, availability: "Disponible", badgeCount: 4 },
  { id: "ss8", name: "Bastián Torres", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&crop=face", specialty: "Ebanisteria", grade: "2° Medio", attendance: 85, gpa: 85.0, availability: "En prácticas", badgeCount: 2 },
];
