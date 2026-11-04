import type { Content } from './types';

// Portuguese (Brazil).
export const pt: Content = {
  meta: {
    title: 'Herick Gonzaga — Engenheiro de Software & IA',
    description:
      'Engenheiro de Software & IA que une engenharia à formação em Relações Internacionais: sistemas LLM, agentes e QA para uma plataforma de compras dos EUA.',
  },
  profile: {
    name: 'Herick Gonzaga',
    fullName: 'Herick Andrey Gonzaga',
    initials: 'HG',
    title: 'Engenheiro de Software & IA',
    headline: 'Software que vai para produção, IA que se sustenta nela.',
    intro:
      'Sou Herick Gonzaga, Engenheiro de Software & IA e estudante de Relações Internacionais. Trabalho com sistemas baseados em LLM, automação com agentes e QA para uma plataforma norte-americana de compras para a construção civil. Construo o pipeline, os prompts e os testes que provam que tudo funciona — de olho nos mercados onde o software opera.',
    status: 'Engenharia de Software & IA + Relações Internacionais · Brasil (UTC−3)',
    heroChips: ['Engenharia de Software', 'Engenharia de IA', 'Prompt Engineering', 'QA & Automação', 'MCP', 'Relações Internacionais'],
    about: [
      'Atuo como prestador de serviço na SubBase — uma plataforma SaaS norte-americana de compras para a construção civil — via Codengage. Cuido do trabalho de dados human-in-the-loop, do prompt engineering e do QA de um pipeline de extração de notas fiscais baseado em LLM, do prompt ao teste que o valida.',
      'Acredito que bons produtos de IA são, em grande parte, boa engenharia: contratos claros, resultados medidos e testes que pegam regressões antes dos clientes. Cursar Relações Internacionais junto com Engenharia de Software é como mantenho a outra metade à vista: as pessoas, os mercados e as regulações que o software precisa atender.',
    ],
    facts: [
      { label: 'Moro em', value: 'Dois Vizinhos, Paraná, Brasil' },
      { label: 'Trabalho na', value: 'SubBase (Fort Lauderdale, remoto) · via Codengage' },
      { label: 'Estudo', value: 'Engenharia de Software, UTFPR · Relações Internacionais, UNINTER' },
      { label: 'Idiomas', value: 'Português (nativo) · Inglês (profissional) · Espanhol, Francês (básico)' },
      { label: 'Disponível para', value: 'Palestras, mentorias e comunidades tech' },
    ],
    contact: {
      email: 'andreyherick8@gmail.com',
      linkedin: 'https://linkedin.com/in/herick-gonzaga',
      linkedinLabel: '/in/herick-gonzaga',
      github: 'https://github.com/herick-gonzaga',
      githubLabel: '@herick-gonzaga',
      instagram: 'https://www.instagram.com/herick.andrey/',
      instagramLabel: '@herick.andrey',
      timezone: 'UTC−3 · sobreposição com o leste dos EUA, 9h–17h',
    },
    contactHeadline: 'Vamos construir software que funciona em qualquer lugar.',
    contactText:
      'Organizando uma palestra, buscando mentoria ou construindo uma comunidade tech? Minha caixa de entrada está aberta — em inglês ou português.',
    footerTagline: 'Feito com disciplina de Rails e um ou dois LLMs.',
  },
  ui: {
    nav: {
      about: 'Sobre',
      skills: 'Habilidades',
      projects: 'Projetos',
      journey: 'Trajetória',
      impact: 'Impacto',
      cta: 'Fale comigo',
    },
    viewProjects: 'Ver projetos',
    contactMe: 'Entrar em contato',
    allRepos: 'Todos os repositórios no GitHub',
    emailMe: 'Enviar e-mail',
    linkedin: 'LinkedIn',
    backTop: 'Voltar ao topo',
    contact: {
      email: 'E-mail',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      instagram: 'Instagram',
      timezone: 'Fuso horário',
    },
    menuOpen: 'Abrir menu',
    menuClose: 'Fechar menu',
    language: 'Idioma',
    navLabel: 'Navegação principal',
  },
  personal: {
    title: 'Além do código',
    body:
      'Fora do trabalho, sou um grande fã de esportes, um apaixonado pela música brasileira em suas mais diversas formas e, de vez em quando, alguém que transforma pensamentos sobre a vida em palavras. Gosto de subir no palco para compartilhar ideias sobre tecnologia e carreira, de ajudar quem está começando sua jornada e de participar de projetos voluntários com jovens da minha cidade. Afinal, acredito que conhecimento, experiências e boas histórias ficam ainda melhores quando compartilhados. Se quiser me conhecer além do GitHub, o Instagram é o lugar.',
    photoAlt: 'Foto de Herick Gonzaga',
    open: 'Herick Gonzaga — além do código',
    close: 'Fechar',
  },
  sections: {
    about: { kicker: '02 / Sobre', title: 'Engenharia, IA e uma visão global, na mesma pessoa.' },
    skills: {
      kicker: '03 / Habilidades & expertise',
      title: 'Quatro pilares, um ciclo: construir, validar, automatizar, entregar.',
    },
    projects: { kicker: '04 / Projetos em destaque', title: 'Trabalhos que unem IA à disciplina de provar que funciona.' },
    journey: {
      kicker: '05 / Trajetória',
      title: 'De cabear redes a colocar IA em produção.',
      intro: 'Trabalho e estudo, em paralelo, desde 2023.',
    },
    impact: { kicker: '06 / Conquistas & impacto', title: 'Evidências, não adjetivos.' },
    contact: { kicker: '07 / Contato' },
  },
  diagram: {
    nodes: [
      { title: 'Software', sub: 'Rails · APIs · CI/CD' },
      { title: 'Engenharia de IA', sub: 'LLMs · Agentes · MCP' },
      { title: 'Qualidade', sub: 'QA · Automação' },
      { title: 'Global', sub: 'Rel. Internacionais · EN' },
    ],
    center: 'Herick',
    centerSub: 'construir · validar · entregar',
    caption: 'fig. 01 — um engenheiro, quatro disciplinas',
    ariaLabel:
      'Diagrama que conecta as quatro disciplinas de Herick: engenharia de software, engenharia de IA, garantia de qualidade e relações internacionais',
  },
  skills: [
    {
      title: 'Engenharia de Software',
      description: 'Full-stack com foco em backend, do modelo de dados à API e ao deploy.',
      chips: ['Ruby on Rails', 'PostgreSQL', 'REST APIs', 'Docker', 'Git / GitHub', 'CI/CD'],
      icon: 'code',
    },
    {
      title: 'Engenharia de IA',
      description:
        'Pipelines de LLM que extraem dados estruturados, agentes que agem e os sistemas de prompts que os mantêm precisos.',
      chips: ['Pipelines de LLM', 'Prompt Engineering', 'Agentes de IA', 'MCP', 'Integração de modelos', 'MLOps'],
      icon: 'spark',
    },
    {
      title: 'Qualidade & Automação',
      description:
        'Planos de teste, suítes automatizadas e validação de sistemas, tratados como parte do produto, não como detalhe.',
      chips: ['Estratégia de testes', 'Testes automatizados', 'Validação de sistemas', 'Avaliação HITL', 'Report de bugs'],
      icon: 'shield',
    },
    {
      title: 'Colaboração global',
      description:
        'Trabalho diário em inglês com um time dos EUA, além da formação em Relações Internacionais para o lado de mercado do software.',
      chips: ['Inglês (profissional)', 'Remote-first', 'Relações Internacionais', 'Oratória'],
      icon: 'globe',
    },
  ],
  projects: [
    {
      slug: 'mq-test',
      name: 'MQ-Test',
      kind: 'Destaque · Open source',
      period: '2025 — atual',
      description:
        'Uma plataforma de gestão de testes (suítes, casos, planos, execuções, bugs, requisitos) com um servidor MCP para que agentes de código leiam e escrevam dados de teste. Integra com GitHub, Linear e Slack; o repositório de automação continua sendo a fonte da verdade e o MQ-Test vira o painel que o organiza e acompanha.',
      stack: ['Rails 8', 'PostgreSQL', 'Docker', 'MCP', 'GitHub API', 'Linear'],
      metrics: [
        { value: '500+', label: 'casos de teste organizados' },
        { value: '9.000+', label: 'execuções acompanhadas via MCP' },
        { value: '10+', label: 'integrações' },
      ],
      links: [
        { label: 'Repositório', href: 'https://github.com/herick-gonzaga/MQ-Test' },
        { label: 'Estudo de caso', href: '#projects' },
      ],
      tier: 'featured',
    },
    {
      slug: 'invoice-extraction',
      name: 'Extração de notas fiscais com LLM, fornecedor por fornecedor',
      kind: 'Profissional · SubBase',
      description:
        'Regras de prompt específicas por fornecedor, uma etapa de classificação de páginas antes da extração para PDFs mistos, migrações de schema e reports de bugs estruturados para um pipeline de extração em produção.',
      stack: ['Prompt systems', 'LLM eval', 'Redash / SQL'],
      links: [{ label: 'Ler o artigo', href: '#projects' }],
      tier: 'secondary',
    },
    {
      slug: 'subbase-qa-tests',
      name: 'subbase-qa-tests',
      kind: 'Automação',
      description:
        'Suíte automatizada de testes E2E para a plataforma SubBase, organizada no MQ-Test e executada no CI, para que regressões sejam detectadas antes do release.',
      stack: ['E2E', 'CI'],
      links: [],
      tier: 'secondary',
    },
    {
      slug: 'susagendamento',
      name: 'SUSAGENDAMENTO',
      kind: 'Design de produto',
      description: 'Conceito de app mobile para agendamento de consultas no SUS, desenhado no Figma.',
      stack: ['Figma', 'Mobile UX'],
      links: [],
      tier: 'small',
    },
    {
      slug: 'prompt-pattern-docs',
      name: 'prompt-pattern-docs',
      kind: 'Fluxos com agentes',
      description: 'Uma skill que transforma problemas de extração ainda crus em prompts de LLM documentados e prontos para produção.',
      stack: ['Claude skills', 'Prompt patterns'],
      links: [],
      tier: 'small',
    },
  ],
  journey: [
    {
      period: 'set 2024 — atual',
      place: 'Remoto (Fort Lauderdale, EUA)',
      title: 'Data Entry / HITL / Prompt Engineering Specialist',
      org: 'SubBase',
      orgNote: 'via Codengage',
      description:
        'Prestador de serviço via Codengage, dedicado à plataforma SubBase: a camada de qualidade human-in-the-loop de um pipeline de extração de notas fiscais com LLM — regras de prompt por fornecedor, diffs de comportamento entre versões de prompt, reports de bugs estruturados e automação de QA. Pela Codengage, também criei e treinei modelos de IA e construí produtos de dados.',
      current: true,
      type: 'work',
    },
    {
      period: 'set 2023 — mar 2024',
      title: 'Técnico de Redes',
      org: 'Proveminas',
      description:
        'Cabeamento, hardware e conexões de internet. A base prática de infraestrutura por trás de tudo o que veio depois.',
      current: false,
      type: 'work',
    },
    {
      period: 'fev 2026 — jun 2030 (previsto)',
      title: 'Bacharelado em Relações Internacionais',
      org: 'UNINTER',
      description: 'Mercados, globalização e regulação: o contexto em que os produtos de software operam.',
      current: false,
      type: 'education',
    },
    {
      period: 'mar 2023 — jul 2027 (previsto)',
      title: 'Bacharelado em Engenharia de Software',
      org: 'UTFPR',
      description:
        'Presidente do centro acadêmico CAES Alan Turing em 2025 e secretário na gestão de 2026. Pesquisa sobre LLMs para detecção de test smells.',
      current: false,
      type: 'education',
    },
  ],
  achievements: {
    metrics: [
      {
        value: '10+',
        label: 'sistemas de prompt por fornecedor',
        note: 'Criados ou auditados para o pipeline de extração da SubBase (Wesco, Airgas, White Cap e outros).',
      },
      {
        value: '500+',
        label: 'testes automatizados entregues',
        note: 'No subbase-qa-tests, acompanhados no MQ-Test, executados no CI.',
      },
      {
        value: '98,85%',
        label: 'ganho de precisão na extração',
        note: 'Medido em revisões de prompts por fornecedor no pipeline de extração da SubBase.',
      },
    ],
    items: [
      {
        icon: 'mic',
        title: 'Palestrante, DevParaná na Estrada 2026 & Anhembi Morumbi (São Paulo)',
        description:
          'Palestras “De estudante a desenvolvedor internacional” e “Caminhos e tecnologia”: como engenheiros em início de carreira chegam a times globais.',
      },
      {
        icon: 'mentor',
        title: 'Mentor, IAthon (Sudotec / SENAI)',
        description: 'Orientei equipes construindo protótipos de IA dentro das restrições de um hackathon.',
      },
      {
        icon: 'council',
        title: 'Liderei o centro acadêmico de Engenharia de Software (CAES Alan Turing)',
        description: 'Presidente em 2025, secretário em 2026; organizei a Semana Acadêmica e seus patrocínios.',
      },
      {
        icon: 'paper',
        title: 'Pesquisa: LLMs para detecção de test smells',
        description: 'Estudo comparativo de modelos de linguagem na identificação de test smells, escrito no formato SBC na UTFPR.',
      },
    ],
  },
};
