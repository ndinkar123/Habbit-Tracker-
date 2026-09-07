/*
 * icons.js — Premium line-icon library for Habits Pro
 * Same visual language as the existing tab-bar icons (24x24, stroke-based,
 * round caps). Organized into categories for the icon picker.
 * Habits store an `icon` id; if absent, legacy `emoji` still renders
 * (see app.js renderHabitGlyph) so old data never breaks.
 */
(function (global) {
  'use strict';

  const ICON_CATEGORIES = [
    { id: 'fitness', label: 'Fitness', icons: ['dumbbell', 'running', 'cycling', 'yoga', 'swim', 'stairs'] },
    { id: 'health', label: 'Health', icons: ['heart', 'water-drop', 'pill', 'sleep', 'scale', 'lungs'] },
    { id: 'mind', label: 'Mind', icons: ['meditation', 'brain', 'journal', 'sun', 'book-open', 'idea'] },
    { id: 'learning', label: 'Learning', icons: ['book', 'pencil', 'target', 'graduation', 'globe', 'puzzle'] },
    { id: 'nutrition', label: 'Nutrition', icons: ['apple', 'salad', 'coffee', 'no-junk', 'water-glass', 'no-sugar'] },
    { id: 'lifestyle', label: 'Lifestyle', icons: ['no-smoking', 'no-alcohol', 'phone-off', 'piggy-bank', 'plant', 'palette'] }
  ];

  const ICON_PATHS = {
    dumbbell: '<rect x="1" y="9" width="4" height="6" rx="1"></rect><rect x="19" y="9" width="4" height="6" rx="1"></rect><line x1="7" y1="12" x2="17" y2="12"></line><line x1="9" y1="6" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="18"></line>',
    running: '<ellipse cx="9" cy="8" rx="3" ry="4"></ellipse><ellipse cx="9" cy="17" rx="4" ry="5"></ellipse>',
    cycling: '<circle cx="6" cy="17" r="3"></circle><circle cx="18" cy="17" r="3"></circle><line x1="6" y1="17" x2="12" y2="8"></line><line x1="12" y1="8" x2="18" y2="17"></line><line x1="9" y1="12" x2="15" y2="12"></line><line x1="12" y1="8" x2="15" y2="5"></line><line x1="15" y1="5" x2="18" y2="5"></line>',
    yoga: '<circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><path d="M6 19c0-4 3-6 6-6s6 2 6 6"></path><path d="M6 19h12"></path>',
    swim: '<circle cx="18" cy="6" r="2"></circle><path d="M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"></path><path d="M3 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"></path>',
    stairs: '<path d="M3 21v-4h4v-4h4v-4h4v-4h6"></path>',

    heart: '<path d="M12 21s-7-4.5-9.5-9C1 8.5 2 5 5.5 5c2 0 3.5 1.3 4.5 3 1-1.7 2.5-3 4.5-3C18 5 19 8.5 17.5 12 15 16.5 12 21 12 21z"></path>',
    'water-drop': '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"></path>',
    pill: '<rect x="4" y="9" width="16" height="6" rx="3" transform="rotate(-30 12 12)"></rect><line x1="12" y1="9" x2="12" y2="15" transform="rotate(-30 12 12)"></line>',
    sleep: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"></path>',
    scale: '<rect x="3" y="3" width="18" height="18" rx="3"></rect><path d="M8 16a4 4 0 0 1 8 0"></path><circle cx="12" cy="10" r="1"></circle>',
    lungs: '<path d="M12 4v6"></path><path d="M12 10c-1-3-4-3-5-1s0 8 2 9 3-2 3-4"></path><path d="M12 10c1-3 4-3 5-1s0 8-2 9-3-2-3-4"></path>',

    meditation: '<circle cx="12" cy="16" r="2"></circle><path d="M12 14c-3-2-4-6-2-9 2 3 2 6 2 9zM12 14c3-2 4-6 2-9-2 3-2 6-2 9zM12 14c-4 0-7-2-8-5 3 0 6 1 8 5zM12 14c4 0 7-2 8-5-3 0-6 1-8 5z"></path>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5h1a3 3 0 0 0 3-3V7a3 3 0 0 0-1-3z"></path><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5h-1a3 3 0 0 1-3-3V7a3 3 0 0 1 1-3z"></path>',
    journal: '<rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="8" y1="8" x2="16" y2="8"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="13" y2="16"></line>',
    sun: '<circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22" y2="12"></line><line x1="4.6" y1="4.6" x2="6.7" y2="6.7"></line><line x1="17.3" y1="17.3" x2="19.4" y2="19.4"></line><line x1="4.6" y1="19.4" x2="6.7" y2="17.3"></line><line x1="17.3" y1="6.7" x2="19.4" y2="4.6"></line>',
    'book-open': '<path d="M12 6c-2-2-6-2-9-1v13c3-1 7-1 9 1 2-2 6-2 9-1V5c-3-1-7-1-9 1z"></path><line x1="12" y1="6" x2="12" y2="19"></line>',
    idea: '<path d="M9 18h6"></path><path d="M10 21h4"></path><path d="M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z"></path>',

    book: '<path d="M4 4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2z"></path><line x1="8" y1="7" x2="15" y2="7"></line><line x1="8" y1="11" x2="15" y2="11"></line>',
    pencil: '<path d="M3 21l3-1 11-11-2-2L4 18z"></path><path d="M14 6l2 2"></path>',
    target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1.5"></circle>',
    graduation: '<path d="M12 4L2 9l10 5 10-5z"></path><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"></path>',
    globe: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3c3 3 3 15 0 18"></path><path d="M12 3c-3 3-3 15 0 18"></path>',
    puzzle: '<rect x="4" y="4" width="7" height="7" rx="1"></rect><rect x="13" y="4" width="7" height="7" rx="1"></rect><rect x="4" y="13" width="7" height="7" rx="1"></rect><rect x="13" y="13" width="7" height="7" rx="1"></rect><circle cx="12" cy="12" r="1.5"></circle>',

    apple: '<path d="M12 8c-3-3-8-2-8 3 0 5 4 10 8 10s8-5 8-10c0-3-3-4-5-3"></path><path d="M12 8V5"></path><path d="M12 5c1-2 3-2 4-1"></path>',
    salad: '<path d="M3 12h18a9 6 0 0 1-18 0z"></path><path d="M12 12c0-3 2-5 4-6"></path>',
    coffee: '<path d="M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M17 10h2a2 2 0 0 1 0 4h-2"></path><path d="M8 3c0 1-1 1-1 2s1 1 1 2"></path><path d="M12 3c0 1-1 1-1 2s1 1 1 2"></path>',
    'no-junk': '<rect x="6" y="10" width="12" height="3" rx="1"></rect><path d="M7 13c0 3 2 5 5 5s5-2 5-5"></path><circle cx="12" cy="12" r="10"></circle><line x1="5" y1="5" x2="19" y2="19"></line>',
    'water-glass': '<path d="M7 4h10l-1.5 16a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1z"></path><line x1="7.5" y1="12" x2="16.5" y2="12"></line>',
    'no-sugar': '<rect x="6" y="6" width="12" height="12" rx="1"></rect><line x1="4" y1="4" x2="20" y2="20"></line>',

    'no-smoking': '<rect x="3" y="11" width="14" height="3" rx="1"></rect><line x1="13" y1="11" x2="13" y2="14"></line><path d="M19 11c0-1 1-1 1-2"></path><line x1="2" y1="4" x2="22" y2="20"></line>',
    'no-alcohol': '<path d="M8 3h8l-1 6a3 3 0 0 1-6 0z"></path><line x1="12" y1="9" x2="12" y2="18"></line><line x1="8" y1="21" x2="16" y2="21"></line><line x1="4" y1="4" x2="20" y2="20"></line>',
    'phone-off': '<rect x="7" y="2" width="10" height="20" rx="2"></rect><line x1="11" y1="18" x2="13" y2="18"></line><line x1="4" y1="4" x2="20" y2="20"></line>',
    'piggy-bank': '<path d="M4 13a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1h-2l-1 3h-3v-2H9v2H6l-1-3H4z"></path><circle cx="9" cy="12" r="0.5"></circle><line x1="9" y1="8" x2="9" y2="6"></line>',
    plant: '<path d="M12 21V10"></path><path d="M12 10c0-4-3-6-6-6 0 4 2 6 6 6z"></path><path d="M12 13c0-4 3-6 6-6 0 4-2 6-6 6z"></path>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-.5-1.5-.5-2.5S14 15 15 15h3a3 3 0 0 0 3-3 9 9 0 0 0-9-9z"></path><circle cx="8" cy="10" r="1"></circle><circle cx="12" cy="8" r="1"></circle><circle cx="16" cy="10" r="1"></circle>'
  };

  function renderIconSVG(iconId, extraAttrs) {
    const inner = ICON_PATHS[iconId];
    if (!inner) return '';
    const attrs = extraAttrs || '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" ' + attrs + '>' + inner + '</svg>';
  }

  function isValidIcon(iconId) {
    return Object.prototype.hasOwnProperty.call(ICON_PATHS, iconId);
  }

  global.IconLib = { ICON_CATEGORIES, ICON_PATHS, renderIconSVG, isValidIcon };
})(window);
