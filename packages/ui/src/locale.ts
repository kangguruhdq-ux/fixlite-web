import { useSyncExternalStore } from 'react';
import { uiCopy } from './ui-copy';
export type SupportedLanguage='id'|'en';
const read=():SupportedLanguage=>{if(typeof document==='undefined')return 'id';const cookie=document.cookie.match(/(?:^|; )pixellift_lang=(id|en)(?:;|$)/)?.[1];const saved=cookie||localStorage.getItem('pixellift_lang');return saved==='en'?'en':'id';};
let current=read();const listeners=new Set<()=>void>();
export const getLanguage=()=>current;export const languageLocale=()=>current==='en'?'en-US':'id-ID';export const subscribeLanguage=(fn:()=>void)=>{listeners.add(fn);return()=>listeners.delete(fn);};
export function setAppLanguage(language:SupportedLanguage){current=language;if(typeof document!=='undefined'){localStorage.setItem('pixellift_lang',language);document.cookie='pixellift_lang='+language+'; Path=/; Max-Age=31536000; SameSite=Lax';document.documentElement.lang=language;}listeners.forEach(fn=>fn());}
export const useAppLanguage=()=>useSyncExternalStore(subscribeLanguage,getLanguage,()=> 'id' as SupportedLanguage);
if(typeof window!=='undefined'){const sync=()=>{const next=read();if(next!==current)setAppLanguage(next);};window.addEventListener('focus',sync);window.addEventListener('storage',e=>{if(e.key==='pixellift_lang'&&(e.newValue==='en'||e.newValue==='id'))setAppLanguage(e.newValue);});document.documentElement.lang=current;}
const norm = (v: string) => v.replace(/\s+/g, ' ').trim();
const dictionary = new Map<string, { id: string; en: string }>();
const lowerDict = new Map<string, { id: string; en: string }>();

for (const [id, en] of uiCopy) {
  const entry = { id, en };
  dictionary.set(norm(id), entry);
  dictionary.set(norm(en), entry);
  lowerDict.set(norm(id).toLowerCase(), entry);
  lowerDict.set(norm(en).toLowerCase(), entry);
}

export function translateText(value: string, language: SupportedLanguage = current): string {
  if (!value || typeof value !== 'string') return value;
  const n = norm(value);
  const entry = dictionary.get(n) || lowerDict.get(n.toLowerCase());
  if (entry) {
    const lead = value.slice(0, value.search(/\S|$/));
    const tail = value.match(/\s*$/)?.[0] || '';
    return lead + entry[language] + tail;
  }
  if (language === 'en') {
    const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
      [/^Background berhasil dihapus dengan (.+)\.$/, (m) => 'Background removed with ' + m[1] + '.'],
      [/^(\d+)\s*data\s*[·&middot;]\s*Halaman\s*(\d+)\s*\/\s*(\d+)$/i, (m) => `${m[1]} records · Page ${m[2]} / ${m[3]}`],
      [/^Halaman\s*(\d+)\s*\/\s*(\d+)$/i, (m) => `Page ${m[1]} / ${m[2]}`],
      [/^(\d+)\s*data$/i, (m) => `${m[1]} records`],
      [/^Menampilkan\s*(\d+)\s*dari\s*total\s*(\d+)\s*pengguna$/i, (m) => `Showing ${m[1]} of total ${m[2]} users`],
      [/^(\d+)\s*data\s*[·&middot;]\s*Halaman\s*(\d+)\s*dari\s*(\d+)$/i, (m) => `${m[1]} records · Page ${m[2]} of ${m[3]}`],
      [/^(.+)%\s*dibanding 7 hari sebelumnya$/i, (m) => `${m[1]}% vs previous 7 days`],
      [/^(\d+)\s*dari\s*(\d+)\s*proses berhasil dalam\s*(\d+)\s*hari\.\s*(\d+)\s*ekspor tercatat\.$/i, (m) => `${m[1]} of ${m[2]} processes succeeded in ${m[3]} days. ${m[4]} exports recorded.`],
      [/^Belum ada pemrosesan pada periode ini\.$/i, () => 'No processes recorded in this period.'],
    ];
    for (const [r, fn] of rules) {
      const m = n.match(r);
      if (m) return fn(m);
    }
  } else if (language === 'id') {
    const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
      [/^Background removed with (.+)\.$/, (m) => 'Background berhasil dihapus dengan ' + m[1] + '.'],
      [/^(\d+)\s*records\s*[·&middot;]\s*Page\s*(\d+)\s*\/\s*(\d+)$/i, (m) => `${m[1]} data · Halaman ${m[2]} / ${m[3]}`],
      [/^Page\s*(\d+)\s*\/\s*(\d+)$/i, (m) => `Halaman ${m[1]} / ${m[2]}`],
      [/^(\d+)\s*records$/i, (m) => `${m[1]} data`],
      [/^Showing\s*(\d+)\s*of\s*total\s*(\d+)\s*users$/i, (m) => `Menampilkan ${m[1]} dari total ${m[2]} pengguna`],
      [/^(\d+)\s*records\s*[·&middot;]\s*Page\s*(\d+)\s*of\s*(\d+)$/i, (m) => `${m[1]} data · Halaman ${m[2]} dari ${m[3]}`],
      [/^(.+)%\s*vs previous 7 days$/i, (m) => `${m[1]}% dibanding 7 hari sebelumnya`],
    ];
    for (const [r, fn] of rules) {
      const m = n.match(r);
      if (m) return fn(m);
    }
  }
  return value;
}

