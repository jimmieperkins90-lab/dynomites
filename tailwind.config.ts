import type { Config } from "tailwindcss";

// Dyno Mites theme: an excavation-site-at-dusk palette (dinosaurs + dynamite).
// "fuse" is the special-occasion accent -- reserved exclusively for championship/
// highlight moments. Never reuse it for ordinary UI so it stays meaningful.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        basalt: "#211F1C",   // page background -- volcanic rock at dusk
        bone: "#EDE6D6",     // primary text / light surfaces
        amber: "#C98A2D",    // fossilized amber -- primary accent
        olive: "#5C6B4A",    // jungle canopy -- secondary accent (wins)
        rust: "#A8462F",     // extinction red -- secondary accent (losses)
        fuse: "#FF5A1F",     // lit dynamite fuse -- championship/highlight ONLY
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        card: "6px 6px 0 #C98A2D",
        "card-fuse": "6px 6px 0 #FF5A1F",
      },
    },
  },
  plugins: [],
};

export default config;
