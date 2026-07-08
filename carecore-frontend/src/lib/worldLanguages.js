import ISO6391 from "iso-639-1";

// Canonical ISO 639-1 language names, English first, then alphabetical.
export const WORLD_LANGUAGES = [
  "English",
  ...ISO6391.getAllNames().filter(name => name !== "English").sort(),
];
