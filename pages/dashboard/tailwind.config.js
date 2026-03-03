tailwind.config = {
    theme: {
        extend: {
            colors: {
                bg: '#f5f4f0',
                surface: '#ffffff',
                surface2: '#f0efe9',
                surface3: '#e8e6df',
                border: '#e4e2db',
                ink: '#1a1917',
                muted: '#8a8880',
                teal: {
                    DEFAULT: '#2dce89',
                    dark: '#1fb374',
                    light: '#eafaf3',
                    mid: '#b6efcf',
                },
                danger: '#f04438',
                warn: {
                    bg: '#fff8ec',
                    border: '#fde8b0',
                }
            },
            fontFamily: {
                bebas: ['"Bebas Neue"', 'cursive'],
                sans: ['"DM Sans"', 'sans-serif'],
                mono: ['"DM Mono"', 'monospace'],
            },
            boxShadow: {
                'card': '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03)',
                'float': '0 4px 20px rgba(45,206,137,0.4)',
            }
        }
    }
}
