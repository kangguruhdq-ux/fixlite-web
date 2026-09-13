import fs from 'node:fs';
import path from 'node:path';

function findStrings(dir) {
  const list = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      list.push(...findStrings(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      
      // 1. Text between JSX tags >text<
      for (const m of content.matchAll(/>([^<>{}\n\r]+)</g)) {
        const s = m[1].replace(/\s+/g, ' ').trim();
        if (s && /[a-zA-Z]/.test(s) && !s.startsWith('&') && s.length > 1 && !s.startsWith('var(')) list.push(s);
      }

      // 2. Attributes placeholder, title, aria-label
      for (const m of content.matchAll(/(?:placeholder|title|aria-label)=["']([^"']+)["']/g)) {
        const s = m[1].replace(/\s+/g, ' ').trim();
        if (s && /[a-zA-Z]/.test(s) && s.length > 1) list.push(s);
      }

      // 3. String literals in JS/TSX like 'Ringkasan', "Pengguna", label: '...'
      for (const m of content.matchAll(/(?:label|name|title|category|status):\s*['"]([^'"]+)['"]/g)) {
        const s = m[1].replace(/\s+/g, ' ').trim();
        if (s && /[a-zA-Z]/.test(s) && s.length > 1) list.push(s);
      }

      // 4. Arrays like ['projects', 'Proyek'] or ['totalUsers', 'Pengguna']
      for (const m of content.matchAll(/\[['"][a-zA-Z0-9_-]+['"],\s*['"]([^'"]+)['"]/g)) {
        const s = m[1].replace(/\s+/g, ' ').trim();
        if (s && /[a-zA-Z]/.test(s) && s.length > 1) list.push(s);
      }
    }
  }
  return list;
}

const strings = [...new Set(findStrings('apps/admin/src'))].sort();
console.log('Total unique admin UI strings found:', strings.length);
fs.writeFileSync('artifacts/i18n/admin_strings.json', JSON.stringify(strings, null, 2));
