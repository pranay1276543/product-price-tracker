/** @type {import(\"tailwindcss\").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // one restrained accent color, used sparingly - not a purple/blue gradient theme
        accent: {
          DEFAULT: "#2563eb",
          light: "#eff6ff",
        },
      },
    },
  },
  plugins: [],
};
