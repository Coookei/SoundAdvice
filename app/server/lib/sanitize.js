const ALLOWED_TAGS = new Set(['b', 'i', 'p', 'a']);
const SAFE_PROTOCOLS = ['http:', 'https:'];

const isSafeHref = (href) => {
  // only allow same site relative paths or http/https urls, but BLOCK javascript and data: urls

  const trimmed = href.trim();

  // allow /, # or ? as safe relative urls
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) {
    return true;
  }
  try {
    // only allow explictily http/https
    return SAFE_PROTOCOLS.includes(new URL(trimmed).protocol);
  } catch {
    return false;
  }
};

// escape a string so it can be safe inside href=""
// turn & into &amp; and " into &quot; so the value cant break out of the quotes
const escapeAttr = (value) => {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
};

export const sanitiseHtml = (input) => {
  // whitelist based HTML parsing to only keep <b>, <i>, <p>, <a>  tags - protects against stored XSS
  // everything else is stripped to prevent users injecting scrips etc

  if (!input) {
    return '';
  }

  let out = ''; // safe output string we building
  let i = 0;

  while (i < input.length) {
    // go over each character adding to output, if safe

    const char = input[i];

    if (char !== '<') {
      // not the start of a tag, so this is ordinary text so copy it across to the output

      // but first handle the two characters that could turn it into markup, & can become HTML entity eg &lt;script&gt can be <script>
      //  and > can close a tag
      if (char === '&') out += '&amp;';
      else if (char === '>') out += '&gt;';
      else out += char; // normal char, just copy
      i++;
      continue;
    }

    const next = input[i + 1] || ''; // char after '<', or '' if '<' is the last character
    // a real tag starts with a letter (<b>) or a slash (</b>)
    if (next !== '/' && !/[a-zA-Z]/.test(next)) {
      // anything else means this '<' is just text the user typed so escape it and keep going
      out += '&lt;';
      i++;
      continue;
    }

    // find where this tag closes. indexOf returns -1 if there's no '>' after the '<' at all
    // so its just a '<' in the text, not a real tag, so escape it
    const end = input.indexOf('>', i);
    if (end === -1) {
      out += '&lt;'; // '<' with no closing, render as literal text
      i++;
      continue;
    }

    // we have a complete tag now so check whether its allowed
    const rawTag = input.slice(i + 1, end); // grab everything between the < and >
    i = end + 1;

    const isClosing = rawTag.startsWith('/'); // is this closing tag like </b> or an opening tag like <b>
    const body = isClosing ? rawTag.slice(1) : rawTag; // remove / if closing tag so can check tag name

    const nameMatch = body.match(/^([a-zA-Z][a-zA-Z0-9]*)/); // from start, one letter than any number of letters/digits
    if (!nameMatch) continue; // if doesnt start with letter, just ignore and skip
    const tagName = nameMatch[1].toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) continue; // if tag not in our whitelist, ignore it

    // if closing tag and in allowlist, add the closing tag to output
    if (isClosing) {
      out += `</${tagName}>`;
      continue;
    }

    // <a> is the only tag that keeps an attribute, and only if the href passes the protocol check
    if (tagName === 'a') {
      const hrefMatch = body.match(/href\s*=\s*["']([^"']*)["']/i); // look for href="..." or href='...' and get the value within quotes
      if (hrefMatch && isSafeHref(hrefMatch[1])) {
        out += `<a href="${escapeAttr(hrefMatch[1].trim())}">`;
        continue;
      }
      out += '<a>'; // if no valid href render as <a> with no attributes
      continue;
    }

    out += `<${tagName}>`; // b, i, p tags have no attributes so just add them as is
  }

  return out;
};
