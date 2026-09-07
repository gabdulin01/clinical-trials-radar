const RECRUITING_STATUSES = new Set(['RECRUITING', 'ENROLLING_BY_INVITATION', 'ACTIVE_NOT_RECRUITING']);

export function buildApiUrl({ condition, location, pageToken = '' }) {
  const url = new URL('https://clinicaltrials.gov/api/v2/studies');
  if (condition.trim()) url.searchParams.set('query.cond', condition.trim());
  if (location.trim()) url.searchParams.set('query.locn', location.trim());
  url.searchParams.set('format', 'json');
  url.searchParams.set('pageSize', '50');
  url.searchParams.set('countTotal', 'true');
  url.searchParams.set('sort', 'LastUpdatePostDate:desc');
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  return url.toString();
}

export function normalizeStudy(raw) {
  const protocol = raw?.protocolSection ?? {};
  const identification = protocol.identificationModule ?? {};
  const status = protocol.statusModule ?? {};
  const design = protocol.designModule ?? {};
  const conditions = protocol.conditionsModule ?? {};
  const contacts = protocol.contactsLocationsModule ?? {};
  const sponsors = protocol.sponsorCollaboratorsModule ?? {};
  const locations = Array.isArray(contacts.locations) ? contacts.locations : [];
  return {
    id: identification.nctId ?? '—',
    title: identification.briefTitle ?? identification.officialTitle ?? 'Без названия',
    status: status.overallStatus ?? 'UNKNOWN',
    lastUpdated: status.statusVerifiedDate ?? status.studyFirstSubmitDate ?? '',
    posted: status.studyFirstPostDateStruct?.date ?? '',
    startDate: status.startDateStruct?.date ?? '',
    completionDate: status.completionDateStruct?.date ?? '',
    phases: Array.isArray(design.phases) && design.phases.length ? design.phases : ['NA'],
    studyType: design.studyType ?? 'UNKNOWN',
    enrollment: Number(design.enrollmentInfo?.count ?? 0),
    conditions: Array.isArray(conditions.conditions) ? conditions.conditions : [],
    sponsor: sponsors.leadSponsor?.name ?? 'Не указан',
    locations: locations.map((item) => ({ facility: item.facility ?? '', city: item.city ?? '', state: item.state ?? '', country: item.country ?? '' })),
    countries: [...new Set(locations.map((item) => item.country).filter(Boolean))],
    hasResults: Boolean(raw?.hasResults),
  };
}

export function summarize(studies) {
  const countries = new Set();
  const phaseCounts = new Map();
  const countryCounts = new Map();
  let recruiting = 0;
  let withResults = 0;
  studies.forEach((study) => {
    if (RECRUITING_STATUSES.has(study.status)) recruiting += 1;
    if (study.hasResults) withResults += 1;
    study.phases.forEach((phase) => phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1));
    study.countries.forEach((country) => {
      countries.add(country);
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
    });
  });
  return {
    loaded: studies.length, recruiting, withResults, countries: countries.size,
    phaseCounts: [...phaseCounts.entries()].sort((a, b) => b[1] - a[1]),
    countryCounts: [...countryCounts.entries()].sort((a, b) => b[1] - a[1]),
  };
}

export function filterStudies(studies, filters) {
  const filtered = studies.filter((study) => {
    const quickMatches = filters.quick === 'all'
      || (filters.quick === 'recruiting' && ['RECRUITING', 'ENROLLING_BY_INVITATION'].includes(study.status))
      || (filters.quick === 'upcoming' && study.status === 'NOT_YET_RECRUITING')
      || (filters.quick === 'results' && study.hasResults)
      || (filters.quick === 'missing-results' && study.status === 'COMPLETED' && !study.hasResults);
    return quickMatches && (filters.phase === 'all' || study.phases.includes(filters.phase)) && (filters.type === 'all' || study.studyType === filters.type);
  });
  return filtered.sort((a, b) => {
    if (filters.sort === 'enrollment') return b.enrollment - a.enrollment;
    if (filters.sort === 'start') return String(b.startDate).localeCompare(String(a.startDate));
    return String(b.lastUpdated).localeCompare(String(a.lastUpdated));
  });
}

export function isRecruiting(status) {
  return ['RECRUITING', 'ENROLLING_BY_INVITATION'].includes(status);
}
