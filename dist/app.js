import { buildApiUrl, filterStudies, isRecruiting, normalizeStudy, summarize } from './lib.js';

const $ = (selector) => document.querySelector(selector);
const els = {
  form: $('#search-form'), condition: $('#condition'), location: $('#location'), title: $('#query-title'), updated: $('#updated-at'),
  metrics: $('#metric-grid'), total: $('#metric-total'), recruiting: $('#metric-recruiting'), results: $('#metric-results'), countries: $('#metric-countries'),
  phaseChart: $('#phase-chart'), map: $('#map-visual'), list: $('#study-list'), shown: $('#shown-count'), more: $('#load-more'),
  phase: $('#phase-filter'), type: $('#type-filter'), sort: $('#sort-filter'),
};
const state = {
  studies: [], totalCount: 0, nextPageToken: '', loading: false, controller: null,
  query: { condition: 'Type 2 diabetes', location: '' }, filters: { quick: 'all', phase: 'all', type: 'all', sort: 'updated' },
};
const statusLabels = {
  RECRUITING: 'Идёт набор', NOT_YET_RECRUITING: 'Набор ещё не начат', ENROLLING_BY_INVITATION: 'Набор по приглашению',
  ACTIVE_NOT_RECRUITING: 'Активно, без набора', COMPLETED: 'Завершено', SUSPENDED: 'Приостановлено', TERMINATED: 'Прекращено',
  WITHDRAWN: 'Отозвано', APPROVED_FOR_MARKETING: 'Одобрено', NO_LONGER_AVAILABLE: 'Недоступно', AVAILABLE: 'Доступно',
  TEMPORARILY_NOT_AVAILABLE: 'Временно недоступно', UNKNOWN: 'Статус неизвестен',
};
const phaseLabels = { EARLY_PHASE1: 'Ранняя фаза 1', PHASE1: 'Фаза 1', PHASE2: 'Фаза 2', PHASE3: 'Фаза 3', PHASE4: 'Фаза 4', NA: 'Не применимо' };
const typeLabels = { INTERVENTIONAL: 'Интервенционное', OBSERVATIONAL: 'Наблюдательное', EXPANDED_ACCESS: 'Расширенный доступ', UNKNOWN: 'Не указан' };
const countryCoordinates = {
  'United States': [-100, 39], Canada: [-106, 57], Mexico: [-102, 23], Brazil: [-52, -10], Argentina: [-64, -35], Chile: [-71, -30],
  'United Kingdom': [-3, 55], France: [2, 46], Germany: [10, 51], Spain: [-4, 40], Italy: [12, 42], Poland: [20, 52],
  Netherlands: [5, 52], Belgium: [4, 51], Sweden: [16, 62], Denmark: [10, 56], Norway: [9, 62], Switzerland: [8, 47],
  Türkiye: [35, 39], Turkey: [35, 39], Israel: [35, 31], Egypt: [30, 27], 'South Africa': [24, -29], Kenya: [38, 1], Nigeria: [8, 9],
  India: [79, 22], China: [104, 35], Japan: [138, 37], 'South Korea': [128, 36], Australia: [134, -25], 'New Zealand': [174, -41],
  Kazakhstan: [67, 48], Uzbekistan: [64, 41], Kyrgyzstan: [75, 41], Ukraine: [31, 49], Russia: [90, 61], Singapore: [104, 1], Taiwan: [121, 24],
};

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function compactNumber(value) { return new Intl.NumberFormat('ru-RU', { notation: value > 9999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value); }
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value.length === 7 ? `${value}-01` : value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' }).format(date);
}
function setLoading(isLoading, append = false) {
  state.loading = isLoading;
  els.form.querySelector('button[type="submit"]').disabled = isLoading;
  els.more.disabled = isLoading;
  els.metrics.setAttribute('aria-busy', String(isLoading));
  if (isLoading && !append) els.list.innerHTML = '<div class="loading-card"><span class="loader"></span><p>Загружаем актуальные исследования…</p></div>';
  if (isLoading && append) els.more.textContent = 'Загрузка…';
  if (!isLoading) els.more.textContent = 'Загрузить ещё';
}

