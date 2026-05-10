const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();
const db = admin.firestore();

function nextDueAtFromRepeat(dueAt, repeat) {
  const d = dueAt && dueAt.toDate ? dueAt.toDate() : new Date(dueAt || Date.now());
  const r = String(repeat || 'none').toLowerCase();
  if (r === 'daily') d.setDate(d.getDate() + 1);
  else if (r === 'weekly') d.setDate(d.getDate() + 7);
  else if (r === 'fortnightly') d.setDate(d.getDate() + 14);
  else if (r === 'monthly') d.setMonth(d.getMonth() + 1);
  else return null;
  return admin.firestore.Timestamp.fromDate(d);
}

async function getEnabledTokens(uid) {
  const snap = await db.collection('users').doc(uid).collection('notificationTokens').where('enabled', '==', true).get();
  const tokens = [];
  const refsByToken = new Map();
  snap.forEach(doc => {
    const token = doc.get('token');
    if (token && typeof token === 'string') {
      tokens.push(token);
      refsByToken.set(token, doc.ref);
    }
  });
  return { tokens, refsByToken };
}

async function markInvalidTokens(tokens, refsByToken) {
  if (!tokens.length) return;
  const batch = db.batch();
  tokens.forEach(token => {
    const ref = refsByToken.get(token);
    if (ref) batch.set(ref, { enabled: false, disabledAt: admin.firestore.FieldValue.serverTimestamp(), disabledReason: 'invalid-fcm-token' }, { merge: true });
  });
  await batch.commit();
}

exports.sendDueAquoraXReminders = onSchedule({
  schedule: 'every 5 minutes',
  timeZone: 'Europe/London',
  region: 'europe-west2',
  memory: '256MiB',
  timeoutSeconds: 120
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const dueSnap = await db.collectionGroup('reminders')
    .where('enabled', '==', true)
    .where('status', '==', 'active')
    .where('dueAt', '<=', now)
    .limit(80)
    .get();

  for (const doc of dueSnap.docs) {
    const reminder = doc.data() || {};
    const uid = reminder.uid || (doc.ref.parent.parent && doc.ref.parent.parent.id);
    const dueAtIso = reminder.dueAtIso || (reminder.dueAt && reminder.dueAt.toDate ? reminder.dueAt.toDate().toISOString() : '');

    if (!uid) continue;
    if (reminder.sentForDueAt && reminder.sentForDueAt === dueAtIso) continue;

    const { tokens, refsByToken } = await getEnabledTokens(uid);
    if (!tokens.length) {
      await doc.ref.set({ lastSendSkippedAt: admin.firestore.FieldValue.serverTimestamp(), lastSendSkippedReason: 'no-enabled-device-tokens' }, { merge: true });
      continue;
    }

    const title = reminder.title || 'AquoraX job reminder';
    const category = reminder.category || 'Maintenance';
    const body = `${category} is due now${reminder.dueTime ? ' · ' + reminder.dueTime : ''}`;

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: `AquoraX: ${title}`, body },
      webpush: {
        fcmOptions: { link: 'https://tommythefishguy.github.io/AquoraXaquariumapp/' },
        notification: {
          icon: 'https://tommythefishguy.github.io/AquoraXaquariumapp/assets/icon-192.png',
          badge: 'https://tommythefishguy.github.io/AquoraXaquariumapp/assets/icon-192.png',
          tag: `aqx-${doc.id}`,
          requireInteraction: false
        }
      },
      data: {
        type: 'aquorax_job_reminder',
        reminderId: doc.id,
        source: String(reminder.source || 'job'),
        tankId: String(reminder.tankId || ''),
        dueAtIso: dueAtIso
      }
    });

    const invalid = [];
    response.responses.forEach((r, i) => {
      const code = r.error && r.error.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') invalid.push(tokens[i]);
    });
    await markInvalidTokens(invalid, refsByToken);

    const nextDueAt = nextDueAtFromRepeat(reminder.dueAt, reminder.repeat);
    const update = {
      lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
      sentForDueAt: dueAtIso,
      lastSendSuccessCount: response.successCount,
      lastSendFailureCount: response.failureCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (nextDueAt) {
      update.dueAt = nextDueAt;
      update.dueAtIso = nextDueAt.toDate().toISOString();
      update.sentForDueAt = null;
    } else {
      update.status = 'sent';
      update.enabled = false;
    }
    await doc.ref.set(update, { merge: true });
  }
});
