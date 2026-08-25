"use strict";

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const boundedScore = (value) => Math.min(1_000_000_000, Math.max(0, Math.floor(Number(value) || 0)));
const longTermContribution = (data = {}) => boundedScore(
  Math.min(1000, data.battleCount || 0)
  + Math.min(250, data.expeditionRuns || 0) * 6
  + Math.min(120, data.expeditionBossWins || 0) * 18
  + Math.min(60, data.transcensions || 0) * 45
  + Math.min(120, data.frontierSectors || 0) * 24,
);

async function applyDelta(totalId, beforeScore, afterScore, beforeExists, afterExists) {
  const reference = db.collection("communityTotals").doc(totalId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists ? snapshot.data() : {};
    transaction.set(reference, {
      total: Math.max(0, boundedScore(current.total) + afterScore - beforeScore),
      participants: Math.max(0, Math.floor(Number(current.participants) || 0) + Number(afterExists) - Number(beforeExists)),
      published: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

exports.aggregateSeasonContribution = onDocumentWritten(
  "seasonContributions/{seasonId}/players/{userId}",
  async (event) => {
    const beforeExists = event.data.before.exists;
    const afterExists = event.data.after.exists;
    const beforeScore = beforeExists ? boundedScore(event.data.before.data().score) : 0;
    const afterScore = afterExists ? boundedScore(event.data.after.data().score) : 0;
    await applyDelta(event.params.seasonId, beforeScore, afterScore, beforeExists, afterExists);
  },
);

exports.aggregateLongTermBeacon = onDocumentWritten(
  "leaderboards/{userId}",
  async (event) => {
    const beforeExists = event.data.before.exists;
    const afterExists = event.data.after.exists;
    const beforeScore = beforeExists ? longTermContribution(event.data.before.data()) : 0;
    const afterScore = afterExists ? longTermContribution(event.data.after.data()) : 0;
    await applyDelta("current", beforeScore, afterScore, beforeExists, afterExists);
  },
);
