export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#060816",
        surface: "rgba(255,255,255,0.065)"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(59,130,246,0.16)"
      }
    },
  },
  plugins: [],
};
