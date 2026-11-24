// Live translation for text that comes from data/tracker.json (project notes, news,
// headlines and the change feed). The UI dictionary in i18n.js handles fixed labels;
// this module handles content that changes every time the scout runs.
//
// Primary engine: Bilibili's free Index-Translate endpoint (CORS-enabled, no key).
// Fallback: MyMemory's public anonymous API (also CORS-enabled, 5k chars/day).
// Translations are cached in localStorage so a sentence is only translated once.
(function () {
  var CACHE_KEY = 'pw-tr-cache-v1';
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch (e) { cache = {}; }
  var dirty = false;

  function save() {
    if (!dirty) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      // Bound the cache: keep the newest 600 entries.
      var keys = Object.keys(cache);
      if (keys.length > 600) {
        var next = {};
        keys.slice(-600).forEach(function (k) { next[k] = cache[k]; });
        cache = next;
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
    } catch (e) { /* storage full or disabled: keep translating in memory */ }
    dirty = false;
  }

  var PROMPT = 'Translate the following English text to Simplified Chinese. Keep proper names, technical terms like GTA VI, FPS and shader names accurate, and preserve punctuation. Return only the translation, with no explanation.';

  async function bilibili(text) {
    var res = await fetch('https://index-translate.bilibili.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'Index-Translate-35B-A3B',
        messages: [{ role: 'user', content: PROMPT + '\n\n' + text }],
        stream: false,
      }),
    });
    if (!res.ok) throw new Error('Bilibili ' + res.status);
    var data = await res.json();
    var out = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!out || !out.trim()) throw new Error('Bilibili empty');
    return out.trim();
  }

  async function mymemory(text) {
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text.slice(0, 480)) + '&langpair=en|zh-CN';
    var res = await fetch(url);
    if (!res.ok) throw new Error('MyMemory ' + res.status);
    var data = await res.json();
    var out = data.responseData && data.responseData.translatedText;
    if (!out || data.responseStatus !== 200) throw new Error('MyMemory failed');
    return out;
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, ms); }),
    ]);
  }

  var pending = {};
  function translate(text) {
    if (text == null) return Promise.resolve(text);
    var raw = String(text);
    if (!/[A-Za-z]{3}/.test(raw) || raw.length > 1200) return Promise.resolve(raw);
    if (cache[raw]) return Promise.resolve(cache[raw]);
    if (pending[raw]) return pending[raw];
    pending[raw] = (async function () {
      var out = raw;
      try { out = await withTimeout(bilibili(raw), 12000); }
      catch (e) {
        try { out = await withTimeout(mymemory(raw), 10000); }
        catch (e2) { return raw; } // leave original English if both engines fail
      }
      if (out && out !== raw) { cache[raw] = out; dirty = true; save(); }
      return out;
    })();
    pending[raw].finally(function () { delete pending[raw]; });
    return pending[raw];
  }

  window.PWTRANSLATE = {
    translate: translate,
    cached: function (s) { return cache[s] || null; },
    clear: function () { cache = {}; try { localStorage.removeItem(CACHE_KEY); } catch (e) {} },
  };
})();
