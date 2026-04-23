// whitelist based HTML parser, only allows <b>, <i>, <p>, <a> tags. everything else is stripped
// so user content can never inject scripts, iframes, event handlers, styles etc.
// scans character by character rather than using regex because malformed or nested tags can
// fool a regex but are handled cleanly by a state based parse.

const ALLOWED_TAGS = new Set(['b', 'i', 'p', 'a']);
const SAFE_PROTOCOLS = ['http:', 'https:'];

// only allow same site relative paths or explicit http(s), blocks javascript: and data: URLs
function isSafeHref(href) {
  const trimmed = href.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) return true;
  try {
    return SAFE_PROTOCOLS.includes(new URL(trimmed).protocol);
  } catch {
    return false;
  }
}

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function sanitiseHtml(input) {
  if (!input) return '';

  let out = '';
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (char !== '<') {
      // escape & and > in text so user typed characters can never become markup
      if (char === '&') out += '&amp;';
      else if (char === '>') out += '&gt;';
      else out += char;
      i++;
      continue;
    }

    const end = input.indexOf('>', i);
    if (end === -1) {
      // stray '<' with no closing, render as literal text
      out += '&lt;';
      i++;
      continue;
    }

    const rawTag = input.slice(i + 1, end);
    i = end + 1;

    const isClosing = rawTag.startsWith('/');
    const body = isClosing ? rawTag.slice(1) : rawTag;

    const nameMatch = body.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    if (!nameMatch) continue;
    const tagName = nameMatch[1].toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) continue;

    if (isClosing) {
      out += `</${tagName}>`;
      continue;
    }

    // <a> is the only tag that keeps an attribute, and only if the href passes the protocol check
    if (tagName === 'a') {
      const hrefMatch = body.match(/href\s*=\s*["']([^"']*)["']/i);
      if (hrefMatch && isSafeHref(hrefMatch[1])) {
        out += `<a href="${escapeAttr(hrefMatch[1].trim())}">`;
        continue;
      }
      out += '<a>';
      continue;
    }

    out += `<${tagName}>`;
  }

  return out;
}
