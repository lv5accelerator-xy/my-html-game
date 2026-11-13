"use strict";
// Firestore security rules, run against the local emulator only (never production):
//   firebase emulators:exec --only firestore --project demo-stellar-rules "node tests/rules/firestore-rules.cjs"
// Covers the new v3 savesV3 block and checks the existing v2 blocks still behave as before.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } = require("firebase/firestore");

const rules = fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8");

function v3(revision, extra = {}) {
  return {
    revision,
    snapshot: "H4sIAAAAAAAAA6tWKkktLlGyUlAqS8wpTVWqBQAm3k3hEgAAAA==",
    encoding: "gzip-base64",
    schema: "salvage-orbit/32",
    gameVersion: "3.32.0-preview.1",
    deviceId: "device-a",
    clientSavedAt: 1763000000000,
    summary: { chapter: 3, cores: 12, rebirths: 2, savedAt: 1763000000000 },
    updatedAt: serverTimestamp(),
    ...extra,
  };
}

async function main() {
  const env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || "demo-stellar-rules",
    firestore: { rules },
  });
  let passed = 0;
  async function check(name, fn) {
    await env.clearFirestore();
    await fn();
    passed++;
    console.log(`ok ${passed} - ${name}`);
  }
  const alice = () => env.authenticatedContext("alice").firestore();
  const bob = () => env.authenticatedContext("bob").firestore();
  const guest = () => env.unauthenticatedContext().firestore();
  const seed = async (p, data) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), p), data));

  try {
    // ---- savesV3: ownership ----
    await check("owner creates revision 1", async () => {
      await assertSucceeds(setDoc(doc(alice(), "savesV3/alice"), v3(1)));
    });
    await check("create must start at revision 1", async () => {
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(2)));
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(0)));
    });
    await check("nobody else can read, write or delete", async () => {
      await seed("savesV3/alice", { ...v3(1), updatedAt: new Date() });
      await assertSucceeds(getDoc(doc(alice(), "savesV3/alice")));
      await assertFails(getDoc(doc(bob(), "savesV3/alice")));
      await assertFails(getDoc(doc(guest(), "savesV3/alice")));
      await assertFails(setDoc(doc(bob(), "savesV3/alice"), v3(2)));
      await assertFails(setDoc(doc(guest(), "savesV3/alice"), v3(1)));
      await assertFails(deleteDoc(doc(bob(), "savesV3/alice")));
      await assertSucceeds(deleteDoc(doc(alice(), "savesV3/alice")));
    });

    // ---- savesV3: revision only moves forward by exactly one ----
    await check("update must be previous revision + 1", async () => {
      await seed("savesV3/alice", { ...v3(5), updatedAt: new Date() });
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(5)), "same revision");
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(4)), "older revision");
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(7)), "skipped revision");
      await assertSucceeds(setDoc(doc(alice(), "savesV3/alice"), v3(6)));
    });
    await check("partial update cannot keep the revision", async () => {
      await seed("savesV3/alice", { ...v3(3), updatedAt: new Date() });
      await assertFails(updateDoc(doc(alice(), "savesV3/alice"), { snapshot: "eA==", updatedAt: serverTimestamp() }));
    });

    // ---- savesV3: shape ----
    await check("required fields and field whitelist", async () => {
      const missing = v3(1);
      delete missing.encoding;
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), missing));
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(1, { email: "a@example.com" })));
    });
    await check("snapshot size and encoding limits", async () => {
      await assertSucceeds(setDoc(doc(alice(), "savesV3/alice"), v3(1, { snapshot: "x".repeat(700000) })));
      await env.clearFirestore();
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(1, { snapshot: "x".repeat(700001) })));
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(1, { snapshot: "" })));
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(1, { encoding: "zip" })));
      await assertSucceeds(setDoc(doc(alice(), "savesV3/alice"), v3(1, { encoding: "json", snapshot: "{}" })));
    });
    await check("typed metadata and server timestamp", async () => {
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(1, { revision: 1.5 })));
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(1, { clientSavedAt: -1 })));
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(1, { deviceId: "d".repeat(65) })));
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(1, { summary: "chapter 3" })));
      await assertFails(setDoc(doc(alice(), "savesV3/alice"), v3(1, { updatedAt: new Date(0) })));
    });

    // ---- existing v2 blocks keep their behaviour ----
    await check("v2 saves: owner only, envelope unchanged", async () => {
      await assertSucceeds(setDoc(doc(alice(), "saves/alice"), { revision: 1, snapshot: "{}", deviceId: "x" }));
      await assertFails(getDoc(doc(bob(), "saves/alice")));
      await assertFails(setDoc(doc(alice(), "saves/alice"), { snapshot: "{}" }));
    });
    await check("v3 permission does not reach v2 saves of others", async () => {
      await assertFails(setDoc(doc(alice(), "saves/bob"), { revision: 1, snapshot: "{}" }));
    });
    await check("v2 leaderboards still readable when signed in only", async () => {
      await seed("leaderboards/bob", { playerName: "Bob" });
      await assertSucceeds(getDoc(doc(alice(), "leaderboards/bob")));
      await assertFails(getDoc(doc(guest(), "leaderboards/bob")));
    });
    await check("unknown collections stay closed", async () => {
      await assertFails(setDoc(doc(alice(), "savesV4/alice"), v3(1)));
      await assertFails(getDoc(doc(alice(), "savesV4/alice")));
    });

    console.log(`firestore rules ok: ${passed} checks`);
  } finally {
    await env.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