async function fetchStudies({ append = false } = {}) {
  if (state.loading) state.controller?.abort();
  state.controller = new AbortController();
  setLoading(true, append);
  try {
    const response = await fetch(buildApiUrl({ ...state.query, pageToken: append ? state.nextPageToken : '' }), { signal: state.controller.signal });
    if (!response.ok) throw new Error(`ClinicalTrials.gov ответил с кодом ${response.status}`);
    const payload = await response.json();
    const incoming = (payload.studies ?? []).map(normalizeStudy);
    state.studies = append ? [...state.studies, ...incoming] : incoming;
    state.totalCount = Number(payload.totalCount ?? state.studies.length);
    state.nextPageToken = payload.nextPageToken ?? '';
    els.updated.textContent = `Обновлено ${new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`;
    els.title.textContent = [state.query.condition, state.query.location].filter(Boolean).join(' · ') || 'Все исследования';
    updateUrl();
    render();
  } catch (error) {
    if (error.name === 'AbortError') return;
    els.updated.textContent = 'Источник временно недоступен';
    els.list.innerHTML = `<div class="error-card"><strong>Не удалось загрузить данные</strong><p>${escapeHtml(error.message)}</p><button class="secondary-button" type="button" id="retry-button">Повторить</button></div>`;
    $('#retry-button')?.addEventListener('click', () => fetchStudies());
    els.shown.textContent = 'Ошибка загрузки';
  } finally { setLoading(false); }
}
function updateUrl() {
  const url = new URL(window.location.href);
  state.query.condition ? url.searchParams.set('condition', state.query.condition) : url.searchParams.delete('condition');
  state.query.location ? url.searchParams.set('location', state.query.location) : url.searchParams.delete('location');
  history.replaceState(null, '', url);
}
function render() {
  const summary = summarize(state.studies);
  els.total.textContent = compactNumber(state.totalCount); els.recruiting.textContent = compactNumber(summary.recruiting);
  els.results.textContent = compactNumber(summary.withResults); els.countries.textContent = compactNumber(summary.countries);
  els.metrics.setAttribute('aria-busy', 'false'); renderPhases(summary.phaseCounts); renderMap(summary.countryCounts); renderStudies();
}
function renderPhases(entries) {
  if (!entries.length) { els.phaseChart.innerHTML = '<p class="empty-note">Нет данных о фазах в загруженной выборке.</p>'; return; }
  const max = Math.max(...entries.map(([, count]) => count), 1);
  els.phaseChart.innerHTML = entries.slice(0, 6).map(([phase, count]) => `<div class="phase-row"><span>${escapeHtml(phaseLabels[phase] ?? phase)}</span><div class="phase-track"><i style="width:${Math.max(4, (count / max) * 100)}%"></i></div><strong>${count}</strong></div>`).join('');
}
function renderMap(entries) {
  if (!entries.length) { els.map.innerHTML = '<p class="empty-note">У исследований не указана география.</p>'; return; }
  const max = Math.max(...entries.map(([, count]) => count), 1);
  const points = entries.filter(([country]) => countryCoordinates[country]).map(([country, count]) => {
    const [lon, lat] = countryCoordinates[country]; const x = ((lon + 180) / 360) * 100; const y = ((90 - lat) / 180) * 100;
    const radius = 4 + Math.sqrt(count / max) * 8;
    return `<span class="map-dot" style="left:${x}%;top:${y}%;width:${radius}px;height:${radius}px" title="${escapeHtml(country)}: ${count}"></span>`;
  }).join('');
  const top = entries.slice(0, 5).map(([country, count]) => `<li><span>${escapeHtml(country)}</span><b>${count}</b></li>`).join('');
  els.map.innerHTML = `<div class="world-map" aria-hidden="true"><span class="continent c1"></span><span class="continent c2"></span><span class="continent c3"></span><span class="continent c4"></span>${points}</div><ol class="country-list">${top}</ol>`;
}
function renderStudies() {
  const studies = filterStudies(state.studies, state.filters);
  els.shown.textContent = `Показано ${studies.length} из ${state.studies.length} загруженных · Всего по запросу: ${state.totalCount.toLocaleString('ru-RU')}`;
  els.more.hidden = !state.nextPageToken;
  if (!studies.length) { els.list.innerHTML = '<div class="empty-card"><strong>Нет исследований с такими фильтрами</strong><p>Измените фазу, тип или статус.</p></div>'; return; }
  els.list.innerHTML = studies.map((study) => {
    const locations = study.countries.length ? study.countries.slice(0, 3).join(', ') + (study.countries.length > 3 ? ` +${study.countries.length - 3}` : '') : 'Место не указано';
    const conditions = study.conditions.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    const phase = study.phases.map((item) => phaseLabels[item] ?? item).join(' · ');
    const statusClass = isRecruiting(study.status) ? 'status-open' : study.status === 'COMPLETED' ? 'status-complete' : 'status-neutral';
    return `<article class="study-card"><div class="study-main"><div class="study-id-row"><a href="https://clinicaltrials.gov/study/${encodeURIComponent(study.id)}" target="_blank" rel="noreferrer">${escapeHtml(study.id)}</a><span class="status-badge ${statusClass}">${escapeHtml(statusLabels[study.status] ?? study.status)}</span>${study.hasResults ? '<span class="result-badge">Есть результаты</span>' : ''}</div><h3><a href="https://clinicaltrials.gov/study/${encodeURIComponent(study.id)}" target="_blank" rel="noreferrer">${escapeHtml(study.title)}</a></h3><div class="condition-tags">${conditions || '<span>Условие не указано</span>'}</div><p class="sponsor">${escapeHtml(study.sponsor)}</p></div><dl class="study-facts"><div><dt>Тип / фаза</dt><dd>${escapeHtml(typeLabels[study.studyType] ?? study.studyType)}<br>${escapeHtml(phase)}</dd></div><div><dt>Набор</dt><dd>${study.enrollment ? study.enrollment.toLocaleString('ru-RU') : '—'} участников</dd></div><div><dt>География</dt><dd>${escapeHtml(locations)}</dd></div><div><dt>Период</dt><dd>${escapeHtml(formatDate(study.startDate))} — ${escapeHtml(formatDate(study.completionDate))}</dd></div></dl></article>`;
  }).join('');
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault(); const condition = els.condition.value.trim(); const location = els.location.value.trim();
  if (!condition && !location) { els.condition.focus(); return; }
  state.query = { condition, location }; state.filters = { quick: 'all', phase: 'all', type: 'all', sort: 'updated' };
  document.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('active', button.dataset.filter === 'all'));
  els.phase.value = 'all'; els.type.value = 'all'; els.sort.value = 'updated'; fetchStudies();
});
document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => { els.condition.value = button.dataset.query; state.query = { condition: button.dataset.query, location: els.location.value.trim() }; fetchStudies(); }));
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { state.filters.quick = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button)); renderStudies(); }));
els.phase.addEventListener('change', () => { state.filters.phase = els.phase.value; renderStudies(); });
els.type.addEventListener('change', () => { state.filters.type = els.type.value; renderStudies(); });
els.sort.addEventListener('change', () => { state.filters.sort = els.sort.value; renderStudies(); });
els.more.addEventListener('click', () => fetchStudies({ append: true }));

function registerWebMcp() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  try {
    context.registerTool({
      name: 'search_clinical_trials', title: 'Search clinical trials',
      description: 'Search ClinicalTrials.gov by a condition and optional location, then update the visible dashboard.',
      inputSchema: { type: 'object', properties: { condition: { type: 'string', minLength: 1 }, location: { type: 'string' } }, required: ['condition'], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        if (!input || typeof input.condition !== 'string' || !input.condition.trim()) throw new Error('condition must be a non-empty string');
        if (input.location != null && typeof input.location !== 'string') throw new Error('location must be a string');
        els.condition.value = input.condition.trim(); els.location.value = input.location?.trim() ?? '';
        state.query = { condition: els.condition.value, location: els.location.value }; await fetchStudies();
        return { totalCount: state.totalCount, loadedCount: state.studies.length, query: state.query };
      },
    });
  } catch (error) { console.warn('WebMCP registration unavailable', error); }
}

const initial = new URLSearchParams(location.search);
state.query.condition = initial.get('condition')?.trim() || state.query.condition; state.query.location = initial.get('location')?.trim() || '';
els.condition.value = state.query.condition; els.location.value = state.query.location;
registerWebMcp(); fetchStudies();
