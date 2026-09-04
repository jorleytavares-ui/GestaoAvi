module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: '#F1ECDD',
        surface: '#FFFFFF',
        surfaceAlt: '#FAF6EC',
        ink: '#2B2A1F',
        inkSoft: '#7A735D',
        primary: '#3D5A3D',
        primaryDark: '#28401F',
        accent: '#C98A2E',
        alert: '#A6432B',
        line: '#DED5BC',
      },
      fontFamily: {
        display: ['ZillaSlab_700Bold'],
        displaySemi: ['ZillaSlab_600SemiBold'],
        body: ['WorkSans_400Regular'],
        bodyMedium: ['WorkSans_500Medium'],
        bodySemi: ['WorkSans_600SemiBold'],
        bodyBold: ['WorkSans_700Bold'],
        mono: ['IBMPlexMono_600SemiBold'],
      },
    },
  },
  plugins: [],
};
