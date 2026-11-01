'use strict';
// Embedded renderer styles are page resources, not searchable/readable prose.
exports.withoutStyles = html => String(html || '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');
