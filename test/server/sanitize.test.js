import { expect } from 'chai';
import { sanitiseHtml } from '../../app/server/sanitize.js';

describe('HTML Sanitiser', function () {
  it('should keep whitelisted tags intact', function () {
    expect(sanitiseHtml('<b>bold</b>')).to.equal('<b>bold</b>');
    expect(sanitiseHtml('<i>italic</i>')).to.equal('<i>italic</i>');
    expect(sanitiseHtml('<p>para</p>')).to.equal('<p>para</p>');
  });

  it('should strip disallowed tags but keep their inner text', function () {
    expect(sanitiseHtml('<div>hello</div>')).to.equal('hello');
    expect(sanitiseHtml('<script>alert(1)</script>')).to.equal('alert(1)');
    expect(sanitiseHtml('<iframe>x</iframe>')).to.equal('x');
  });

  it('should strip event handlers from allowed tags', function () {
    expect(sanitiseHtml('<b onclick="alert(1)">hi</b>')).to.equal('<b>hi</b>');
    expect(sanitiseHtml('<p onmouseover="alert(1)">hi</p>')).to.equal('<p>hi</p>');
  });

  it('should block javascript: and data: URLs in anchors', function () {
    expect(sanitiseHtml('<a href="javascript:alert(1)">x</a>')).to.equal('<a>x</a>');
    expect(sanitiseHtml('<a href="data:text/html,evil">x</a>')).to.equal('<a>x</a>');
  });

  it('should keep safe href values on anchors', function () {
    expect(sanitiseHtml('<a href="https://example.com">x</a>')).to.equal('<a href="https://example.com">x</a>');
    expect(sanitiseHtml('<a href="/post/1">x</a>')).to.equal('<a href="/post/1">x</a>');
  });

  it('should escape stray <, >, & in plain text', function () {
    expect(sanitiseHtml('a < b > c & d')).to.equal('a &lt; b &gt; c &amp; d');
  });

  it('should treat uppercase tag names the same as lowercase', function () {
    expect(sanitiseHtml('<SCRIPT>bad</SCRIPT>')).to.equal('bad');
    expect(sanitiseHtml('<B>x</B>')).to.equal('<b>x</b>');
  });

  it('should not break on malformed tags', function () {
    // a stray `<` with no closing should be escaped, not parsed as a tag
    expect(sanitiseHtml('<<script>script>')).to.contain('script');
    expect(sanitiseHtml('hello < world')).to.equal('hello &lt; world');
  });
});