// Global DOM Auto-Translator
let isTranslatingDom = false;

function translateDomNode(node: Node, lang: SupportedLanguage) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (!parent) return;
    const tag = parent.tagName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE' || tag === 'NOSCRIPT' || tag === 'SVG' || parent.closest('svg')) return;
    if (parent.closest('[data-no-translate]')) return;

    const original = node.nodeValue;
    if (original && original.trim().length > 0) {
      const translated = translateText(original, lang);
      if (translated && translated !== original) {
        node.nodeValue = translated;
      }
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE' || tag === 'NOSCRIPT' || tag === 'SVG' || el.closest('svg')) return;
    if (el.closest('[data-no-translate]')) return;

    // Translate placeholder
    if ('placeholder' in el && typeof (el as any).placeholder === 'string') {
      const p = (el as any).placeholder;
      if (p && p.trim()) {
        const trans = translateText(p, lang);
        if (trans !== p) (el as any).placeholder = trans;
      }
    }

    // Translate title
    if (typeof el.title === 'string' && el.title.trim()) {
      const t = translateText(el.title, lang);
      if (t !== el.title) el.title = t;
    }

    // Translate aria-label
    const aria = el.getAttribute('aria-label');
    if (aria && aria !== 'Language Toggle') {
      const transAria = translateText(aria, lang);
      if (transAria !== aria) el.setAttribute('aria-label', transAria);
    }

    // Translate select options
    if (tag === 'OPTION') {
      const opt = el as HTMLOptionElement;
      const t = translateText(opt.text, lang);
      if (t !== opt.text) opt.text = t;
    }

    // Process children
    for (let i = 0; i < el.childNodes.length; i++) {
      translateDomNode(el.childNodes[i], lang);
    }
  }
}

export function scanAndTranslateDom(root: HTMLElement | Document = document, lang: SupportedLanguage = current) {
  if (typeof window === 'undefined' || !root || isTranslatingDom) return;
  isTranslatingDom = true;
  try {
    const target = root === document ? (document.body || document.documentElement) : root;
    if (target) {
      translateDomNode(target, lang);
    }
  } finally {
    isTranslatingDom = false;
  }
}

// Initialize DOM Auto-Translation
if (typeof window !== 'undefined') {
  subscribeLanguage(() => {
    setTimeout(() => {
      if (document.body) scanAndTranslateDom(document.body, current);
    }, 50);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (document.body) scanAndTranslateDom(document.body, current);
      }, 50);
    });
  } else {
    setTimeout(() => {
      if (document.body) scanAndTranslateDom(document.body, current);
    }, 50);
  }
}
