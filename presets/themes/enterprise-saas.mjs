// Enterprise SaaS — the calm, dependable default for B2B admin consoles.
export default {
  id: 'enterprise-saas',
  order: 1,
  name: 'Enterprise SaaS',
  category: 'Product',
  description: 'Neutral, trustworthy indigo system for B2B admin consoles, settings-heavy apps and multi-tenant dashboards.',
  tags: ['b2b', 'admin', 'dashboard', 'balanced'],
  defaultMode: 'light',
  density: 'default',
  fonts: {
    body: { family: 'Inter', weights: [400, 500, 600, 700] },
    mono: { family: 'JetBrains Mono', weights: [400, 500], category: 'mono' },
  },
  palette: {
    neutral: { h: 265, c: 0.012 },
    brand: { h: 272, c: 0.2, hueShift: 4 },
    accent: { h: 200, c: 0.13 },
    success: { h: 155, c: 0.15 },
    warning: { h: 72, c: 0.16 },
    danger: { h: 25, c: 0.2 },
    info: { h: 240, c: 0.14 },
    violet: { h: 305, c: 0.18 },
    rose: { h: 0, c: 0.18 },
  },
  data: ['brand', 'accent', 'success', 'warning', 'violet', 'rose', 'info', 'danger'],
  type: { scale: 'default', tracking: { display: -0.025, heading: -0.015 } },
  radius: { xs: 2, sm: 4, md: 8, lg: 10, xl: 14, '2xl': 20 },
  shadow: 'crisp',
  components: {
    card: { shadow: ['shadow', '{shadow.xs}'] },
  },
};
