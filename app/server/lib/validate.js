// input validation used across the server side controllers
// each helper will return the cleaned value or throw a ValidationError

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validate = (fn) => {
  // takes in some fields to validate and clean, if any field fails validation this returns ok: false, and controller returns 400
  // if all passed fields pass validation, then ok: true, and cleaned values are returned
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
};

export const requireString = (value, label, opts = {}) => {
  const { min = 0, max = Infinity, trim = false } = opts;

  if (typeof value !== 'string') {
    throw new ValidationError(`${label} is required`);
  }

  const cleaned = trim ? value.trim() : value;

  if (cleaned.length < min) {
    if (min === 1) {
      throw new ValidationError(`${label} is required`);
    } else {
      throw new ValidationError(`${label} must be at least ${min} characters`);
    }
  }

  if (cleaned.length > max) {
    throw new ValidationError(`${label} must be ${max} characters or less`);
  }
  return cleaned;
};

export const requireEmail = (value) => {
  const cleaned = requireString(value, 'Email', { min: 1, max: 255, trim: true });

  // email check with regex requires non whitespace before and aftr the @, plus a dot in the domain
  // accepts things like email@domain.com
  // ^\S+ means from the start of the string, match one or more characters that are not spaces
  if (!/^\S+@\S+\.\S+$/.test(cleaned)) {
    throw new ValidationError('Invalid email');
  }
  // the encrypted email column handles uniqueness/storage already so dont need any checks here
  return cleaned;
};

export const requirePassword = (value) => {
  // only validate minimum length as in the NIST Password Recommendations lecture
  if (typeof value !== 'string') {
    throw new ValidationError('Password is required');
  }
  if (value.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }
  if (value.length > 128) {
    throw new ValidationError('Password must be 128 characters or less');
  }
  return value;
};

export const requireUsername = (value) => {
  const cleaned = requireString(value, 'Username', { min: 3, max: 25, trim: true });

  // from start of string, any uppercase,lowercase,digit or underscore, 1 or more so not empty
  if (!/^[A-Za-z0-9_]+$/.test(cleaned)) {
    throw new ValidationError('Username can only contain letters, numbers and underscores');
  }
  return cleaned;
};

export const requireDigitCode = (value, len) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError('Code is required');
  }
  const str = String(value);

  // construct a regex with variable that matches exact length of digits
  if (!new RegExp(`^[0-9]{${len}}$`).test(str)) {
    throw new ValidationError(`Code must be ${len} digits`);
  }
  return str;
};

export const requirePositiveInt = (value, label) => {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`Invalid ${label}`);
  }
  // only accept integer strings or actual numbers, no decimals, no negative, no NaN
  const str = String(value);

  // from start of string, start with digit 1-9, followed by zero or more digits 0-9
  if (!/^[1-9][0-9]*$/.test(str)) {
    throw new ValidationError(`Invalid ${label}`);
  }
  const n = Number(str); // convert to number now

  if (n > Number.MAX_SAFE_INTEGER) {
    // make sure number not too big
    throw new ValidationError(`Invalid ${label}`);
  }
  return n;
};

export const requireOneOf = (value, allowed, label) => {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${label} must be one of: ${allowed.join(', ')}`);
  }
  return value;
};
