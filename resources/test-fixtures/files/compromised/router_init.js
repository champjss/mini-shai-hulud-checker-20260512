// TEST FIXTURE — placeholder bytes only, NOT the real malware.
// test/files.test.mjs computes this file's SHA-256 at runtime and
// temporarily patches dist/advisory/file-hashes.json to make
// that hash appear "malicious", then restores it. No actual
// payload bytes are committed to this repository.
export default { fixture: "compromised-placeholder" };
