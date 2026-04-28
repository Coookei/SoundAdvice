import crypto from 'crypto';

// music-themed words, short enough to unscramble easily
const WORDS = ['music', 'sound', 'piano', 'drums', 'notes'];

// in-memory store: token -> { answer, expiresAt }
const pending = new Map();

function scramble(word) {
  const letters = word.split('');
  // keep shuffling until it's different from the original
  let scrambled;
  do {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    scrambled = letters.join('');
  } while (scrambled === word);
  return scrambled;
}

export function generateCaptcha() {
  const word = WORDS[crypto.randomInt(0, WORDS.length)];
  const token = crypto.randomBytes(16).toString('hex');
  const scrambled = scramble(word);

  pending.set(token, { answer: word, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 mins

  return { token, scrambled };
}

export function verifyCaptcha(token, guess) {
  const entry = pending.get(token);
  if (!entry) return false;

  pending.delete(token); // one-time use

  if (Date.now() > entry.expiresAt) return false;

  return entry.answer === guess.toLowerCase().trim();
}

// cleanup expired entries every 10 mins
setInterval(
  () => {
    const now = Date.now();
    for (const [token, entry] of pending) {
      if (now > entry.expiresAt) pending.delete(token);
    }
  },
  10 * 60 * 1000
).unref(); // .unref() means timer wont keep the node process alive on shutdown. this stop test runs hanging indefinitely
