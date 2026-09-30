const data = window.DARTS_DATA;
const container = document.getElementById('matchesContainer');
const summary = document.getElementById('summaryStrip');

function initials(name) {
  return name.split(' ').map(p => p[0]).slice(0,2).join('');
}

function statusLabel(match) {
  if (match.status === 'live') return 'Live';
  if (match.status === 'final') return 'Final';
  return match.time;
}

function playerRow(player, score) {
  return `
    <div class="player-row">
      <div class="avatar">${initials(player.name)}</div>
      <div>
        <div class="player-name">${player.name}</div>
        <div class="player-meta">${player.country} • ${player.avg.toFixed(1)} recent avg</div>
      </div>
      <div class="score">${score ?? ''}</div>
    </div>`;
}

function marketMarkup(match) {
  if (match.status === 'final') {
    return `<div class="market"><strong>${match.player1.avg.toFixed(1)} / ${match.player2.avg.toFixed(1)}</strong><span>Final match averages</span></div>`;
  }
  return `<div class="market"><strong>${match.market1} / ${match.market2}</strong><span>${match.marketNote || 'Decimal odds placeholder'}</span></div>`;
}

function formBox(player) {
  return `
    <div class="form-box">
      <h4>${player.name} — last 5 averages</h4>
      <div class="form-line">
        ${player.form.map(v => `<span class="pill">${v.toFixed(1)}</span>`).join('')}
      </div>
    </div>`;
}

function chartMarkup(match, index) {
  return `
    <div class="trend-panel">
      <div class="trend-head">
        <div><span class="trend-kicker">FORM TREND</span><h3>Recent 3-Dart Averages</h3></div>
        <span class="trend-note">Most recent →</span>
      </div>
      <div class="chart-wrap"><canvas id="chart-${index}" width="900" height="260" aria-label="Recent averages chart"></canvas></div>
      <div class="chart-legend"><span><i class="series-dot series-one"></i>${match.player1.name}</span><span><i class="series-dot series-two"></i>${match.player2.name}</span></div>
    </div>`;
}

function drawTrend(canvas, match) {
  if (!canvas || canvas.dataset.drawn) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = 260;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.scale(dpr, dpr);
  canvas.dataset.drawn = 'true';

  const pad = { l: 44, r: 18, t: 22, b: 35 };
  const values = [...match.player1.form, ...match.player2.form];
  const min = Math.floor(Math.min(...values) - 2);
  const max = Math.ceil(Math.max(...values) + 2);
  const x = i => pad.l + i * ((cssWidth - pad.l - pad.r) / 4);
  const y = v => pad.t + (max - v) * ((cssHeight - pad.t - pad.b) / (max - min));

  ctx.font = '11px Inter';
  ctx.fillStyle = '#7f8a93';
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const value = min + i * ((max - min) / 3);
    const yy = y(value);
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(cssWidth - pad.r, yy); ctx.stroke();
    ctx.fillText(value.toFixed(0), 8, yy + 4);
  }
  ['-5','-4','-3','-2','-1'].forEach((label,i) => ctx.fillText(label, x(i)-6, cssHeight-10));

  const drawSeries = (series, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); series.forEach((v,i) => i ? ctx.lineTo(x(i),y(v)) : ctx.moveTo(x(i),y(v))); ctx.stroke();
    series.forEach((v,i) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x(i),y(v),4.5,0,Math.PI*2); ctx.fill(); });
  };
  drawSeries(match.player1.form, '#ef3e46');
  drawSeries(match.player2.form, '#f2c14e');
}

function renderSummary() {
  const total = data.matches.length;
  const live = data.matches.filter(m => m.status === 'live').length;
  const tournaments = new Set(data.matches.map(m => m.tournament)).size;
  summary.innerHTML = [
    ['Date', data.dateLabel], ['Matches', total], ['Live now', live], ['Tournaments', tournaments]
  ].map(([label,value]) => `<div class="summary-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderMatches() {
  const grouped = data.matches.reduce((acc, match, index) => {
    const key = `${match.tournament}__${match.round}`;
    if (!acc[key]) acc[key] = { tournament: match.tournament, round: match.round, matches: [] };
    acc[key].matches.push({ ...match, chartIndex: index });
    return acc;
  }, {});

  container.innerHTML = Object.values(grouped).map(group => `
    <section class="tournament-block">
      <div class="tournament-head"><strong>${group.tournament}</strong><span>${group.round}</span></div>
      ${group.matches.map(match => `
        <article class="match-card" tabindex="0" data-chart="${match.chartIndex}">
          <div class="status ${match.status}">${statusLabel(match)}</div>
          <div class="players">${playerRow(match.player1, match.score1)}${playerRow(match.player2, match.score2)}</div>
          ${marketMarkup(match)}
          <div class="details">
            ${chartMarkup(match, match.chartIndex)}
            <div class="form-grid">${formBox(match.player1)}${formBox(match.player2)}</div>
          </div>
        </article>`).join('')}
    </section>`).join('');

  document.querySelectorAll('.match-card').forEach(card => {
    const toggle = () => {
      card.classList.toggle('open');
      if (card.classList.contains('open')) {
        const index = Number(card.dataset.chart);
        requestAnimationFrame(() => drawTrend(document.getElementById(`chart-${index}`), data.matches[index]));
      }
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

renderSummary();
renderMatches();
