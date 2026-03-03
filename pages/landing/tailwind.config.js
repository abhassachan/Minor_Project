tailwind.config = {
    theme: {
        extend: {
            colors: {
                brand: {
                    offwhite: '#f5f4f0',
                    teal: '#2dce89',
                    ink: '#1a1917',
                    muted: '#6b7280'
                }
            },
            fontFamily: {
                heading: ['Bebas Neue', 'sans-serif'],
                body: ['DM Sans', 'sans-serif'],
                mono: ['DM Mono', 'monospace']
            },
            animation: {
                'fade-up': 'fadeUp 0.8s ease-out forwards',
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            }
        }
    }
}
