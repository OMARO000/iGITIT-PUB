import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const repoParam = searchParams.get("repo")
  const theme = searchParams.get("theme") ?? "dark"
  const compact = searchParams.get("compact") === "true"
  // The public address, whatever host serves this (Render behind omaro.xyz/igitit).
  const baseUrl = "https://omaro.xyz/igitit"

  if (!repoParam) {
    return new NextResponse(`console.error('[iGITit] Missing required parameter: repo');`, {
      headers: { "Content-Type": "application/javascript" }
    })
  }

  const bgColor = theme === "light" ? "#ffffff" : "#0b0b0c"
  const textColor = theme === "light" ? "#1a1a1a" : "rgba(255,255,255,0.88)"
  const borderColor = theme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"
  const mutedColor = theme === "light" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.35)"
  const amber = "#C4974A"
  const blue = "#4A9EF0"
  const green = "#4CAF7D"
  const red = "#E05C5C"

  const js = `
(function() {
  'use strict';

  var IGITIT_REPO = ${JSON.stringify(repoParam)};
  var IGITIT_BASE = ${JSON.stringify(baseUrl)};
  var IGITIT_THEME = ${JSON.stringify(theme)};
  var IGITIT_COMPACT = ${JSON.stringify(compact)};

  var styles = {
    bg: ${JSON.stringify(bgColor)},
    text: ${JSON.stringify(textColor)},
    border: ${JSON.stringify(borderColor)},
    muted: ${JSON.stringify(mutedColor)},
    amber: ${JSON.stringify(amber)},
    blue: ${JSON.stringify(blue)},
    green: ${JSON.stringify(green)},
    red: ${JSON.stringify(red)},
    font: "'IBM Plex Mono', 'Courier New', monospace",
  };

  function el(tag, css) {
    var e = document.createElement(tag);
    e.style.cssText = css;
    return e;
  }

  function scoreColor(pass) { return pass ? styles.green : styles.red; }

  function dataColor(type) {
    if (type === 'collect') return styles.blue;
    if (type === 'store') return styles.green;
    return styles.red;
  }

  function render(data) {
    var container = document.getElementById('igitit-embed');
    if (!container) { console.error('[iGITit] No element with id="igitit-embed" found'); return; }
    container.innerHTML = '';

    var repo = data.repository;
    var analysis = data.analysis;

    // WRAPPER
    var wrap = el('div',
      'background:' + styles.bg + ';' +
      'border:1px solid ' + styles.border + ';' +
      'border-radius:8px;' +
      'font-family:' + styles.font + ';' +
      'font-size:13px;' +
      'color:' + styles.text + ';' +
      'overflow:hidden;'
    );

    // HEADER
    var header = el('div',
      'padding:16px 20px;' +
      'border-bottom:1px solid ' + styles.border + ';' +
      'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;'
    );

    var repoName = el('div', 'font-weight:500;font-size:15px;letter-spacing:0.02em;');
    repoName.textContent = repo.owner + '/' + repo.repo;

    var pills = el('div', 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;');

    if (repo.language) {
      var lang = el('span', 'font-size:11px;padding:2px 8px;border:1px solid ' + styles.border + ';border-radius:3px;color:' + styles.muted + ';');
      lang.textContent = repo.language;
      pills.appendChild(lang);
    }
    if (repo.license) {
      var lic = el('span', 'font-size:11px;padding:2px 8px;border:1px solid rgba(196,151,74,0.3);border-radius:3px;color:' + styles.amber + ';');
      lic.textContent = repo.license;
      pills.appendChild(lic);
    }
    var stars = el('span', 'font-size:11px;padding:2px 8px;border:1px solid ' + styles.border + ';border-radius:3px;color:' + styles.muted + ';');
    stars.textContent = '★ ' + repo.stars;
    pills.appendChild(stars);

    header.appendChild(repoName);
    header.appendChild(pills);
    wrap.appendChild(header);

    if (!IGITIT_COMPACT) {
      // WHAT IT DOES
      var overview = analysis.overview && analysis.overview[0];
      if (overview) {
        var section = el('div', 'padding:20px;border-bottom:1px solid ' + styles.border + ';');
        var sLabel = el('div', 'font-size:10px;letter-spacing:0.12em;color:' + styles.muted + ';margin-bottom:10px;');
        sLabel.textContent = overview.title;
        var sContent = el('div', 'font-size:14px;line-height:1.75;font-weight:300;color:' + styles.text + ';opacity:0.85;');
        sContent.textContent = overview.content;
        section.appendChild(sLabel);
        section.appendChild(sContent);
        wrap.appendChild(section);
      }

      // HAI SCORE: the 9 pillars, each 1 to 5
      var NAMES = { I: 'Integrity & Transparency', II: 'Accountability Chain', III: 'Safety & Robustness', IV: 'Equality & Non-Discrimination', V: 'Human Override & Control', VI: 'Use Limits & Proportionality', VII: 'Data Ownership & Empowerment', VIII: 'Independent Audit', IX: 'Human Dignity Across the Full Stack' };
      var LEGACY = { I: 'I', A: 'II', S: 'III', E: 'IV', C: 'V', U: 'VI', E2: 'VII', D: 'IX' };
      var rescue = analysis.hai || {};
      if (!analysis.hai && analysis.rescue) Object.keys(analysis.rescue).forEach(function(k) { if (LEGACY[k]) rescue[LEGACY[k]] = analysis.rescue[k]; });
      var keys = Object.keys(NAMES).filter(function(k) { return rescue[k] && typeof rescue[k].score === 'number'; });
      if (keys.length) {
        var total = keys.reduce(function(n, k) { return n + rescue[k].score; }, 0);
        var scoreSection = el('div', 'padding:20px;border-bottom:1px solid ' + styles.border + ';');
        var sTitle = el('div', 'font-size:10px;letter-spacing:0.12em;color:' + styles.muted + ';margin-bottom:14px;');
        sTitle.textContent = 'HAI SCORE · ' + total + ' / ' + (keys.length * 5);
        scoreSection.appendChild(sTitle);
        keys.forEach(function(k) {
          var sc = rescue[k].score;
          var good = sc >= 4;
          var row = el('div', 'margin-bottom:10px;');
          var rowTop = el('div', 'display:flex;justify-content:space-between;margin-bottom:5px;');
          var dimLabel = el('span', 'font-size:12px;color:' + styles.muted + ';font-weight:300;');
          dimLabel.textContent = NAMES[k];
          var dimVerdict = el('span', 'font-size:11px;color:' + scoreColor(good) + ';');
          dimVerdict.textContent = sc + ' / 5';
          rowTop.appendChild(dimLabel);
          rowTop.appendChild(dimVerdict);
          row.appendChild(rowTop);
          var track = el('div', 'height:2px;background:rgba(128,128,128,0.15);border-radius:2px;overflow:hidden;');
          var fill = el('div', 'height:100%;width:' + (sc * 20) + '%;background:' + scoreColor(good) + ';border-radius:2px;');
          track.appendChild(fill);
          row.appendChild(track);
          scoreSection.appendChild(row);
        });
        wrap.appendChild(scoreSection);
      }
    }

    // FOOTER — powered by badge
    var footer = el('div',
      'padding:12px 20px;' +
      'display:flex;align-items:center;justify-content:space-between;' +
      'background:' + (IGITIT_THEME === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)') + ';'
    );

    var verdict = el('div', 'font-size:11px;color:' + styles.muted + ';font-weight:300;max-width:65%;line-height:1.5;');
    verdict.textContent = analysis.overallVerdict ? analysis.overallVerdict.slice(0, 120) + (analysis.overallVerdict.length > 120 ? '…' : '') : '';
    footer.appendChild(verdict);

    var badge = el('a',
      'display:flex;align-items:center;gap:6px;text-decoration:none;flex-shrink:0;',
      ''
    );
    badge.href = 'https://omaro.xyz/igitit/docs?ref=embed';
    badge.target = '_blank';
    badge.rel = 'noopener noreferrer';

    var badgeLabel = el('span', 'font-size:10px;color:' + styles.muted + ';letter-spacing:0.08em;opacity:0.7;');
    badgeLabel.textContent = 'powered by';
    var badgeName = el('span', 'font-size:11px;color:' + styles.amber + ';letter-spacing:0.04em;font-weight:500;');
    badgeName.textContent = 'iGITit';
    badge.appendChild(badgeLabel);
    badge.appendChild(badgeName);
    footer.appendChild(badge);

    wrap.appendChild(footer);
    container.appendChild(wrap);
  }

  function renderError(msg) {
    var container = document.getElementById('igitit-embed');
    if (!container) return;
    container.innerHTML = '';
    var wrap = el('div',
      'background:rgba(224,92,92,0.06);border:1px solid rgba(224,92,92,0.2);border-radius:8px;' +
      'padding:16px 20px;font-family:' + styles.font + ';font-size:13px;color:#E05C5C;'
    );
    wrap.textContent = '[iGITit] ' + msg;
    container.appendChild(wrap);
  }

  function renderLoading() {
    var container = document.getElementById('igitit-embed');
    if (!container) return;
    container.innerHTML = '';
    var wrap = el('div',
      'background:' + styles.bg + ';border:1px solid ' + styles.border + ';border-radius:8px;' +
      'padding:24px 20px;font-family:' + styles.font + ';font-size:12px;color:' + styles.muted + ';' +
      'letter-spacing:0.06em;text-align:center;'
    );
    wrap.textContent = 'analyzing ' + IGITIT_REPO + '…';
    container.appendChild(wrap);
  }

  // LOAD
  renderLoading();

  fetch(IGITIT_BASE + '/api/v1/analyze?repo=' + encodeURIComponent(IGITIT_REPO))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) { renderError(data.message || data.error); return; }
      render(data);
    })
    .catch(function(err) { renderError('Failed to load analysis. ' + err.message); });

})();
`.trim()

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
