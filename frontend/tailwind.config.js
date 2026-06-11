/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#222222",
          primary: "#1c5d99",
          secondary: "#639fab",
          light: "#bbcde5",
        },
      },
    },
  },
  plugins: [],
};
