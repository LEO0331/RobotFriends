import { REGION_FOCUS, REGION_NAMES, infrastructureLocation, regionHash, securedPercent } from './regionFocusModel';

test('all four tracked regions have a deterministic focus configuration', () => {
  expect(REGION_NAMES).toEqual(['Arizona', 'Texas', 'Ohio', 'Northern Virginia']);
  REGION_NAMES.forEach(name => {
    const region = REGION_FOCUS[name];
    expect(region.grid).toBeTruthy();
    expect(region.stageIndex).toBeGreaterThanOrEqual(0);
    expect(region.stageIndex).toBeLessThanOrEqual(3);
    expect(region.x).toBeGreaterThan(0);
    expect(region.y).toBeGreaterThan(0);
  });
});

test('secured power is expressed as a bounded percentage of planned capacity', () => {
  expect(securedPercent(REGION_FOCUS.Ohio)).toBe(56);
  expect(securedPercent(REGION_FOCUS.Texas)).toBe(53);
  expect(securedPercent({ planned: 0, secured: 1 })).toBe(0);
});

test('infrastructure hash parsing keeps all-regions as the default', () => {
  expect(infrastructureLocation('#infrastructure')).toEqual({ isInfrastructure: true, region: 'All regions' });
  expect(infrastructureLocation('#infrastructure?region=Northern%20Virginia')).toEqual({ isInfrastructure: true, region: 'Northern Virginia' });
  expect(infrastructureLocation('#overview').isInfrastructure).toBe(false);
});

test('region hashes are URL safe and reversible', () => {
  expect(regionHash('All regions')).toBe('infrastructure');
  expect(regionHash('Northern Virginia')).toBe('infrastructure?region=Northern%20Virginia');
});
