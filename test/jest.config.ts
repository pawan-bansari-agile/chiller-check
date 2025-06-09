module.exports = {
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/src/some-folder-to-ignore/",
    "/src/__tests__/excludedFile.test.ts", // Exclude specific file
  ],
};
