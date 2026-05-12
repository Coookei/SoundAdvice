import fs from 'fs';
import path from 'path';
import { ValidationError } from './validate.js';

// we use SecLists top 100k common password list to screen passwords:
// https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/xato-net-10-million-passwords-100000.txt
const common_passwords_file = path.resolve('app/server/data/common_passwords.txt');

const buildSet = () => {
  // read wordlist from file, and add each word to a set, so we get constant time lookups
  const raw = fs.readFileSync(common_passwords_file, 'utf8');

  const set = new Set();

  // add every line to the set
  for (const line of raw.split('\n')) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed) {
      set.add(trimmed);
    }
  }
  return set;
};

const commonPasswords = buildSet();

// validation function to block passwords that are common, contain users username or email.
export const screenPassword = (password, options = {}) => {
  const lowered = password.toLowerCase();

  // screens new passwords against our big set of common or breached passwords, NIST guideline
  if (commonPasswords.has(lowered)) {
    throw new ValidationError('Password is too common, please choose something less guessable');
  }

  // also blocks passwords that contain the users own username or email
  // since NIST advises against using context based words like usernames/emails
  const { username, email } = options;

  if (username && lowered.includes(username.toLowerCase())) {
    throw new ValidationError('Password must not contain your username');
  }

  if (email) {
    // local part is the bit before the @
    const local = email.toLowerCase().split('@')[0];
    if (local && lowered.includes(local)) {
      throw new ValidationError('Password must not contain your email');
    }
  }
};
