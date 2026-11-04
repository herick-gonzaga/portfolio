import type { Content } from './types';

// Spanish (neutral Latin American).
export const es: Content = {
  meta: {
    title: 'Herick Gonzaga — Ingeniero de Software & IA',
    description:
      'Ingeniero de Software e IA que une ingeniería con formación en Relaciones Internacionales: LLM, agentes y QA para una plataforma de compras de EE. UU.',
  },
  profile: {
    name: 'Herick Gonzaga',
    fullName: 'Herick Andrey Gonzaga',
    initials: 'HG',
    title: 'Ingeniero de Software & IA',
    headline: 'Software que llega a producción, IA que resiste en ella.',
    intro:
      'Soy Herick Gonzaga, Ingeniero de Software e IA y estudiante de Relaciones Internacionales. Trabajo con sistemas basados en LLM, automatización con agentes y QA para una plataforma estadounidense de compras para la construcción. Construyo el pipeline, los prompts y las pruebas que demuestran que todo funciona — con la mirada puesta en los mercados donde opera el software.',
    status: 'Ingeniería de Software e IA + Relaciones Internacionales · Brasil (UTC−3)',
    heroChips: ['Ingeniería de Software', 'Ingeniería de IA', 'Prompt Engineering', 'QA & Automatización', 'MCP', 'Relaciones Internacionales'],
    about: [
      'Trabajo como prestador de servicios en SubBase — una plataforma SaaS estadounidense de compras para la construcción — a través de Codengage. Me encargo del trabajo de datos human-in-the-loop, del prompt engineering y del QA de un pipeline de extracción de facturas basado en LLM, del prompt a la prueba que lo valida.',
      'Creo que los buenos productos de IA son, en gran parte, buena ingeniería: contratos claros, resultados medidos y pruebas que detectan regresiones antes que los clientes. Estudiar Relaciones Internacionales junto con Ingeniería de Software es mi forma de no perder de vista la otra mitad: las personas, los mercados y las regulaciones a las que el software debe responder.',
    ],
    facts: [
      { label: 'Vivo en', value: 'Dois Vizinhos, Paraná, Brasil' },
      { label: 'Trabajo en', value: 'SubBase (Fort Lauderdale, remoto) · vía Codengage' },
      { label: 'Estudio', value: 'Ingeniería de Software, UTFPR · Relaciones Internacionales, UNINTER' },
      { label: 'Idiomas', value: 'Portugués (nativo) · Inglés (profesional) · Español, Francés (básico)' },
      { label: 'Disponible para', value: 'Charlas, mentorías y comunidades tech' },
    ],
    contact: {
      email: 'andreyherick8@gmail.com',
      linkedin: 'https://linkedin.com/in/herick-gonzaga',
      linkedinLabel: '/in/herick-gonzaga',
      github: 'https://github.com/herick-gonzaga',
      githubLabel: '@herick-gonzaga',
      timezone: 'UTC−3 · coincide con el este de EE. UU., 9–17 h',
    },
    contactHeadline: 'Construyamos software que funcione en todas partes.',
    contactText:
      '¿Organizas una charla, buscas mentoría o construyes una comunidad tech? Mi bandeja de entrada está abierta.',
    footerTagline: 'Hecho con disciplina de Rails y uno o dos LLMs.',
  },
  ui: {
    nav: {
      about: 'Sobre mí',
      skills: 'Habilidades',
      projects: 'Proyectos',
      journey: 'Trayectoria',
      impact: 'Impacto',
      cta: 'Contáctame',
    },
    viewProjects: 'Ver proyectos',
    contactMe: 'Contactar',
    allRepos: 'Todos los repositorios en GitHub',
    emailMe: 'Enviar correo',
    linkedin: 'LinkedIn',
    backTop: 'Volver arriba',
    contact: {
      email: 'Correo',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      timezone: 'Zona horaria',
    },
    menuOpen: 'Abrir menú',
    menuClose: 'Cerrar menú',
    language: 'Idioma',
    navLabel: 'Navegación principal',
  },
  sections: {
    about: { kicker: '02 / Sobre mí', title: 'Ingeniería, IA y una visión global, en la misma persona.' },
    skills: {
      kicker: '03 / Habilidades & experiencia',
      title: 'Cuatro pilares, un ciclo: construir, validar, automatizar, entregar.',
    },
    projects: {
      kicker: '04 / Proyectos destacados',
      title: 'Trabajo que une la IA con la disciplina de demostrar que funciona.',
    },
    journey: {
      kicker: '05 / Trayectoria',
      title: 'De cablear redes a llevar IA a producción.',
      intro: 'Trabajo y estudio, en paralelo, desde 2023.',
    },
    impact: { kicker: '06 / Logros & impacto', title: 'Evidencia, no adjetivos.' },
    contact: { kicker: '07 / Contacto' },
  },
  diagram: {
    nodes: [
      { title: 'Software', sub: 'Rails · APIs · CI/CD' },
      { title: 'Ingeniería de IA', sub: 'LLMs · Agentes · MCP' },
      { title: 'Calidad', sub: 'QA · Automatización' },
      { title: 'Global', sub: 'Rel. Internacionales · EN' },
    ],
    center: 'Herick',
    centerSub: 'construir · validar · entregar',
    caption: 'fig. 01 — un ingeniero, cuatro disciplinas',
    ariaLabel:
      'Diagrama que conecta las cuatro disciplinas de Herick: ingeniería de software, ingeniería de IA, aseguramiento de la calidad y relaciones internacionales',
  },
  skills: [
    {
      title: 'Ingeniería de Software',
      description: 'Full-stack con enfoque en backend, del modelo de datos a la API y al deploy.',
      chips: ['Ruby on Rails', 'PostgreSQL', 'REST APIs', 'Docker', 'Git / GitHub', 'CI/CD'],
      icon: 'code',
    },
    {
      title: 'Ingeniería de IA',
      description:
        'Pipelines de LLM que extraen datos estructurados, agentes que actúan y los sistemas de prompts que los mantienen precisos.',
      chips: ['Pipelines de LLM', 'Prompt Engineering', 'Agentes de IA', 'MCP', 'Integración de modelos', 'MLOps'],
      icon: 'spark',
    },
    {
      title: 'Calidad & Automatización',
      description:
        'Planes de prueba, suites automatizadas y validación de sistemas, tratados como parte del producto, no como un añadido.',
      chips: ['Estrategia de pruebas', 'Pruebas automatizadas', 'Validación de sistemas', 'Evaluación HITL', 'Reporte de bugs'],
      icon: 'shield',
    },
    {
      title: 'Colaboración global',
      description:
        'Trabajo diario en inglés con un equipo de EE. UU., además de formación en Relaciones Internacionales para el lado de mercado del software.',
      chips: ['Inglés (profesional)', 'Remote-first', 'Relaciones Internacionales', 'Oratoria'],
      icon: 'globe',
    },
  ],
  projects: [
    {
      slug: 'mq-test',
      name: 'MQ-Test',
      kind: 'Destacado · Open source',
      period: '2025 — actual',
      description:
        'Una plataforma de gestión de pruebas (suites, casos, planes, ejecuciones, bugs, requisitos) con un servidor MCP para que los agentes de código lean y escriban datos de prueba. Se integra con GitHub, Linear y Slack; el repositorio de automatización sigue siendo la fuente de verdad y MQ-Test se convierte en el panel que lo organiza y le da seguimiento.',
      stack: ['Rails 8', 'PostgreSQL', 'Docker', 'MCP', 'GitHub API', 'Linear'],
      metrics: [
        { value: '[N]', label: 'casos de prueba organizados' },
        { value: '[N]', label: 'ejecuciones registradas vía MCP' },
        { value: '[N]', label: 'integraciones' },
      ],
      links: [
        { label: 'Repositorio', href: 'https://github.com/herick-gonzaga/MQ-Test' },
        { label: 'Caso de estudio', href: '#projects' },
      ],
      tier: 'featured',
    },
    {
      slug: 'invoice-extraction',
      name: 'Extracción de facturas con LLM, proveedor por proveedor',
      kind: 'Profesional · SubBase',
      description:
        'Reglas de prompt específicas por proveedor, una etapa de clasificación de páginas previa a la extracción para PDFs mixtos, migraciones de schema y reportes de bugs estructurados para un pipeline de extracción en producción.',
      stack: ['Prompt systems', 'LLM eval', 'Redash / SQL'],
      links: [{ label: 'Leer el artículo', href: '#projects' }],
      tier: 'secondary',
    },
    {
      slug: 'subbase-qa-tests',
      name: 'subbase-qa-tests',
      kind: 'Automatización',
      description:
        'Suite automatizada de pruebas E2E para la plataforma SubBase, organizada en MQ-Test y ejecutada en CI, para detectar regresiones antes de cada release.',
      stack: ['E2E', 'CI'],
      links: [],
      tier: 'secondary',
    },
    {
      slug: 'susagendamento',
      name: 'SUSAGENDAMENTO',
      kind: 'Diseño de producto',
      description: 'Concepto de app móvil para agendar citas en el sistema público de salud de Brasil (SUS), diseñado en Figma.',
      stack: ['Figma', 'Mobile UX'],
      links: [],
      tier: 'small',
    },
    {
      slug: 'prompt-pattern-docs',
      name: 'prompt-pattern-docs',
      kind: 'Flujos con agentes',
      description: 'Una skill que convierte problemas de extracción aún en bruto en prompts de LLM documentados y listos para producción.',
      stack: ['Claude skills', 'Prompt patterns'],
      links: [],
      tier: 'small',
    },
  ],
  journey: [
    {
      period: 'sep 2024 — actual',
      place: 'Remoto (Fort Lauderdale, EE. UU.)',
      title: 'Data Entry / HITL / Prompt Engineering Specialist',
      org: 'SubBase',
      orgNote: 'vía Codengage',
      description:
        'Prestador de servicios vía Codengage, dedicado a la plataforma SubBase: la capa de calidad human-in-the-loop de un pipeline de extracción de facturas con LLM — reglas de prompt por proveedor, diffs de comportamiento entre versiones de prompt, reportes de bugs estructurados y automatización de QA. A través de Codengage, también creé y entrené modelos de IA y construí productos de datos.',
      current: true,
      type: 'work',
    },
    {
      period: 'sep 2023 — mar 2024',
      title: 'Técnico de Redes',
      org: 'Proveminas',
      description:
        'Cableado, hardware y conexiones a internet. La base práctica de infraestructura detrás de todo lo que vino después.',
      current: false,
      type: 'work',
    },
    {
      period: 'feb 2026 — jun 2030 (previsto)',
      title: 'Licenciatura en Relaciones Internacionales',
      org: 'UNINTER',
      description: 'Mercados, globalización y regulación: el contexto en el que operan los productos de software.',
      current: false,
      type: 'education',
    },
    {
      period: 'mar 2023 — jul 2027 (previsto)',
      title: 'Ingeniería de Software',
      org: 'UTFPR',
      description:
        'Presidente del centro de estudiantes CAES Alan Turing en 2025 y secretario en la directiva de 2026. Investigación sobre LLMs para la detección de test smells.',
      current: false,
      type: 'education',
    },
  ],
  achievements: {
    metrics: [
      {
        value: '[N]',
        label: 'sistemas de prompt por proveedor',
        note: 'Creados o auditados para el pipeline de extracción de SubBase (Wesco, Airgas, White Cap y otros).',
      },
      {
        value: '[N]',
        label: 'pruebas automatizadas entregadas',
        note: 'En subbase-qa-tests, con seguimiento en MQ-Test, ejecutadas en CI.',
      },
      {
        value: '[N]%',
        label: 'mejora en la precisión de extracción',
        note: '[Replace with a measured before/after from a vendor prompt revision.]',
      },
    ],
    items: [
      {
        icon: 'mic',
        title: 'Ponente, DevParaná na Estrada 2026 & Anhembi Morumbi (São Paulo)',
        description:
          'Charlas “De estudiante a desarrollador internacional” y “Caminos y tecnología”: cómo los ingenieros que inician su carrera llegan a equipos globales.',
      },
      {
        icon: 'mentor',
        title: 'Mentor, IAthon (Sudotec / SENAI)',
        description: 'Guié a equipos que construían prototipos de IA bajo las restricciones de un hackathon.',
      },
      {
        icon: 'council',
        title: 'Lideré el centro de estudiantes de Ingeniería de Software (CAES Alan Turing)',
        description: 'Presidente en 2025, secretario en 2026; organicé la Semana Acadêmica y sus patrocinios.',
      },
      {
        icon: 'paper',
        title: 'Investigación: LLMs para la detección de test smells',
        description:
          'Estudio comparativo de modelos de lenguaje en la identificación de test smells, escrito en formato SBC en la UTFPR.',
      },
    ],
  },
};
