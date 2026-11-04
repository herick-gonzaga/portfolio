import type { Content } from './types';

export const en: Content = {
  meta: {
    title: 'Herick Gonzaga — Software & AI Engineer',
    description:
      'Software & AI Engineer who pairs engineering with an International Relations background: LLM systems, agents and QA for U.S. construction procurement.',
  },
  profile: {
    name: 'Herick Gonzaga',
    fullName: 'Herick Andrey Gonzaga',
    initials: 'HG',
    title: 'Software & AI Engineer',
    headline: 'Software that ships, AI that holds up in production.',
    intro:
      'I’m Herick Gonzaga, a Software & AI Engineer and International Relations undergraduate. I work on LLM-based systems, agent automation and QA for a US construction-procurement platform. I build the pipeline, the prompts and the tests that prove it all works — with an eye on the markets where software operates.',
    status: 'Software & AI Engineering + International Relations · Brazil (UTC−3)',
    heroChips: ['Software Engineering', 'AI Engineering', 'Prompt Engineering', 'QA & Automation', 'MCP', 'International Relations'],
    about: [
      'I work as a contractor at SubBase — a US construction-procurement SaaS platform — through Codengage. I own the human-in-the-loop data work, prompt engineering and QA for an LLM-based invoice-extraction pipeline, from the prompt to the test that validates it.',
      'I believe good AI products are mostly good engineering: clear contracts, measured outputs, tests that catch regressions before customers do. Studying International Relations alongside Software Engineering is how I keep the other half in view: the people, markets and regulations the software has to serve.',
    ],
    facts: [
      { label: 'Based in', value: 'Dois Vizinhos, Paraná, Brazil' },
      { label: 'Working at', value: 'SubBase (Fort Lauderdale, remote) · through Codengage' },
      { label: 'Studying', value: 'Software Engineering, UTFPR · International Relations, UNINTER' },
      { label: 'Languages', value: 'Portuguese (native) · English (professional) · Spanish, French (basic)' },
      { label: 'Available for', value: 'Talks, mentoring and tech communities' },
    ],
    contact: {
      email: 'andreyherick8@gmail.com',
      linkedin: 'https://linkedin.com/in/herick-gonzaga',
      linkedinLabel: '/in/herick-gonzaga',
      github: 'https://github.com/herick-gonzaga',
      githubLabel: '@herick-gonzaga',
      timezone: 'UTC−3 · overlaps US East 9–17h',
    },
    contactHeadline: 'Let’s build software that works everywhere.',
    contactText:
      'Organizing a talk, looking for a mentor or building a tech community? My inbox is open — English or Portuguese both work.',
    footerTagline: 'Built with Rails-grade discipline and an LLM or two.',
  },
  ui: {
    nav: {
      about: 'About',
      skills: 'Skills',
      projects: 'Projects',
      journey: 'Journey',
      impact: 'Impact',
      cta: 'Get in touch',
    },
    viewProjects: 'View projects',
    contactMe: 'Contact me',
    allRepos: 'All repositories on GitHub',
    emailMe: 'Email me',
    linkedin: 'LinkedIn',
    backTop: 'Back to top',
    contact: {
      email: 'Email',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      timezone: 'Time zone',
    },
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    language: 'Language',
    navLabel: 'Main navigation',
  },
  sections: {
    about: { kicker: '02 / About', title: 'Engineering, AI and a global point of view, in the same person.' },
    skills: { kicker: '03 / Skills & expertise', title: 'Four pillars, one loop: build, validate, automate, ship.' },
    projects: { kicker: '04 / Featured projects', title: 'Work that pairs AI with the discipline to prove it.' },
    journey: {
      kicker: '05 / Journey',
      title: 'From cabling networks to shipping AI.',
      intro: 'Work and study, in parallel, since 2023.',
    },
    impact: { kicker: '06 / Achievements & impact', title: 'Evidence, not adjectives.' },
    contact: { kicker: '07 / Contact' },
  },
  diagram: {
    nodes: [
      { title: 'Software', sub: 'Rails · APIs · CI/CD' },
      { title: 'AI Engineering', sub: 'LLMs · Agents · MCP' },
      { title: 'Quality', sub: 'QA · Automation' },
      { title: 'Global', sub: 'Int’l Relations · EN' },
    ],
    center: 'Herick',
    centerSub: 'build · validate · ship',
    caption: 'fig. 01 — one engineer, four disciplines',
    ariaLabel:
      'Diagram connecting Herick’s four disciplines: software engineering, AI engineering, quality assurance and international relations',
  },
  skills: [
    {
      title: 'Software Engineering',
      description: 'Backend-leaning full-stack work, from data model to API to deploy.',
      chips: ['Ruby on Rails', 'PostgreSQL', 'REST APIs', 'Docker', 'Git / GitHub', 'CI/CD'],
      icon: 'code',
    },
    {
      title: 'AI Engineering',
      description:
        'LLM pipelines that extract structured data, agents that act, and the prompt systems that keep them precise.',
      chips: ['LLM pipelines', 'Prompt Engineering', 'AI Agents', 'MCP', 'Model integration', 'MLOps'],
      icon: 'spark',
    },
    {
      title: 'Quality & Automation',
      description:
        'Test plans, automated suites and system validation, treated as part of the product, not an afterthought.',
      chips: ['Test strategy', 'Automated testing', 'System validation', 'HITL evaluation', 'Bug reporting'],
      icon: 'shield',
    },
    {
      title: 'Global collaboration',
      description:
        'Daily work in English with a U.S. team, plus International Relations training for the market side of software.',
      chips: ['English (professional)', 'Remote-first', 'International Relations', 'Public speaking'],
      icon: 'globe',
    },
  ],
  projects: [
    {
      slug: 'mq-test',
      name: 'MQ-Test',
      kind: 'Featured · Open source',
      period: '2025 — now',
      description:
        'A test-management platform (suites, cases, plans, runs, bugs, requirements) with an MCP server so coding agents can read and write test data. Integrates with GitHub, Linear and Slack; the automation repo stays the source of truth and MQ-Test becomes the dashboard that organizes and tracks it.',
      stack: ['Rails 8', 'PostgreSQL', 'Docker', 'MCP', 'GitHub API', 'Linear'],
      metrics: [
        { value: '500+', label: 'test cases organized' },
        { value: '9,000+', label: 'runs tracked via MCP' },
        { value: '10+', label: 'integrations' },
      ],
      links: [
        { label: 'Repository', href: 'https://github.com/herick-gonzaga/MQ-Test' },
        { label: 'Case study', href: '#projects' },
      ],
      tier: 'featured',
    },
    {
      slug: 'invoice-extraction',
      name: 'LLM invoice extraction, vendor by vendor',
      kind: 'Professional · SubBase',
      description:
        'Vendor-specific prompt rules, a pre-extraction page-classification gate for mixed PDFs, schema migrations and structured bug reports for an extraction pipeline used in production.',
      stack: ['Prompt systems', 'LLM eval', 'Redash / SQL'],
      links: [{ label: 'Read the write-up', href: '#projects' }],
      tier: 'secondary',
    },
    {
      slug: 'subbase-qa-tests',
      name: 'subbase-qa-tests',
      kind: 'Automation',
      description:
        'Automated end-to-end suite for the SubBase platform, organized in MQ-Test and run on CI, so regressions are caught before release.',
      stack: ['E2E', 'CI'],
      links: [],
      tier: 'secondary',
    },
    {
      slug: 'susagendamento',
      name: 'SUSAGENDAMENTO',
      kind: 'Product design',
      description: 'Mobile app concept for scheduling public-health (SUS) appointments, designed in Figma.',
      stack: ['Figma', 'Mobile UX'],
      links: [],
      tier: 'small',
    },
    {
      slug: 'prompt-pattern-docs',
      name: 'prompt-pattern-docs',
      kind: 'Agent workflows',
      description: 'A skill that turns rough extraction problems into production-ready, documented LLM prompts.',
      stack: ['Claude skills', 'Prompt patterns'],
      links: [],
      tier: 'small',
    },
  ],
  journey: [
    {
      period: 'Sep 2024 — now',
      place: 'Remote (Fort Lauderdale, USA)',
      title: 'Data Entry / HITL / Prompt Engineering Specialist',
      org: 'SubBase',
      orgNote: 'through Codengage',
      description:
        'Contractor through Codengage, dedicated to the SubBase platform: the human-in-the-loop quality layer of an LLM invoice-extraction pipeline — vendor-specific prompt rules, behavior diffs across prompt versions, structured bug reports and QA automation. Through Codengage, I also created and trained AI models and built data products.',
      current: true,
      type: 'work',
    },
    {
      period: 'Sep 2023 — Mar 2024',
      title: 'Network Technician',
      org: 'Proveminas',
      description:
        'Cabling, hardware and internet connections. The hands-on infrastructure base behind everything after it.',
      current: false,
      type: 'work',
    },
    {
      period: 'Feb 2026 — Jun 2030 (expected)',
      title: 'B.A. International Relations',
      org: 'UNINTER',
      description: 'Markets, globalization and regulation, the context software products operate in.',
      current: false,
      type: 'education',
    },
    {
      period: 'Mar 2023 — Jul 2027 (expected)',
      title: 'B.Sc. Software Engineering',
      org: 'UTFPR',
      description:
        'President of the CAES Alan Turing student council in 2025, secretary in the 2026 board. Research on LLMs for test-smell detection.',
      current: false,
      type: 'education',
    },
  ],
  achievements: {
    metrics: [
      {
        value: '10+',
        label: 'vendor prompt systems',
        note: 'Authored or audited for the SubBase extraction pipeline (Wesco, Airgas, White Cap and others).',
      },
      {
        value: '500+',
        label: 'automated tests shipped',
        note: 'In subbase-qa-tests, tracked in MQ-Test, run on CI.',
      },
      {
        value: '98.85%',
        label: 'extraction precision gain',
        note: 'Measured across vendor prompt revisions in SubBase’s extraction pipeline.',
      },
    ],
    items: [
      {
        icon: 'mic',
        title: 'Speaker, DevParaná na Estrada 2026 & Anhembi Morumbi (São Paulo)',
        description:
          'Talks on “From student to international developer” and “Paths and technology”: how early-career engineers reach global teams.',
      },
      {
        icon: 'mentor',
        title: 'Mentor, IAthon (Sudotec / SENAI)',
        description: 'Guided teams building AI prototypes under hackathon constraints.',
      },
      {
        icon: 'council',
        title: 'Led the Software Engineering student council (CAES Alan Turing)',
        description: 'President in 2025, secretary in 2026; organized the Semana Acadêmica and its sponsorships.',
      },
      {
        icon: 'paper',
        title: 'Research: LLMs for test-smell detection',
        description: 'Comparative study of language models identifying test smells, written in SBC format at UTFPR.',
      },
    ],
  },
};
