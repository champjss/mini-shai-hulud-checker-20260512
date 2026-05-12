// TEST FIXTURE — placeholder bytes only, NOT the real malware.
// test/global.test.mjs computes this file's SHA-256 at runtime and
// temporarily patches dist/advisory/file-hashes.json to make
// that hash appear "malicious" for the check-global test.
export default { fixture: "global-compromised-placeholder" };
