// Feature columns shown in the comparison table: [key, label, short header]. Every car marks each key as
// "std" (all variants), "higher" (upper variants only) or "no" (not offered).
export const FEATURE_GROUPS = {
  Safety: [
    ['airbags6', '6 airbags', '6 airbags'],
    ['esc', 'ESC / ESP', 'ESC'],
    ['hillHold', 'Hill-hold assist', 'Hill hold'],
    ['tpms', 'TPMS', 'TPMS'],
    ['adas', 'ADAS', 'ADAS'],
    ['cam360', '360° camera', '360° camera'],
    ['rearCam', 'Rear camera', 'Rear camera'],
    ['frontSensors', 'Front parking sensors', 'Front sensors'],
    ['isofix', 'ISOFIX mounts', 'ISOFIX'],
    ['rearDisc', 'Rear disc brakes', 'Rear discs'],
    ['bsm', 'Blind-spot monitor', 'Blind-spot'],
    ['epb', 'Electronic parking brake', 'E-park brake'],
    ['belts3pt', '3-point belts, all seats', '3-point belts'],
  ],
  Comfort: [
    ['sunshades', 'Rear window sunshades', 'Sunshades'],
    ['sunroof', 'Sunroof', 'Sunroof'],
    ['panoSunroof', 'Panoramic sunroof', 'Panoramic roof'],
    ['ventSeats', 'Ventilated front seats', 'Vented seats'],
    ['powerSeat', 'Powered driver seat', 'Power seat'],
    ['autoAC', 'Automatic climate control', 'Auto AC'],
    ['rearAC', 'Rear AC vents', 'Rear AC vents'],
    ['cruise', 'Cruise control', 'Cruise control'],
    ['rearHeadrests', 'Adjustable rear headrests', 'Rear headrests'],
  ],
  Tech: [
    ['wirelessAA', 'Wireless Android Auto / CarPlay', 'Wireless AA/CP'],
    ['screen10', 'Touchscreen 10" or larger', '10" screen'],
    ['digitalCluster', 'Digital instrument cluster', 'Digital cluster'],
    ['connected', 'Connected-car app', 'Connected app'],
    ['wirelessCharger', 'Wireless phone charger', 'Wireless charger'],
    ['hud', 'Head-up display', 'Head-up display'],
    ['premiumSound', 'Branded sound system', 'Branded audio'],
  ],
  Convenience: [
    ['keyless', 'Keyless entry + push start', 'Keyless start'],
    ['autoHeadlamps', 'Auto headlamps', 'Auto headlamps'],
    ['rainWipers', 'Rain-sensing wipers', 'Auto wipers'],
    ['autoIRVM', 'Auto-dimming mirror', 'Auto-dim mirror'],
    ['autoFoldORVM', 'Auto-folding side mirrors', 'Auto-fold mirrors'],
    ['ledHeadlamps', 'LED headlamps', 'LED headlamps'],
    ['rearWiper', 'Rear wiper + defogger', 'Rear wiper'],
    ['rearArmrest', 'Rear armrest + cupholders', 'Rear armrest'],
  ],
};

export const GROUP_NAMES = Object.keys(FEATURE_GROUPS);

export const ALL_FEATURES = GROUP_NAMES.flatMap((group) =>
  FEATURE_GROUPS[group].map(([key, label, short]) => ({ key, label, short, group })),
);

export const FEATURE_LABEL = Object.fromEntries(ALL_FEATURES.map((f) => [f.key, f.label]));
export const FEATURE_KEYS = new Set(ALL_FEATURES.map((f) => f.key));

export const AVAIL_TEXT = {
  std: 'Standard on every variant',
  higher: 'Only on higher variants',
  no: 'Not offered',
};
