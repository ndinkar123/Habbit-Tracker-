(function(global) {
  'use strict';
  const ICON_CATEGORIES = [
    { id: 'morning', label: 'Morning', icons: ['coffee', 'skincare', 'bed', 'sunrise', 'toothbrush', 'shower'] },
    { id: 'fitness', label: 'Fitness', icons: ['dumbbell', 'yoga', 'run', 'bike', 'swim', 'kettlebell', 'jump-rope'] },
    { id: 'diet', label: 'Diet & Water', icons: ['water', 'meal-prep', 'apple', 'fasting', 'pill', 'salad'] },
    { id: 'mind', label: 'Mind & Focus', icons: ['meditate', 'journal', 'book', 'no-phone', 'brain', 'sleep-mask'] },
    { id: 'growth', label: 'Productivity', icons: ['code', 'language', 'money', 'music', 'target', 'briefcase'] },
    { id: 'chores', label: 'Life Admin', icons: ['plant', 'dog', 'laundry', 'car', 'cleaning', 'groceries'] }
  ];

  // Condensed SVG path generator for 60+ premium line icons (24x24 viewBox)
  const p = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  
  const ICON_PATHS = {
    coffee: p('M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3'),
    skincare: p('M7 21h10M9 21v-4a3 3 0 0 1 6 0v4M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'),
    bed: p('M2 4v16M22 4v16M2 8h20M2 12h20M6 8v4M18 8v4'),
    sunrise: p('M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M19.07 19.07l-4.24-4.24M2 12h20M4.93 19.07l4.24-4.24M19.07 4.93l-4.24 4.24'),
    toothbrush: p('M15 3a4 4 0 0 1 4 4l-9 9l-4-4 9-9z M8 16l-4 4 M16 6l-2-2 M14 8l-2-2'),
    shower: p('M12 2v6M8 12v3M16 12v3M12 15v3M10 18v3M14 18v3'),
    dumbbell: p('M6.5 6.5l11 11M3 14l7 7M10 7l7 7M4 11l9 9M13 4l7 7'),
    yoga: p('M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M5 22c0-4 3-6 7-6s7 2 7 6 M6 10l6 4 6-4'),
    run: p('M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M10 10l2 2v4l-4 4 M14 10l-2 2 M16 14l-4 4'),
    bike: p('M5 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M19 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 15l-3-4h6l-3 4z'),
    swim: p('M2 12s2-2 4 0 4 2 6 0 4-2 6 0 4 2 6 0 M2 16s2-2 4 0 4 2 6 0 4-2 6 0 4 2 6 0'),
    kettlebell: p('M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M9 6V4a3 3 0 0 1 6 0v2'),
    'jump-rope': p('M4 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M20 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M4 12c0-8 16-8 16 0'),
    water: p('M12 22a7 7 0 0 0 7-7c0-4-7-12-7-12S5 11 5 15a7 7 0 0 0 7 7z M12 16v2'),
    'meal-prep': p('M4 6h16v12H4z M12 6v12 M4 12h8'),
    apple: p('M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 4c2-2 4-2 4 0'),
    fasting: p('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2'),
    pill: p('M10 14l4-4M6 18A5.65 5.65 0 0 1 14 10l4 4a5.65 5.65 0 0 1-8 8l-4-4z'),
    salad: p('M4 10h16v4a8 8 0 0 1-16 0v-4z M12 10c0-2 2-4 4-4'),
    meditate: p('M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 12l4 4 4-4 M6 20h12'),
    journal: p('M4 4h12v16H4z M16 4l4 4v12h-4 M8 8h4 M8 12h6 M8 16h6'),
    book: p('M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'),
    'no-phone': p('M5 4h14v16H5z M2 2l20 20 M9 16h6'),
    brain: p('M9 4a3 3 0 0 0-3 3v2a3 3 0 0 0 2 5v1a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-1a3 3 0 0 0 2-5V7a3 3 0 0 0-3-3H9z'),
    'sleep-mask': p('M2 12a4 4 0 0 0 8 0 4 4 0 0 0 8 0h4 M2 12h-2'),
    code: p('M16 18l6-6-6-6 M8 6l-6 6 6 6 M14 4l-4 16'),
    language: p('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'),
    money: p('M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'),
    music: p('M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'),
    target: p('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12h.01'),
    briefcase: p('M4 8h16v12H4z M8 8V6a2 2 0 0 1 4 0v2 M12 12v4'),
    plant: p('M12 22v-8 M12 14c-4 0-6-3-6-6 4 0 6 3 6 6z M12 14c4 0 6-3 6-6-4 0-6 3-6 6z'),
    dog: p('M12 16c-2 0-4-2-4-4s2-4 4-4 4 2 4 4-2 4-4 4z M8 12c0-2-2-3-4-3S0 10 0 12s2 3 4 3 4-1 4-3z M20 12c0-2 2-3 4-3s4 1 4 3-2 3-4 3-4-1-4-3z'),
    laundry: p('M4 4h16v16H4z M4 8h16 M12 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'),
    car: p('M4 16h16M3 10l2-4h14l2 4M2 10v6h20v-6M6 16v2M18 16v2'),
    cleaning: p('M12 2v20 M8 22h8 M9 7l6 6 M15 7l-6 6'),
    groceries: p('M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0')
  };

  global.IconLib = { ICON_CATEGORIES, ICON_PATHS, render: (id) => ICON_PATHS[id] || ICON_PATHS['target'] };
})(window);
