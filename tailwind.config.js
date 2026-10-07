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
                // Brand: electric cyan/violet on deep space slate.
                brand: {
                    DEFAULT: '#22d3ee', // cyan-400
                    soft: '#67e8f9',    // cyan-300
                    deep: '#0891b2',    // cyan-600
                },
                accent2: {
                    DEFAULT: '#818cf8', // indigo-400
                    deep: '#6366f1',    // indigo-500
                },
                up: '#34d399',   // emerald-400
                down: '#fb7185', // rose-400
                warn: '#fbbf24', // amber-400

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
                // One radius scale, used everywhere.
                card: '1.25rem',   // outer cards / panels (was rounded-3xl)
                inner: '0.875rem', // nested rows / chips (was rounded-2xl)
                control: '0.625rem', // buttons / inputs (was rounded-xl)
            },
            fontSize: {
                // One type scale.
                display: ['1.875rem', { lineHeight: '2.25rem', fontWeight: '800' }], // big numbers
                title: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '700', letterSpacing: '0.06em' }], // section headers (uppercase)
                body: ['0.875rem', { lineHeight: '1.375rem', fontWeight: '500' }],
                caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '600' }],
            },
            boxShadow: {
                card: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
                glow: '0 0 24px -6px rgb(34 211 238 / 0.35)',
            },
        },
    },
    plugins: [],
}
