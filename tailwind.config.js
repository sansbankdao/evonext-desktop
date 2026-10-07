// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{vue,js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            /*
             * EvoNext design tokens (crypto-native direction).
             *
             * Rules for contributors:
             *  - Surfaces/text/borders come from the semantic tokens below,
             *    never raw slate/gray utilities, so components stay in
             *    proportion and in-palette.
             *  - ONE radius scale: card > inner > control. Never mix.
             *  - Accent = brand (primary), accent2 (secondary), up/down
             *    (semantic). Sidebar widget tiles may use accent2/up/warn.
             */
            colors: {
                // Brand: restrained indigo (clean/minimal dashboard).
                brand: {
                    DEFAULT: '#6366f1', // indigo-500
                    soft: '#a5b4fc',    // indigo-300
                    deep: '#4f46e5',    // indigo-600
                },
                accent2: {
                    DEFAULT: '#94a3b8', // slate-400 (cool neutral, sparing)
                    deep: '#64748b',    // slate-500
                },
                up: '#10b981',   // emerald-500
                down: '#f43f5e', // rose-500
                warn: '#f59e0b', // amber-500

                // Semantic surfaces (light / dark via CSS variables).
                surface: {
                    base: 'rgb(var(--surface-base) / <alpha-value>)',
                    card: 'rgb(var(--surface-card) / <alpha-value>)',
                    raise: 'rgb(var(--surface-raise) / <alpha-value>)',
                },
                edge: 'rgb(var(--edge) / <alpha-value>)',
                content: {
                    DEFAULT: 'rgb(var(--content) / <alpha-value>)',
                    soft: 'rgb(var(--content-soft) / <alpha-value>)',
                    faint: 'rgb(var(--content-faint) / <alpha-value>)',
                },
            },
            borderRadius: {
                // One radius scale, used everywhere. Tight/modern.
                card: '0.75rem',    // outer cards / panels
                inner: '0.5rem',    // nested rows / chips
                control: '0.375rem', // buttons / inputs
            },
            fontSize: {
                // One type scale. Tight, dashboard-dense.
                display: ['1.5rem', { lineHeight: '1.9rem', fontWeight: '700' }], // big numbers
                title: ['0.6875rem', { lineHeight: '1rem', fontWeight: '600', letterSpacing: '0.05em' }], // section headers (uppercase)
                body: ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '500' }],
                caption: ['0.6875rem', { lineHeight: '0.9rem', fontWeight: '500' }],
            },
            boxShadow: {
                card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.05)',
                glow: '0 0 0 1px rgb(99 102 241 / 0.18), 0 8px 24px -12px rgb(99 102 241 / 0.30)',
            },
        },
    },
    plugins: [],
}
