'use strict';

// Older articles use both $x$ and $ x $. Keep the original MathJax renderer
// and block rule, and accept padding within single-line inline delimiters.
module.exports = function markdownMath(md) {
  md.use(require('markdown-it-mathjax3'));
  md.inline.ruler.before('math_inline', 'math_inline_padded', (state, silent) => {
    const start = state.pos;
    const src = state.src;
    if (src[start] !== '$' || src[start + 1] === '$') return false;
    for (let end = start + 1; end < state.posMax; end++) {
      if (src[end] === '\n' || src[end] === '\r') return false;
      if (src[end] !== '$') continue;
      let backslashes = 0;
      for (let i = end - 1; i > start && src[i] === '\\'; i--) backslashes++;
      if (backslashes % 2) continue;
      if (src[end + 1] === '$' || src[end - 1] === '$') return false;
      const content = src.slice(start + 1, end);
      if (!/^[\t ]|[\t ]$/.test(content) || !content.trim()) return false;
      // Match the upstream currency guard: a closing $ cannot precede a digit.
      if (/[0-9]/.test(src[end + 1] || '')) return false;
      if (!silent) {
        const token = state.push('math_inline', 'math', 0);
        token.markup = '$';
        token.content = content.trim();
      }
      state.pos = end + 1;
      return true;
    }
    return false;
  });
};
