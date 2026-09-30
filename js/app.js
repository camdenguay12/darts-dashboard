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
        <div class="player-meta">${player.country} • ${player.avg.toFixed(1)} avg</div>
      </div>
      <div class="score">${score ?? ''}</div>
    </div>`;
}

function marketMarkup(match) {
  if (match.status === 'final') {
    return `<div class="market"><strong>${match.player1.avg.toFixed(1)} / ${match.player2.avg.toFixed(1)}</strong><span>Final match averages</span></div>`;
  }
  return `<div class="market"><strong>${match.market1} / ${match.market2}</strong><span>Decimal odds placeholder</span></div>`;
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

function renderSummary() {
  const total = data.matches.length;
  const live = data.matches.filter(m => m.status === 'live').length;
  const upcoming = data.matches.filter(m => m.status === 'upcoming').length;
  const tournaments = new Set(data.matches.map(m => m.tournament)).size;

  summary.innerHTML = [
    ['Date', data.dateLabel],
    ['Matches', total],
    ['Live now', live],
    ['Tournaments', tournaments]
  ].map(([label,value]) => `<div class="summary-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderMatches() {
  const grouped = data.matches.reduce((acc, match) => {
    const key = `${match.tournament}__${match.round}`;
    if (!acc[key]) acc[key] = { tournament: match.tournament, round: match.round, matches: [] };
    acc[key].matches.push(match);
    return acc;
  }, {});

  container.innerHTML = Object.values(grouped).map(group => `
    <section class="tournament-block">
      <div class="tournament-head">
        <strong>${group.tournament}</strong>
        <span>${group.round}</span>
      </div>
      ${group.matches.map(match => `
        <article class="match-card" tabindex="0">
          <div class="status ${match.status}">${statusLabel(match)}</div>
          <div class="players">
            ${playerRow(match.player1, match.score1)}
            ${playerRow(match.player2, match.score2)}
          </div>
          ${marketMarkup(match)}
          <div class="details">
            <div class="form-grid">
              ${formBox(match.player1)}
              ${formBox(match.player2)}
            </div>
          </div>
        </article>`).join('')}
    </section>`).join('');

  document.querySelectorAll('.match-card').forEach(card => {
    const toggle = () => card.classList.toggle('open');
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

renderSummary();
renderMatches();
