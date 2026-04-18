/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores sugeridos para un negocio de motos (Moderno/Industrial)
        primary: "#002052", // Azul oscuro profesional
        secondary: "#57000c", // Un rojo deportivo
        mute: "#1de17c",
        btnAccent: "#1900ff",
      },
      // fontFamily: {
      //   rubik: ["Rubik Vinyl", "system-ui", "sans-serif"],
      //   goldman: ["Goldman", "sans-serif", "mono"],
      //   prevol: ["Protest Revolution", "sans-serif"],
      //   londri: ["Londrina Shadow", "sans-serif"],
      //   genox: ["Genos", "sans-serif"],
      //   michroma: ["Michroma", "sans-serif"],
      // },
      backgroundImage: {
        'ocean-core': 'radial-gradient(circle, #34d3ff, #002333)',
        'deep-core': 'radial-gradient(circle, #002730, #020018)',

        'conic-1': 'conic-gradient(from 270deg, red, yellow, green, blue, red)',
        'conic-2': 'conic-gradient(at center, #09002e, #2d0022, #343434, #09002e)',
        'multi-stop': 'linear-gradient(to right, #490053, #12005a, #635600)',
        'radial-soft': 'radial-gradient(circle at center, #130092, #000000)',
        'radial-ellipse': 'radial-gradient(ellipse at top, #2200ff, #00022e)', //Se ve genial
        'overlay': 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0,0,0,0))',


        // 'login-core': 'radial-gradient(circle, #2f3234, #002333)',
        'radial-abyssal': 'radial-gradient(circle, #003e4fff, #0f172a)',
        'radial-turk': 'radial-gradient(circle, #87007cff, #0f172a)',
        'radial-golden': 'radial-gradient(circle, #fbcd00e1, #0f172a)',
        'radial-neonflare': 'radial-gradient(circle, #13ff66, #000000)',
        'radial-greenight': 'radial-gradient(circle, #d3d3d3ff, #0191a4ff)',

        //Con imágenes
        // 'hero-blob': "url('/images/blob-scene-haikei.svg')",
        // 'hero-iluminary': "url('/images/polygon-luminary.svg')",
        // 'hero-login': "url('/images/login-photo.png')",
      },
    },
  },
  plugins: [],
}