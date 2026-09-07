import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApiUrl, filterStudies, normalizeStudy, summarize } from '../dist/lib.js';

const raw = {
  hasResults: true,
  protocolSection: {
    identificationModule: { nctId: 'NCT00000001', briefTitle: 'Example study' },
    statusModule: { overallStatus: 'RECRUITING', startDateStruct: { date: '2025-01-01' } },
    designModule: { phases: ['PHASE2'], studyType: 'INTERVENTIONAL', enrollmentInfo: { count: 120 } },
    conditionsModule: { conditions: ['Diabetes'] },
    contactsLocationsModule: { locations: [{ city: 'Almaty', country: 'Kazakhstan' }] },
    sponsorCollaboratorsModule: { leadSponsor: { name: 'Example University' } },
  },
};

test('buildApiUrl encodes search values and pagination', () => {
  const url = new URL(buildApiUrl({ condition: 'type 2 diabetes', location: 'New York', pageToken: 'abc+123' }));
  assert.equal(url.searchParams.get('query.cond'), 'type 2 diabetes');
  assert.equal(url.searchParams.get('query.locn'), 'New York');
  assert.equal(url.searchParams.get('pageToken'), 'abc+123');
  assert.equal(url.searchParams.get('countTotal'), 'true');
});
test('normalizeStudy produces a stable app model', () => {
  const study = normalizeStudy(raw);
  assert.equal(study.id, 'NCT00000001');
  assert.equal(study.enrollment, 120);
  assert.deepEqual(study.countries, ['Kazakhstan']);
  assert.equal(study.hasResults, true);
});
test('summarize and filter studies', () => {
  const study = normalizeStudy(raw);
  const summary = summarize([study]);
  assert.equal(summary.recruiting, 1);
  assert.equal(summary.countries, 1);
  assert.equal(filterStudies([study], { quick: 'results', phase: 'PHASE2', type: 'INTERVENTIONAL', sort: 'updated' }).length, 1);
  assert.equal(filterStudies([study], { quick: 'upcoming', phase: 'all', type: 'all', sort: 'updated' }).length, 0);
  assert.equal(filterStudies([study], { quick: 'missing-results', phase: 'all', type: 'all', sort: 'updated' }).length, 0);
});
