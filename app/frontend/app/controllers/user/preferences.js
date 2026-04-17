import Controller from '@ember/controller';
import { later as runLater } from '@ember/runloop';
import i18n from '../../utils/i18n';
import app_state from '../../utils/app_state';
import utterance from '../../utils/utterance';
import capabilities from '../../utils/capabilities';
import buttonTracker from '../../utils/raw_events';
import modal from '../../utils/modal';
import speecher from '../../utils/speecher';
import persistence from '../../utils/persistence';
import Button from '../../utils/button';
import { set as emberSet } from '@ember/object';
import SweetSuite from '../../app';
import { observer } from '@ember/object';
import { computed } from '@ember/object';
import { htmlSafe } from '@ember/string';
import editManager from '../../utils/edit_manager';
import { llmVoiceConsentGate, llmVoiceProviders, llmVoiceLanguageMap, SHERPA_TTS_LANGUAGES } from '../../utils/llm_voice_provider';

export default Controller.extend({
  setup: function() {
    var str = JSON.stringify(this.get('model.preferences'));
    this.set('pending_preferences', JSON.parse(str));
    this.set('original_preferences', JSON.parse(str));
    this.set('phrase_categories_string', (this.get('pending_preferences.phrase_categories') || []).join(', '));
    this.set('advanced', true);
    this.set('skip_save_on_transition', false);
    this.initZoomSettings();
    this.initLayoutSettings();
    var _this = this;
    setTimeout(function() {
      if(window.weblinger) {
        _this.set('weblinger_enabled', true);
      }
    }, 1000);
  },
  speecher: speecher,
  buttonSpacingList: [
    {name: i18n.t('minimal_1', "Minimal (1px)"), id: "minimal"},
    {name: i18n.t('extra_small_2', "Extra-Small (2px)"), id: "extra-small"},
    {name: i18n.t('small_5', "Small (5px)"), id: "small"},
    {name: i18n.t('medium_10', "Medium (10px)"), id: "medium"},
    {name: i18n.t('larg_20e', "Large (20px)"), id: "large"},
    {name: i18n.t('huge_45', "Huge (45px)"), id: "huge"},
    {name: i18n.t('none_upper', "None"), id: "none"}
  ],
  buttonBorderList: [
    {name: i18n.t('none_upper', "None"), id: "none"},
    {name: i18n.t('small_1', "Small (1px)"), id: "small"},
    {name: i18n.t('medium_2', "Medium (2px)"), id: "medium"},
    {name: i18n.t('thick_5', "Thick (5px)"), id: "large"},
    {name: i18n.t('huge_10', "Huge (10px)"), id: "huge"}
  ],
  buttonTextList: [
    {name: i18n.t('small_14', "Small (14px)"), id: "small"},
    {name: i18n.t('medium_18', "Medium (18px)"), id: "medium"},
    {name: i18n.t('large_22', "Large (22px)"), id: "large"},
    {name: i18n.t('huge_35', "Huge (35px)"), id: "huge"}
  ],
  buttonTextPositionList: [
    {name: i18n.t('no_text', "No Text (Images Only)"), id: "none"},
    {name: i18n.t('on_top', "Text Above Images"), id: "top"},
    {name: i18n.t('on_bottom', "Text Below Images"), id: "bottom"},
    {name: i18n.t('text_only', "Text Only (No Images)"), id: "text_only"}
  ],
  hiddenButtonsList: [
    {name: i18n.t('show_grid', "Show Grid Lines"), id: "grid"},
    {name: i18n.t('show_dim', "Show as Dimmed Out"), id: "hint"},
    {name: i18n.t('hide_complete', "Hide Completely"), id: "hide"}
  ],
  dimLevelList: [
    {name: i18n.t('default_dimmed', "Default Dimmed"), id: "default_dim"},
    {name: i18n.t('barely_dimmed', "Barely Dimmed"), id: "barely_dim"},
    {name: i18n.t('semi_dimmed', "Semi-Dimmed"), id: "mid_dim"},
    {name: i18n.t('extra_dimmed', "Extra-Dimmed"), id: "extra_dim"},
  ],
  externalLinksList: [
    {name: i18n.t('allow_external_buttons', "Allow Opening Externally-Linked Buttons"), id: "allow"},
    {name: i18n.t('confirm_custom_external_buttons', "Confirm Before Opening Unrecognized Externally-Linked Buttons"), id: "confirm_custom"},
    {name: i18n.t('confirm_all_external_buttons', "Confirm Before Opening Any Externally-Linked Buttons"), id: "confirm_all"},
    {name: i18n.t('prevent_external_buttons', "Do Not Allow Opening Externally-Linked Buttons"), id: "prevent"}
  ],
  cutoffsList: [
    {name: i18n.t('limit_logging_by_cutoff', "[ Limit Log Access By Time ]"), id: ""},
    {name: i18n.t('', "Don't Show Any Logs"), id: "0"},
    {name: i18n.t('', "Show the Last 12 Hours of Logs"), id: "12"},
    {name: i18n.t('', "Show the Last 24 Hours of Logs"), id: "24"},
    {name: i18n.t('', "Show the Last 3 Days of Logs"), id: "72"},
    {name: i18n.t('', "Show the Last 1 Week of Logs"), id: "168"},
    {name: i18n.t('', "Show the Last 2 Weeks of Logs"), id: "336"},
    {name: i18n.t('', "Show All Logs"), id: "none"},
  ],
  highlighted_buttons_list: [
    {name: i18n.t('dont_highlight', "Don't Highlight Buttons on Selection"), id: "none"},
    {name: i18n.t('highlight_all', "Highlight All Buttons on Selection"), id: "all"},
    {name: i18n.t('highlight_spoken', "Highlight Spoken Buttons on Selection"), id: "spoken"},
  ],
  // -------------------------------------------------------------------------
  // Layout Settings — user-facing options for board grid layout
  // Stored under preferences.layout_settings as an object with keys:
  //   grid_size, button_arrangement, label_position, content_preference,
  //   custom_rows, custom_columns
  // -------------------------------------------------------------------------

  /**
   * Available grid size presets for board layout.
   * Users can choose a square grid or define a custom grid.
   * @type {Array<{name: string, id: string}>}
   */
  layoutGridSizeList: [
    {name: i18n.t('grid_2x2', "2×2 (4 buttons) — Nice and roomy, like a cozy booth at the diner"), id: "2x2"},
    {name: i18n.t('grid_3x3', "3×3 (9 buttons) — The Goldilocks grid, just right"), id: "3x3"},
    {name: i18n.t('grid_4x4', "4×4 (16 buttons) — Classic, like a well-organized spreadsheet"), id: "4x4"},
    {name: i18n.t('grid_5x5', "5×5 (25 buttons) — Maximum density, minimum whitespace"), id: "5x5"},
    {name: i18n.t('grid_custom', "Custom — For the control enthusiasts among us"), id: "custom"}
  ],

  /**
   * Available button arrangement strategies.
   * Controls how buttons fill the grid on a board.
   * @type {Array<{name: string, id: string}>}
   */
  layoutButtonArrangementList: [
    {name: i18n.t('arrange_row_major', "Left-to-Right, Top-to-Bottom (like reading a book)"), id: "row-major"},
    {name: i18n.t('arrange_column_major', "Top-to-Bottom, Left-to-Right (like columns in a newspaper)"), id: "column-major"},
    {name: i18n.t('arrange_custom', "Free-Form (drag buttons wherever your heart desires)"), id: "freeform"}
  ],

  /**
   * Available label position options for buttons.
   * Controls where text labels appear relative to button images.
   * @type {Array<{name: string, id: string}>}
   */
  layoutLabelPositionList: [
    {name: i18n.t('label_below', "Below the Image (the classic look)"), id: "below"},
    {name: i18n.t('label_above', "Above the Image (for the contrarians)"), id: "above"},
    {name: i18n.t('label_overlay', "Overlay on Image (maximize your grid real estate)"), id: "overlay"},
    {name: i18n.t('label_hidden', "No Label (let the icons do the talking)"), id: "hidden"}
  ],

  /**
   * Available content preference options.
   * Controls whether buttons show images, text, or both.
   * @type {Array<{name: string, id: string}>}
   */
  layoutContentPreferenceList: [
    {name: i18n.t('content_images_and_text', "Images + Text (the full monty)"), id: "images-and-text"},
    {name: i18n.t('content_images_only', "Images Only (a picture is worth a thousand words)"), id: "images-only"},
    {name: i18n.t('content_text_only', "Text Only (keeping it old-school terminal style)"), id: "text-only"},
    {name: i18n.t('content_text_with_small_image', "Text with Small Image (best of both worlds)"), id: "text-small-image"}
  ],

  /**
   * Initializes layout_settings on pending_preferences with sensible defaults
   * if they have not been set before. Called from setup().
   */
  initLayoutSettings: function() {
    var layout = this.get('pending_preferences.layout_settings');
    if (!layout) {
      layout = {};
      this.set('pending_preferences.layout_settings', layout);
    }
    if (!layout.grid_size) {
      layout.grid_size = '4x4';
    }
    if (!layout.button_arrangement) {
      layout.button_arrangement = 'row-major';
    }
    if (!layout.label_position) {
      layout.label_position = 'below';
    }
    if (!layout.content_preference) {
      layout.content_preference = 'images-and-text';
    }
    if (!layout.custom_rows) {
      layout.custom_rows = 4;
    }
    if (!layout.custom_columns) {
      layout.custom_columns = 6;
    }
  },

  /**
   * Whether the user has selected a custom grid size.
   * Controls visibility of custom rows/columns inputs.
   */
  layoutIsCustomGrid: computed('pending_preferences.layout_settings.grid_size', function() {
    return this.get('pending_preferences.layout_settings.grid_size') === 'custom';
  }),

  // -------------------------------------------------------------------------
  // Zoom Settings — user-facing options for Zumly zoom navigation
  // Stored under preferences.zoom_settings as an object with keys:
  //   zoom_level, animation_speed, trigger_method, auto_zoom_timeout
  // -------------------------------------------------------------------------

  /**
   * Available zoom magnification level presets.
   * "Default" uses the Zumly library's built-in scale calculation.
   * @type {Array<{name: string, id: string}>}
   */
  zoomLevelList: [
    {name: i18n.t('zoom_level_default', "Default (auto-calculated)"), id: "default"},
    {name: i18n.t('zoom_level_low', "Low (subtle zoom)"), id: "low"},
    {name: i18n.t('zoom_level_medium', "Medium (balanced zoom)"), id: "medium"},
    {name: i18n.t('zoom_level_high', "High (maximum zoom)"), id: "high"}
  ],

  /**
   * Available animation speed presets that map to Zumly transition durations.
   * @type {Array<{name: string, id: string}>}
   */
  zoomAnimationSpeedList: [
    {name: i18n.t('zoom_speed_fast', "Fast (200ms)"), id: "fast"},
    {name: i18n.t('zoom_speed_normal', "Normal (600ms)"), id: "normal"},
    {name: i18n.t('zoom_speed_slow', "Slow (1000ms)"), id: "slow"},
    {name: i18n.t('zoom_speed_none', "None (instant)"), id: "none"}
  ],

  /**
   * Available zoom trigger methods controlling how users activate zoom.
   * @type {Array<{name: string, id: string}>}
   */
  zoomTriggerMethodList: [
    {name: i18n.t('zoom_trigger_tap', "Tap / Click"), id: "tap"},
    {name: i18n.t('zoom_trigger_long_press', "Long Press (hold 500ms)"), id: "long-press"},
    {name: i18n.t('zoom_trigger_double_tap', "Double Tap / Double Click"), id: "double-tap"}
  ],

  /**
   * Initializes zoom_settings on pending_preferences with sensible defaults
   * if they have not been set before. Called from setup().
   */
  initZoomSettings: function() {
    var zoom = this.get('pending_preferences.zoom_settings');
    if (!zoom) {
      zoom = {};
      this.set('pending_preferences.zoom_settings', zoom);
    }
    if (!zoom.zoom_level) {
      zoom.zoom_level = 'default';
    }
    if (!zoom.animation_speed) {
      zoom.animation_speed = 'normal';
    }
    if (!zoom.trigger_method) {
      zoom.trigger_method = 'tap';
    }
    if (zoom.auto_zoom_timeout === undefined || zoom.auto_zoom_timeout === null) {
      zoom.auto_zoom_timeout = 0;
    }
  },

  skin_options: computed(function() {
    return [
      {label: i18n.t('default_skin_tones', "Original Skin Tone"), id: 'default', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f468-varxxxUNI-200d-1f9b2.svg'},
      {label: i18n.t('mix_of_skin_tones', "Mix of Skin Tones"), id: 'mix', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f308.svg'},
      {label: i18n.t('dark_skin_tone', "Dark Skin Tone"), id: 'dark', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f468-1f3ff-200d-1f9b2.svg'},
      {label: i18n.t('medium_dark_skin_tone', "Medium-Dark Skin Tone"), id: 'medium-dark', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f468-1f3fe-200d-1f9b2.svg'},
      {label: i18n.t('medium_skin_tone', "Medium Skin Tone"), id: 'medium', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f468-1f3fd-200d-1f9b2.svg'},
      {label: i18n.t('medium_light_skin_tone', "Medium-Light Skin Tone"), id: 'medium-light', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f468-1f3fc-200d-1f9b2.svg'},
      {label: i18n.t('light_skin_tone', "Light Skin Tone"), id: 'light', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f468-1f3fb-200d-1f9b2.svg'},
      {label: i18n.t('limit_tones_to', "Limit Tones To..."), id: 'mix_only', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/2705.svg'},
      {label: i18n.t('show_tones_preference_for', "Show Preference For..."), id: 'mix_prefer', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f49f.svg'},
    ];
  }),
  current_skin: computed('pending_preferences.skin', function() {
    var options = this.get('skin_options');
    var pref = this.get('pending_preferences.skin') || 'default';
    var parts = pref.split(/::/);
    var option = options.find(function(o) { return o.id == parts[0]; });
    option = option || options[0];
    var res = {
      label: option.label,
      image_urls: [option.image_url]
    };
    if(parts[0] == 'mix_only' || parts[0] == 'mix_prefer') {
      res.options = [
        {label: i18n.t('default_skin_tones', "Original Skin Tone"), id: 'default', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f469-varxxxUNI.svg'},
        {label: i18n.t('dark_skin_tone', "Dark Skin Tone"), id: 'dark', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f469-1f3ff.svg'},
        {label: i18n.t('medium_dark_skin_tone', "Medium-Dark Skin Tone"), id: 'medium_dark', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f469-1f3fe.svg'},
        {label: i18n.t('medium_skin_tone', "Medium Skin Tone"), id: 'medium', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f469-1f3fd.svg'},
        {label: i18n.t('medium_light_skin_tone', "Medium-Light Skin Tone"), id: 'medium_light', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f469-1f3fc.svg'},
        {label: i18n.t('light_skin_tone', "Light Skin Tone"), id: 'light', image_url: 'https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f469-1f3fb.svg'},
      ];
      if(parts[2]) {
        var rules = parts[2].split(/-/).pop();
        for(var idx = 0; idx < 6; idx++) {
          var val =  parseInt(rules[idx] || '0', 10)
          if(parts[0] == 'mix_only') {
            res.options[idx].checked = val > 0;
          } else if(parts[0] == 'mix_prefer') {
            res.options[idx].checked = val > 1;
          }
        }
      }
    }
    return res;
  }),
  premium_symbol_library: computed('pending_preferences.preferred_symbols', function() {
    return ['lessonpix', 'pcs', 'symbolstix'].indexOf(this.get('pending_preferences.preferred_symbols')) != -1;
  }),
  update_current_skin: observer('current_skin.options.@each.checked', function() {
    if(this.get('current_skin.options') && this.get('pending_preferences.skin')) {
      var parts = this.get('pending_preferences.skin').split(/::/);
      this.send('choose_skin', parts[0]);
    }
  }),
  some_highlighted_buttons: computed('pending_preferences.highlighted_buttons', function() {
    return this.get('pending_preferences.highlighted_buttons') && this.get('pending_preferences.highlighted_buttons') != 'none';
  }),
  cant_change_private_logging: computed('limited_logging', 'model.permissions.delete', function() {
    return !this.get('model.permissions.delete');
  }),
  buttonStyleList: [
    {name: i18n.t('default_font', "Default Font"), id: "default"},
    {name: i18n.t('default_font_caps', "Default Font, All Uppercase"), id: "default_caps"},
    {name: i18n.t('default_font_small', "Default Font, All Lowercase"), id: "default_small"},
    // Don't hate on me, Comic Sans is not my fave, but it's the only web safe font I could find
    // that had the handwritten "a", which could be important for emergent readers.
    {name: i18n.t('arial', "Arial"), id: "arial"},
    {name: i18n.t('arial_caps', "Arial, All Uppercase"), id: "arial_caps"},
    {name: i18n.t('arial_small', "Arial, All Lowercase"), id: "arial_small"},
    {name: i18n.t('comic_sans', "Comic Sans"), id: "comic_sans"},
    {name: i18n.t('comic_sans_caps', "Comic Sans, All Uppercase"), id: "comic_sans_caps"},
    {name: i18n.t('comic_sans_small', "Comic Sans, All Lowercase"), id: "comic_sans_small"},
    {name: i18n.t('open_dyslexic', "OpenDyslexic"), id: "open_dyslexic"},
    {name: i18n.t('open_dyslexic_caps', "OpenDyslexic, All Uppercase"), id: "open_dyslexic_caps"},
    {name: i18n.t('open_dyslexic_small', "OpenDyslexic, All Lowercase"), id: "open_dyslexic_small"},
    {name: i18n.t('architects_daughter', "Architect's Daughter"), id: "architects_daughter"},
    {name: i18n.t('architects_daughter_caps', "Architect's Daughter, All Uppercase"), id: "architects_daughter_caps"},
    {name: i18n.t('architects_daughter_small', "Architect's Daughter, All Lowercase"), id: "architects_daughter_small"},
  ],
  audioOutputList: [
    {name: i18n.t('default_audio', "Play on Default Audio"), id: "default"},
    {name: i18n.t('headset', "Play on Headset if Connected"), id: "headset"},
    {name: i18n.t('speaker', "Play on Speaker even with Headset Connected"), id: "speaker"},
    {name: i18n.t('headset_or_earpiece', "Play on Headset or Earpiece"), id: "headset_or_earpiece"},
    {name: i18n.t('earpiece', "Play on Earpiece"), id: "earpiece"},
  ],
  update_flipped_settings: observer('pending_preferences.device.flipped_override', function() {
    if(this.get('pending_preferences.device.flipped_override')) {
      this.set('pending_preferences.device.flipped_text', this.get('pending_preferences.device.flipped_text') || this.get('pending_preferences.device.button_text'));
      this.set('pending_preferences.device.flipped_height', this.get('pending_preferences.device.flipped_height') || this.get('pending_preferences.device.vocalization_height'));
    }
  }),
  text_sample_class: computed('pending_preferences.device.button_style', function() {
    var res = "text_sample ";
    var style = Button.style(this.get('pending_preferences.device.button_style'));
    if(style.upper) {
      res = res + "upper ";
    } else if(style.lower) {
      res = res + "lower ";
    }
    if(style.font_class) {
      res = res + style.font_class + " ";
    }
    return res;
  }),
  activationLocationList: computed('model.feature_flags.inflections_overlay', function() {
    var res = [
      {name: i18n.t('pointer_release', "Where I Release My Pointer"), id: "end"},
      {name: i18n.t('pointer_start', "Where I First Press"), id: "start"},
    ]
    if(this.get('model.feature_flags.inflections_overlay')) {
      res.push({name: i18n.t('tap_and_swipe_inflections', "Tap to Select, Swipe for Inflections"), id: "swipe"});
    }
    return res;
  }),
  buttonSpaceList: [
    {name: i18n.t('dont_stretch', "Don't Stretch Buttons"), id: "none"},
    {name: i18n.t('prefer_tall', "Stretch Buttons, Taller First"), id: "prefer_tall"},
    {name: i18n.t('prefer_wide', "Stretch Buttons, Wider First"), id: "prefer_wide"},
  ],
  symbolBackgroundList: [
    {name: i18n.t('clear', "Clear"), id: "clear"},
    {name: i18n.t('white', "White"), id: "white"},
    {name: i18n.t('black', "Black"), id: "black"},
  ],
  buttonBackgroundList: [
    {name: i18n.t('white', "White"), id: "white"},
    {name: i18n.t('black', "Black"), id: "black"}
  ],
  dashboardViewList: [
    {name: i18n.t('communicator_view', "Communicator Account"), id: 'communicator'},
    {name: i18n.t('supporter_view', "Therapist/Parent/Supporter Account"), id: 'supporter'}
  ],
  device_type_list: [
    {name: i18n.t('communicator_device', "For Communication"), id: 'communicator'},
    {name: i18n.t('supporter_device', "For Supporting the Communicator"), id: 'supporter'}
  ],
  symbolsList: computed(function() {
    var list = [
      {name: i18n.t('original_symbols', "Use the board's original symbols"), id: 'original'},
      {name: i18n.t('use_opensymbols', "Opensymbols.org free symbol libraries"), id: 'opensymbols'},

      {name: i18n.t('use_lessonpix', "LessonPix symbol library"), id: 'lessonpix'},
      {name: i18n.t('use_symbolstix', "SymbolStix Symbols"), id: 'symbolstix'},
      {name: i18n.t('use_pcs', "PCS Symbols by Tobii Dynavox"), id: 'pcs'},

      {name: i18n.t('use_twemoji', "Emoji icons (authored by Twitter)"), id: 'twemoji'},
      {name: i18n.t('use_noun-project', "The Noun Project black outlines"), id: 'noun-project'},
      {name: i18n.t('use_arasaac', "ARASAAC free symbols"), id: 'arasaac'},
      {name: i18n.t('use_mulberry', "Mulberry Symbols (open-source SVG)"), id: 'mulberry'},
      {name: i18n.t('use_sclera', "Sclera Symbols (high-contrast B&W)"), id: 'sclera'},
      {name: i18n.t('use_openmoji', "OpenMoji (open-source emoji)"), id: 'openmoji'},
      {name: i18n.t('use_tawasol', "Tawasol symbol library"), id: 'tawasol'},
      {name: i18n.t('use_openclipart', "Openclipart (public domain clip-art)"), id: 'openclipart'},
    ];
    return list;
  }),
  localeList: computed(function() {
    var list = i18n.get('locales');
    var res = [{name: i18n.t('english_default', "English (default)"), id: 'en'}];
    for(var key in list) {
      if(!key.match(/-|_/)) {
        var str = /* i18n.locales_localized[key] ||*/ i18n.locales[key] || key;
        res.push({name: str, id: key});
      }
    }
    return res; //.sort(function(a, b) { return a.name.localeCompare(b.name)});
  }),
  scanningModeList: [
    {name: i18n.t('row_based', "Row-Based Scanning"), id: "row"},
    {name: i18n.t('column_based', "Column-Based Scanning"), id: "column"},
    {name: i18n.t('button_based', "Button-Based Scanning"), id: "button"},
    {name: i18n.t('region_based', "Region-Based Scanning"), id: "region"},
    {name: i18n.t('axis_based', "Axis-Based Scanning"), id: 'axes'}
  ],
  scanningAxisSpeedList: [
    {name: i18n.t('moderate_3', "Moderate (3-second sweep)"), id: 'moderate'},
    {name: i18n.t('quick_2', "Quick (2-second sweep)"), id: 'quick'},
    {name: i18n.t('Speedy_1', "Speedy (1-second sweep)"), id: 'speedy'},
    {name: i18n.t('slow_5', "Slow (5-second sweep)"), id: 'slow'},
    {name: i18n.t('really_slow_8', "Really Slow (8-second sweep)"), id: 'really_slow'},
  ],
  dwellList: computed('head_tracking_capable', 'eyegaze_capable', 'model.feature_flags.ios_head_tracking', function() {
    var res = [
      {name: i18n.t('eye_gaze', "Eye Gaze Tracking"), id: 'eyegaze'},
      {name: i18n.t('mouse_dwell', "Cursor-Based Dwell Tracking"), id: 'mouse_dwell'},
      {name: i18n.t('joystick_key_dwell', "Joystick/Key-Based Dwell Tracking"), id: 'arrow_dwell'}
    ];
    if(this.get('head_tracking_capable')) {
      if(this.get('model.feature_flags.ios_head_tracking') && (capabilities.default_orientation == 'horizontal' || this.get('model.feature_flags.vertical_ios_head_tracking'))) {
        if(capabilities.system == 'iOS' && this.get('native_eyegaze_capable')) {
          var eyes = res.find(function(i) { return i.id == 'eyegaze'; })
          if(eyes) {
            eyes.name = i18n.t('eye_plus_head', "Eye-Gaze-Plus-Head Tracking")
          }  
          if(capabilities.eye_gaze.hardware_possible) {
            res.push({name: i18n.t('external_gaze_hardware', "External Gaze Tracking Hardware"), id: 'eyegaze_external'});
          }
        }
      }
      res.push({name: i18n.t('head_dwell', "Head Tracking"), id: 'head'});
    }
    return res;
  }),
  arrowSpeedList: [
    {name: i18n.t('moderate', "Moderate"), id: 'moderate'},
    {name: i18n.t('slow', "Slow"), id: 'slow'},
    {name: i18n.t('quick', "Quick"), id: 'quick'},
    {name: i18n.t('Speedy', "Speedy"), id: 'speedy'},
    {name: i18n.t('really_slow', "Really Slow"), id: 'really_slow'},
  ],
  dwellIconList: [
    {name: i18n.t('dot', "A Small Dot"), id: 'dot'},
    {name: i18n.t('red_circle', "A Red Circle"), id: 'red_circle'},
    {name: i18n.t('arrow', "An Arrow Cursor"), id: 'arrow'},
    {name: i18n.t('medium_circle', "A Medium Circle"), id: 'circle'},
    {name: i18n.t('large_circle', "A Large Circle"), id: 'ball'}
  ],
  dwellTiltList: [
    {name: i18n.t('normal', "Normal"), id: 'normal'},
    {name: i18n.t('more_sensitive', "More Sensitive (Less Movement Required)"), id: 'sensitive'},
    {name: i18n.t('even_more_sensitive', "Even More Sensitive (Minimal Movement Required)"), id: 'extra_sensitive'},
    {name: i18n.t('less_sensitive', "Less Sensitive (Extra Movement Required)"), id: 'less_sensitive'}
  ],
  dwellSelectList: computed('head_tracking_capable', 'pending_preferences.device.dwell', 'pending_preferences.device.dwell_type', function() {
    var res = [
      {name: i18n.t('time_on_target', "Select by Looking/Dwelling on a Target"), id: 'dwell'},
      {name: i18n.t('button_select', "Select by Hitting a Switch or Button"), id: 'button'}
    ];
    if(this.get('head_tracking_capable')) {
      if(this.get('pending_preferences.device.dwell') && (this.get('pending_preferences.device.dwell_type') == 'eyegaze_external')) {
        // facial expressions not possible with third-party tracking currently
      } else {
        res.push({name: i18n.t('expression', "Select by Facial Expression"), id: 'expression'});
      }

    }
    return res;
  }),
  expressionList: computed('head_tracking_capable', 'weblinger_enabled', function() {
    var res = [];
    if(capabilities.system == 'iOS' && this.get('head_tracking_capable')) {
      res.push({name: i18n.t('smile', "Smiling"), id: 'smile'});
      res.push({name: i18n.t('mouth_open', "Opening your Mouth"), id: 'mouth_open'});
      res.push({name: i18n.t('kiss', "Puckering your Lips (kiss)"), id: 'kiss'});
      res.push({name: i18n.t('tongue', "Sticking out your Tongue"), id: 'tongue'});
      res.push({name: i18n.t('puff', "Puffing up your Cheeks"), id: 'puff'});
      res.push({name: i18n.t('wink', "Winking One Eye"), id: 'wink'});
      res.push({name: i18n.t('smirk', "Smirking One Side of your Mouth"), id: 'smirk'});
      res.push({name: i18n.t('eyebrows', "Raising Both Eyebrows"), id: 'eyebrows'});
    } else if(capabilities.system == 'Android' && this.get('head_tracking_capable')) {
      res.push({name: i18n.t('smile', "Smiling"), id: 'smile'});
      res.push({name: i18n.t('mouth_open', "Opening your Mouth"), id: 'mouth_open'});
      res.push({name: i18n.t('kiss', "Puckering your Lips (kiss)"), id: 'kiss'});
      // res.push({name: i18n.t('wink', "Winking One Eye"), id: 'wink'});
      res.push({name: i18n.t('smirk', "Smirking One Side of your Mouth"), id: 'smirk'});
      res.push({name: i18n.t('eyebrows', "Raising Both Eyebrows"), id: 'eyebrows'});
    } else if(window.weblinger) {
      res.push({name: i18n.t('smile', "Smiling"), id: 'smile'});
      res.push({name: i18n.t('mouth_open', "Opening your Mouth"), id: 'mouth_open'});
      res.push({name: i18n.t('kiss', "Puckering your Lips (kiss)"), id: 'kiss'});
      res.push({name: i18n.t('wink', "Winking One Eye"), id: 'wink'});
      res.push({name: i18n.t('smirk', "Smirking One Side of your Mouth"), id: 'smirk'});
      res.push({name: i18n.t('eyebrows', "Raising Both Eyebrows"), id: 'eyebrows'});
    }
    return res;
  }),
  dwellReleaseDistanceList: [
    {name: i18n.t('small_10', "Small (10px)"), id: 10},
    {name: i18n.t('medium_30', "Medium (30px)"), id: 30},
    {name: i18n.t('large_50', "Large (50px)"), id: 50}
  ],
  targetingList: [
    {name: i18n.t('spinning_pie', "Spinning-Pie Animation"), id: 'pie'},
    {name: i18n.t('shrinking_dot', "Shrinking-Dot Animation"), id: 'shrink'}
  ],
  scan_pseudo_options: [
    {name: i18n.t('select', "Select"), id: "select"},
    {name: i18n.t('next', "Next"), id: "next"}
  ],
  vocalizationHeightList: [
    {name: i18n.t('tiny_50', "Tiny (50px)"), id: "tiny"},
    {name: i18n.t('small_70', "Small (70px)"), id: "small"},
    {name: i18n.t('medium_100', "Medium (100px)"), id: "medium"},
    {name: i18n.t('large_150', "Large (150px)"), id: "large"},
    {name: i18n.t('huge_200', "Huge (200px)"), id: "huge"}
  ],
  title: computed('model.user_name', function() {
    return "Preferences for " + this.get('model.user_name');
  }),
  ios_app: computed(function() {
    return capabilities.system == 'iOS' && capabilities.installed_app;
  }),
  raw_core_word_list: computed('core_lists.for_user', function() {
    var div = document.createElement('div');
    (this.get('core_lists.for_user') || []).each(function(w) {
      var span = document.createElement('span');
      span.innerText = w;
      div.appendChild(span);
    });
    return htmlSafe(div.innerHTML);
  }),
  substitution_string: computed('pending_preferences.substitutions', function() {
    return editManager.stringify_rules(this.get('pending_preferences.substitutions') || []);
  }),
  set_auto_sync: observer('model.id', 'model.auto_sync', function() {
    if(this.get('pending_preferences.device')) {
      this.set('pending_preferences.device.auto_sync', this.get('model.auto_sync'));
    }
  }),
  check_calibration: function() {
    var _this = this;
    capabilities.eye_gaze.calibratable(function(res) {
      _this.set('calibratable', !!res);
    });
  },
  check_core_words: function() {
    var _this = this;
    _this.set('core_lists', {loading: true});
    persistence.ajax('/api/v1/users/' + this.get('model.id') + '/core_lists', {type: 'GET'}).then(function(res) {
      _this.set('core_lists', res);
      _this.set('model.core_lists', res);
    }, function(err) {
      _this.set('core_lists', {error: true});
    });
  },
  requested_phrases: computed(
    'core_lists.requested_phrases_for_user',
    'pending_preferences.requested_phrase_changes',
    function() {
      var list = [].concat(this.get('core_lists.requested_phrases_for_user') || []);
      var changes = this.get('pending_preferences.requested_phrase_changes') || [];
      changes.forEach(function(change) {
        var str = change.replace(/^(add:|remove:)/, '');
        if(change.match(/^add:/)) {
          list.push({text: str});
        } else if(change.match(/^remove:/)) {
          list = list.filter(function(w) { return w.text != str; });
        }
      });
      return list;
    }
  ),
  check_voices_available: function() {
    var _this = this;
    if(capabilities.installed_app) {
      capabilities.tts.status().then(function() {
        _this.set('more_voices_available', true);
      }, function() {
        _this.set('more_voices_available', false);
      });
    } else {
      _this.set('more_voices_available', false);
    }
  },
  text_only_button_text_position: computed('pending_preferences.device.button_text_position', function() {
    return this.get('pending_preferences.device.button_text_position') == 'text_only';
  }),
  non_communicator: computed('pending_preferences.role', function() {
    return this.get('pending_preferences.role') != 'communicator';
  }),
  region_scanning: computed('pending_preferences.device.scanning_mode', function() {
    return this.get('pending_preferences.device.scanning_mode') == 'region';
  }),
  axes_scanning: computed('pending_preferences.device.scanning_mode', function() {
    return this.get('pending_preferences.device.scanning_mode') == 'axes';
  }),
  arrow_or_head_dwell: computed('pending_preferences.device.dwell_type', function() {
    return this.get('pending_preferences.device.dwell_type') == 'arrow_dwell' || this.get('pending_preferences.device.dwell_type') == 'head';
  }),
  head_dwell: computed('pending_preferences.device.dwell_type', function() {
    return this.get('pending_preferences.device.dwell_type') == 'head';
  }),
  dwell_icon_class: computed('pending_preferences.device.dwell_icon', function() {
    if(this.get('pending_preferences.device.dwell_icon') == 'arrow') {
      return 'big';
    } else if(this.get('pending_preferences.device.dwell_icon') == 'circle') {
      return 'circle';
    } else if(this.get('pending_preferences.device.dwell_icon') == 'red_circle') {
      return 'red_circle';
    } else if(this.get('pending_preferences.device.dwell_icon') == 'ball') {
      return 'ball';
    } else {
      return '';
    }
  }),
  set_dwell_cursor_on_arrow_dwell: observer('arrow_or_head_dwell', function() {
    if(this.get('arrow_or_head_dwell')) {
      if(this.get('pending_preferences.device.dwell_type') == 'arrow_dwell') {
        this.set('pending_preferences.device.dwell_no_cutoff', true);
      }
      if(!this.get('pending_preferences.device.dwell_cursor')) {
        this.set('pending_preferences.device.dwell_cursor', true);
        this.set('pending_preferences.device.dwell_icon', 'arrow');  
      }
    } 
  }),
  button_dwell: computed('pending_preferences.device.dwell_selection', function() {
    return this.get('pending_preferences.device.dwell_selection') == 'button';
  }),
  expression_select: computed('pending_preferences.device.dwell_selection', function() {
    return this.get('pending_preferences.device.dwell_selection') == 'expression';
  }),
  native_keyboard_available: computed(function() {
    return capabilities.installed_app && (capabilities.system == 'iOS' || capabilities.system == 'Android') && window.Keyboard;
  }),
  enable_external_keyboard: observer('pending_preferences.device.prefer_native_keyboard', function() {
    if(this.get('pending_preferences.device.prefer_native_keyboard')) {
      this.set('pending_preferences.device.external_keyboard', true);
    }
  }),
  select_keycode_string: computed('pending_preferences.device.scanning_select_keycode', function() {
    if(this.get('pending_preferences.device.scanning_select_keycode')) {
      return (i18n.key_string(this.get('pending_preferences.device.scanning_select_keycode')) || 'unknown') + ' key';
    } else {
      return "";
    }
  }),
  next_keycode_string: computed('pending_preferences.device.scanning_next_keycode', function() {
    if(this.get('pending_preferences.device.scanning_next_keycode')) {
      return (i18n.key_string(this.get('pending_preferences.device.scanning_next_keycode')) || 'unknown') + ' key';
    } else {
      return "";
    }
  }),
  prev_keycode_string: computed('pending_preferences.device.scanning_prev_keycode', function() {
    if(this.get('pending_preferences.device.scanning_prev_keycode')) {
      return (i18n.key_string(this.get('pending_preferences.device.scanning_prev_keycode')) || 'unknown') + ' key';
    } else {
      return "";
    }
  }),
  cancel_keycode_string: computed('pending_preferences.device.scanning_cancel_keycode', function() {
    if(this.get('pending_preferences.device.scanning_cancel_keycode')) {
      return (i18n.key_string(this.get('pending_preferences.device.scanning_cancel_keycode')) || 'unknown') + ' key';
    } else {
      return "";
    }
  }),
  fullscreen_capable: computed(function() {
    return capabilities.fullscreen_capable();
  }),
  eyegaze_capable: computed('weblinger_enabled', function() {
    return capabilities.eye_gaze.available || window.weblinger;
  }),
  native_eyegaze_capable: computed('weblinger_enabled', function() {
    return capabilities.eye_gaze.available && capabilities.eye_gaze.native;
  }),
  head_tracking_capable: computed('weblinger_enabled', function() {
    return capabilities.head_tracking.available || window.weblinger;
  }),
  eyegaze_or_dwell_capable: computed('pending_preferences.device.dwell', function() {
    return this.get('pending_preferences.device.dwell') || capabilities.eye_gaze.available || buttonTracker.mouse_used || capabilities.head_tracking.available || window.weblinger;
  }),
  eyegaze_type: computed(
    'pending_preferences.device.dwell',
    'pending_preferences.device.dwell_type',
    function() {
      return this.get('pending_preferences.device.dwell') && (this.get('pending_preferences.device.dwell_type') == 'eyegaze' || this.get('pending_preferences.device.dwell_type') == 'eyegaze_external');
    }
  ),
  head_tracking_type: computed(
    'pending_preferences.device.dwell',
    'pending_preferences.device.dwell_type',
    function() {
      return this.get('pending_preferences.device.dwell') && this.get('pending_preferences.device.dwell_type') == 'head';
    }
  ),
  update_dwell_defaults: observer('pending_preferences.device.dwell', function() {
    if(this.get('pending_preferences.device.dwell')) {
      if(!this.get('pending_preferences.device.dwell_type')) {
        this.set('pending_preferences.device.dwell_type', 'eyegaze');
      }
    }
  }),
  wakelock_capable: computed(function() {
    return capabilities.wakelock_capable();
  }),
  kindle_without_voice: computed('user_voice_list', function() {
    return (this.get('user_voice_list') || []).length == 0 && capabilities.system == 'Android' && capabilities.subsystem == 'Kindle';
  }),
  user_voice_list: computed(
    'speecher.voiceList',
    'model.premium_voices.claimed',
    'pending_preferences.device.voice.voice_uris',
    function() {
      var list = speecher.get('voiceList');
      var result = [];
      var premium_voice_ids = (this.get('model.premium_voices.claimed') || []).map(function(id) { return "extra:" + id; });
      list.forEach(function(voice) {
        if(voice.voiceURI && voice.voiceURI.match(/^extra/)) {
          if(premium_voice_ids.indexOf(voice.voiceURI) >= 0) {
            result.push(voice);
          }
        } else {
          result.push(voice);
        }
      });
      if(result.length > 1) {
        result.push({
          id: 'force_default',
          name: i18n.t('system_default_voice', "System Default Voice"),
        });
        result.unshift({
          id: 'default',
          name: i18n.t('select_a_voice', '[ Select A Voice ]')
        });
      }
      // this is a weird hack because the the voice uri needs to be set *after* the
      // voice list is generated in order to make sure the correct default is selected
      var val = this.get('pending_preferences.device.voice.voice_uri');
      this.set_voice_stuff(val);
      return result;
    }
  ),
  set_voice_stuff(val) {
    this.set('pending_preferences.device.voice.voice_uri', 'tmp_needs_changing');
    var _this = this;
    runLater(function() {
      _this.set('pending_preferences.device.voice.voice_uri', val);
    });
  },
  active_sidebar_options: computed('pending_preferences.sidebar_boards', function() {
    var res = this.get('pending_preferences.sidebar_boards');
    if(!res || res.length === 0) {
     res = [].concat(window.user_preferences.any_user.default_sidebar_boards);
    }
    res.forEach(function(b, idx) { b.idx = idx; });
    return res;
  }),
  set_limited_logging: observer('model.has_logging_code', 'pending_preferences.logging_cutoff', 'pending_preferences.private_logging', function() {
    if(this.get('model.has_logging_code') || ((this.get('pending_preferences.logging_cutoff') || 'none') != 'none') || this.get('pending_preferences.private_logging')) {
      this.set('limited_logging', true);
    }
  }),
  uncomfirmed_pin: computed('model.has_logging_code', 'model.confirmed_logging_code', function() {
    return this.get('model.has_logging_code') && !this.get('model.confirmed_logging_code');
  }),
  logging_pin: computed('model.has_logging_code', function() {
    return this.get('model.has_logging_code');
  }),
  disabled_sidebar_options: computed(
    'pending_preferences.sidebar_boards',
    'include_prior_sidebar_buttons',
    'pending_preferences.prior_sidebar_boards',
    function() {
      var defaults = window.user_preferences.any_user.default_sidebar_boards;
      if(this.get('include_prior_sidebar_buttons')) {
        (this.get('pending_preferences.prior_sidebar_boards') || []).forEach(function(b) {
          if(!defaults.find(function(o) { return (o.key && o.key == b.key) || (o.alert && b.alert); })) {
            defaults.push(b);
          }
        });
      }
      var active = this.get('active_sidebar_options');
      var res = [];
      defaults.forEach(function(d) {
        if(!active.find(function(o) { return (o.key && o.key == d.key) || (o.alert && d.alert); })) {
          res.push(d);
        }
      });
      return res;
    }
  ),
  disabled_sidebar_options_or_prior_sidebar_boards: computed(
    'disabled_sidebar_options',
    'pending_preferences.prior_sidebar_boards',
    function() {
      return (this.get('disabled_sidebar_options') || []).length > 0 || (this.get('pending_preferences.prior_sidebar_boards') || []).length > 0;
    }
  ),
  logging_changed: observer('pending_preferences.logging', function() {
    if(this.get('pending_preferences.logging')) {
      if(this.get('logging_set') === false) {
        var _this = this;
        modal.open('enable-logging', {save: false, user: this.get('model')}).then(function() {
          _this.set('pending_preferences.allow_log_reports', _this.get('model.preferences.allow_log_reports'));
          _this.set('pending_preferences.allow_log_publishing', _this.get('model.preferences.allow_log_publishing'));
          _this.set('pending_preferences.geo_logging', _this.get('model.preferences.geo_logging'));
        });
      }
    }
    this.set('logging_set', this.get('pending_preferences.logging'));
  }),
  buttons_stretched: computed('pending_preferences.stretch_buttons', function() {
    return this.get('pending_preferences.stretch_buttons') && this.get('pending_preferences.stretch_buttons') != 'none';
  }),
  enable_alternate_voice: observer(
    'pending_preferences.device.alternate_voice.enabled',
    'pending_preferences.device.alternate_voice.for_scanning',
    'pending_preferences.device.alternate_voice.for_fishing',
    'pending_preferences.device.alternate_voice.for_buttons',
    function() {
      var alt = this.get('pending_preferences.device.alternate_voice') || {};
      if(alt.enabled && alt.for_scanning === undefined && alt.for_fishing === undefined && alt.for_buttons === undefined) {
        emberSet(alt, 'for_scanning', true);
        emberSet(alt, 'for_messages', true);
      }
      if(alt.for_scanning || alt.for_fishing || alt.for_buttons) {
        emberSet(alt, 'enabled', true);
      }
      this.set('pending_preferences.device.alternate_voice', alt);
    }
  ),
  not_scanning: computed('pending_preferences.device.scanning', function() {
    return !this.get('pending_preferences.device.scanning');
  }),
  not_fishing: computed('pending_preferences.device.fishing', function() {
    return !this.get('pending_preferences.device.fishing');
  }),
  audio_switching_delays: computed(
    'pending_preferences.device.voice.target',
    'pending_preferences.device.alternate_voice.target',
    function() {
      if(this.get('audio_target_available') && capabilities.system == 'Android') {
        var res = {};
        if(['speaker', 'earpiece', 'headset_or_earpiece'].indexOf(this.get('pending_preferences.device.voice.target')) != -1) {
          res.primary = true;
        }
        if(['speaker', 'earpiece', 'headset_or_earpiece'].indexOf(this.get('pending_preferences.device.alternate_voice.target')) != -1) {
          res.alternate = true;
        }
      } else {
        return {};
      }
    }
  ),
  audio_target_available: computed(function() {
    return capabilities.installed_app && (capabilities.system == 'iOS' || capabilities.system == 'Android');
  }),
  update_can_record_tags: observer('model.id', function() {
    var _this = this;
    capabilities.nfc.available().then(function(res) {
      _this.set('can_record_tags', res);
    }, function() {
      _this.set('can_record_tags', false);
    });
  }),

  // -------------------------------------------------------------------------
  // LLM Voice Consent preferences
  // -------------------------------------------------------------------------

  /** List of available LLM voice provider choices for the settings UI */
  llmVoiceProviderList: computed(function() {
    return [
      { name: i18n.t('llm_voice_sherpa', "SherpaTTS (local, no data leaves server)"), id: 'sherpa' },
      { name: i18n.t('llm_voice_openai', "Cloud TTS (sends text to third-party API)"), id: 'openai' }
    ];
  }),

  /** Human-readable explanation of what consent covers for the selected provider */
  llmVoiceConsentExplanation: computed('pending_preferences.llm_voice_provider_preference', function() {
    var providerId = this.get('pending_preferences.llm_voice_provider_preference') || 'sherpa';
    return llmVoiceConsentGate.consentExplanation(providerId);
  }),

  /** Whether the chosen provider is a cloud provider (requires stricter consent) */
  llmVoiceIsCloudProvider: computed('pending_preferences.llm_voice_provider_preference', function() {
    var providerId = this.get('pending_preferences.llm_voice_provider_preference') || 'sherpa';
    return !llmVoiceConsentGate.isLocalProvider(providerId);
  }),

  /** Whether this user has supervisors who need to approve LLM voice usage */
  llmVoiceRequiresSupervisorApproval: computed('model.supervisor_user_ids', function() {
    var ids = this.get('model.supervisor_user_ids');
    return !!(ids && ids.length > 0);
  }),

  /** Show the supervisor consent toggle only for supervised users */
  showLlmVoiceSupervisorConsent: computed(
    'pending_preferences.llm_voice_consent',
    'llmVoiceRequiresSupervisorApproval',
    function() {
      return this.get('pending_preferences.llm_voice_consent') && this.get('llmVoiceRequiresSupervisorApproval');
    }
  ),

  /** List of LLM voices available from the current provider */
  llmVoiceList: computed(function() {
    var provider = llmVoiceProviders.getDefaultProvider();
    if (!provider) { return []; }
    // listVoices is async but we return a static snapshot for the template
    var sherpaProvider = llmVoiceProviders.getProvider('sherpa');
    if (sherpaProvider) {
      // QWEN3_VOICES is a static list, so we can build from it synchronously
      return [
        { id: 'sherpa:vivian', name: 'Vivian', locale: 'en-US', gender: 'female' },
        { id: 'sherpa:serena', name: 'Serena', locale: 'en-US', gender: 'female' },
        { id: 'sherpa:ryan', name: 'Ryan', locale: 'en-US', gender: 'male' },
        { id: 'sherpa:dylan', name: 'Dylan', locale: 'en-US', gender: 'male' },
        { id: 'sherpa:aiden', name: 'Aiden', locale: 'en-US', gender: 'male' },
        { id: 'sherpa:uncle_fu', name: 'Uncle Fu', locale: 'zh-CN', gender: 'male' },
        { id: 'sherpa:ono_anna', name: 'Ono Anna', locale: 'ja-JP', gender: 'female' },
        { id: 'sherpa:sohee', name: 'Sohee', locale: 'ko-KR', gender: 'female' },
        { id: 'sherpa:eric', name: 'Eric', locale: 'de-DE', gender: 'male' },
        { id: 'sherpa:pierre', name: 'Pierre', locale: 'fr-FR', gender: 'male' },
        { id: 'sherpa:carlos', name: 'Carlos', locale: 'es-ES', gender: 'male' },
        { id: 'sherpa:mateo', name: 'Mateo', locale: 'pt-BR', gender: 'male' },
        { id: 'sherpa:marco', name: 'Marco', locale: 'it-IT', gender: 'male' },
        { id: 'sherpa:ivan', name: 'Ivan', locale: 'ru-RU', gender: 'male' }
      ];
    }
    return [];
  }),

  /** Human-friendly list of supported languages for per-language voice mapping */
  llmSupportedLanguages: computed(function() {
    var labels = {
      'en': 'English', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean',
      'de': 'German', 'fr': 'French', 'es': 'Spanish', 'pt': 'Portuguese',
      'it': 'Italian', 'ru': 'Russian'
    };
    return SHERPA_TTS_LANGUAGES.map(function(code) {
      return { code: code, label: labels[code] || code };
    });
  }),

  actions: {
    plus_minus: function(direction, attribute) {
      var default_value = 1.0;
      var step = 0.1;
      var max = 10;
      var min = 0.1;
      var empty_on_default = false;
      if(attribute.match(/volume/)) {
        max = 2.0;
      } else if(attribute.match(/pitch/)) {
        max = 2.0;
      } else if(attribute == 'pending_preferences.activation_cutoff') {
        min = 0;
        max = 5000;
        step = 100;
        default_value = 0;
        empty_on_default = true;
      } else if(attribute == 'pending_preferences.activation_minimum') {
        min = 0;
        max = 5000;
        step = 100;
        default_value = 0;
        empty_on_default = true;
      } else if(attribute == 'pending_preferences.device.eyegaze_dwell') {
        min = 0;
        max = 5000;
        step = 100;
        default_value = 1000;
        empty_on_default = true;
      } else if(attribute == 'pending_preferences.device.eyegaze_delay') {
        min = 0;
        max = 5000;
        step = 100;
        default_value = 100;
        empty_on_default = true;
      } else if(attribute == 'pending_preferences.device.dwell_duration') {
        min = 0;
        max = 20000;
        step = 100;
        default_value = 1000;
        empty_on_default = true;
      } else if(attribute == 'pending_preferences.board_jump_delay') {
        min = 100;
        max = 5000;
        step = 100;
        default_value = 500;
      } else if(attribute == 'pending_preferences.device.scanning_interval') {
        min = 0;
        max = 5000;
        step = 100;
        default_value = 1000;
      } else if(attribute == 'pending_preferences.device.scanning_region_columns' || attribute == 'pending_preferences.device.scanning_region_rows') {
        min = 1;
        max = 10;
        step = 1;
      } else if(attribute == 'pending_preferences.debounce') {
        min = 0;
        max = 5000;
        step = 100;
        default_value = 100;
      } else if(attribute == 'pending_preferences.zoom_settings.auto_zoom_timeout') {
        min = 0;
        max = 10000;
        step = 100;
        default_value = 0;
        empty_on_default = true;
      } else if(attribute == 'pending_preferences.layout_settings.custom_rows') {
        min = 1;
        max = 20;
        step = 1;
        default_value = 4;
      } else if(attribute == 'pending_preferences.layout_settings.custom_columns') {
        min = 1;
        max = 20;
        step = 1;
        default_value = 6;
      }
      var value = parseFloat(this.get(attribute), 10) || default_value;
      if(direction == 'minus') {
        value = value - step;
      } else {
        value = value + step;
      }
      value = Math.round(Math.min(Math.max(min, value), max) * 100) / 100;
      if(value == default_value && empty_on_default) {
        value = "";
      }
      this.set(attribute, value);
    },
    choose_skin: function(id) {
      var skin = id;
      if(id.match(/^mix/)) {
        skin = skin + '::' + this.get('model.id');
      }
      if(id == 'mix_only' || id == 'mix_prefer') {
        skin = skin + "::limit-";
        (this.get('current_skin.options') || []).forEach(function(opt) {
          if(opt.checked) {
            skin = skin + (id == 'mix_only' ? '1' : '3');
          } else {
            skin = skin + (id == 'mix_only' ? '0' : '1');
          }
        });
      }
      this.set('pending_preferences.skin', skin);
    },
    phrases: function() {
      this.set('model.preferences.phrase_categories', this.get('phrase_categories_string').split(/\s*,\s*/).filter(function(s) { return s; }));
      modal.open('modals/phrases', {user: this.get('model')})
    },
    clear_home: function() {
      this.set('pending_preferences.home_board', {id: 'none'});
    },
    savePreferences: function(skip_redirect) {
      this.set('skip_save_on_transition', true);
      var pitch = parseFloat(this.get('pending_preferences.device.voice.pitch'));
      if(isNaN(pitch)) { pitch = 1.0; }
      var volume = parseFloat(this.get('pending_preferences.device.voice.volume'));
      if(isNaN(volume)) { volume = 1.0; }
      this.set('pending_preferences.device.voice.pitch', pitch);
      this.set('pending_preferences.device.voice.volume', volume);
      if(this.get('phrase_categories_string')) {
        this.set('pending_preferences.phrase_categories', this.get('phrase_categories_string').split(/\s*,\s*/).filter(function(s) { return s; }));
      }
      if(!this.get('logging_pin')) {
        this.set('pending_preferences.logging_code', 'false');
      }
      this.set('pending_preferences.substitutions', editManager.parse_rules(this.get('substitution_string')));
      this.set('phrase_categories_string', (this.get('pending_preferences.phrase_categories') || []).join(', '));

      var _this = this;
      ['debounce', 'device.dwell_release_distance', 'device.scanning_next_keycode', 'device.scanning_prev_keycode', 'device.scanning_region_columns', 'device.scanning_region_rows', 'device.scanning_select_keycode', 'device.scanning_interval'].forEach(function(key) {
        var val = _this.get('pending_preferences.' + key);
        if(val && val.match && val.match(/\d/)) {
          var num = parseInt(val, 10);
          _this.set('pending_preferences.' + key, num);
        }
      });

      // Coerce zoom_settings.auto_zoom_timeout to integer if set
      var zoomSettings = this.get('pending_preferences.zoom_settings');
      if (zoomSettings && zoomSettings.auto_zoom_timeout) {
        var timeoutVal = parseInt(zoomSettings.auto_zoom_timeout, 10);
        if (!isNaN(timeoutVal)) {
          this.set('pending_preferences.zoom_settings.auto_zoom_timeout', timeoutVal);
        }
      }

      // Coerce layout_settings.custom_rows and custom_columns to integers if set
      var layoutSettings = this.get('pending_preferences.layout_settings');
      if (layoutSettings) {
        if (layoutSettings.custom_rows) {
          var rowsVal = parseInt(layoutSettings.custom_rows, 10);
          if (!isNaN(rowsVal)) {
            this.set('pending_preferences.layout_settings.custom_rows', rowsVal);
          }
        }
        if (layoutSettings.custom_columns) {
          var colsVal = parseInt(layoutSettings.custom_columns, 10);
          if (!isNaN(colsVal)) {
            this.set('pending_preferences.layout_settings.custom_columns', colsVal);
          }
        }
      }

      var user = this.get('model');
      var pending = this.get('pending_preferences');
      var orig = this.get('original_preferences');
      // check for values that have actually changed since page load
      for(var key in pending) {
        if(pending[key] == null) {
          if(orig[key] == null) { } else {
            user.set('preferences.' + key, pending[key]);
          }
        } else if(key == 'device') {
          for(var dkey in pending[key]) {
            if(['string', 'boolean', 'number'].indexOf(typeof(pending[key][dkey])) != -1) {
              if(pending[key][dkey] != orig[key][dkey]) {
                user.set('preferences.device.' + dkey, pending[key][dkey]);
              }
            } else if(pending[key][dkey] == null) {
              if(orig[key][dkey] == null) { } else {
                user.set('preferences.device.' + dkey, pending[key][dkey]);
              }
            } else if(pending[key][dkey] != orig[key][dkey]) {
              user.set('preferences.device.' + dkey, pending[key][dkey]);
            }
          }
        } else if(['string', 'boolean', 'number'].indexOf(typeof(pending[key])) != -1) {
          if(pending[key] != orig[key]) {
            user.set('preferences.' + key, pending[key]);
          }
        } else {
          user.set('preferences.' + key, pending[key]);
        }
      }
      user.set('preferences.progress.preferences_edited', true);
      user.set('preferences.device.updated', true);
      var _this = this;
      _this.set('status', {saving: true});
      user.save().then(function(user) {
        _this.check_core_words();
        _this.set('status', null);
        if(user.get('id') == app_state.get('currentUser.id')) {
          app_state.set('currentUser', user);
        }
        if(!skip_redirect) {
          _this.transitionToRoute('user', user.get('user_name'));
        }
      }, function() {
        _this.set('status', {error: true});
      });
    },
    cancelSave: function() {
      this.set('advanced', false);
      var user = this.get('model');
      user.rollbackAttributes();
      this.set('skip_save_on_transition', true);
      this.transitionToRoute('user', user.get('user_name'));
    },
    check_logging_code: function() {
      var _this = this;
      _this.set('pin_status', {checking: true});
      var code = _this.get('logging_code_check');
      persistence.ajax('/api/v1/logs/code_check', {type: 'POST', data: {
        user_id: _this.get('model.id'),
        code: code
      }}).then(function(res) {
        if(res.valid) {
          _this.set('pin_status', null);
          _this.set('model.confirmed_logging_code', code);
        } else {
          _this.set('pin_status', {wrong: true})
        }
      }, function(err) {
        _this.set('pin_status', {error: true});
      })
    },
    sidebar_button_settings: function(button) {
      modal.open('sidebar-button-settings', {button: button});
    },
    include_prior_sidebar_buttons: function() {
      this.set('include_prior_sidebar_buttons', true);
    },
    move_sidebar_button: function(button, direction) {
      var active = this.get('active_sidebar_options');
      var disabled = this.get('disabled_sidebar_options');
      if(direction == 'up') {
        var pre = active.slice(0, Math.max(0, button.idx - 1));
        var swap = [button];
        if(active[button.idx - 1]) {
          swap.push(active[button.idx - 1]);
        }
        var post = active.slice(button.idx + 1);
        this.set('pending_preferences.sidebar_boards', pre.concat(swap, post));
      } else if(direction == 'down') {
        var pre = active.slice(0, Math.max(0, button.idx));
        var swap = [button];
        if(active[button.idx + 1]) {
          swap.unshift(active[button.idx + 1]);
        }
        var post = active.slice(button.idx + 2);
        this.set('pending_preferences.sidebar_boards', pre.concat(swap, post));
      } else if(direction == 'delete') {
        var pre = active.slice(0, button.idx);
        var post = active.slice(button.idx + 1);
        var prior = [].concat(this.get('pending_preferences.prior_sidebar_boards') || []);
        prior.push(button);
        prior = prior.uniq(function(o) { return o.special ? (o.alert + "_" + o.action + "_" + o.arg) : o.key; });
        this.set('pending_preferences.prior_sidebar_boards', prior);
        this.set('pending_preferences.sidebar_boards', pre.concat(post));
      } else if(direction == 'restore') {
        this.set('pending_preferences.sidebar_boards', active.concat([button]));
      }
    },
    test_dwell: function() {
      this.set('testing_dwell', !this.get('testing_dwell'));
    },
    premium_voices: function() {
      var _this = this;
      modal.open('premium-voices', {user: _this.get('model')});
    },
    test_voice: function(which) {
      if(which == 'alternate') {
        utterance.test_voice(this.get('pending_preferences.device.alternate_voice.voice_uri'), this.get('pending_preferences.device.alternate_voice.rate'), this.get('pending_preferences.device.alternate_voice.pitch'), this.get('pending_preferences.device.alternate_voice.volume'), this.get('pending_preferences.device.alternate_voice.target'));
      } else {
        utterance.test_voice(this.get('pending_preferences.device.voice.voice_uri'), this.get('pending_preferences.device.voice.rate'), this.get('pending_preferences.device.voice.pitch'), this.get('pending_preferences.device.voice.volume'), this.get('pending_preferences.device.voice.target'));
      }
    },
    delete_logs: function() {
      modal.open('confirm-delete-logs', {user: this.get('model')});
    },
    toggle_advanced: function() {
      this.set('advanced', !this.get('advanced'));
    },
    modify_core: function() {
      var _this = this;
      modal.open('modify-core-words', {user: this.get('model')}).then(function() {
        _this.check_core_words();
      });
    },
    add_phrase: function() {
      var list = this.get('pending_preferences.requested_phrase_changes') || [];
      var str = this.get('new_phrase');
      list = list.filter(function(p) { return (p != "add:" + str) && (p != "remove:" + str); });
      list.push("add:" + str);
      this.set('pending_preferences.requested_phrase_changes', list);
    },
    calibrate: function() {
      capabilities.eye_gaze.calibratable(function(res) {
        if(res) {
          capabilities.eye_gaze.calibrate();
        } else {
          modal.error(i18n.t('cannot_calibrate', "Eye gaze cannot be calibrated at this time"));
        }
      });
    },
    remove_phrase: function(str) {
      var list = this.get('pending_preferences.requested_phrase_changes') || [];
      list = list.filter(function(p) { return (p != "add:" + str) && (p != "remove:" + str); });
      list.push("remove:" + str);
      this.set('pending_preferences.requested_phrase_changes', list);
    },
    program_tag: function() {
      modal.open('modals/program-nfc', {listen: true});
    },
    clear_nfc_tags: function() {
      this.set('pending_preferences.tag_ids', []);
    },
    edit_sidebar: function() {
      this.set('editing_sidebar', true);
    },
    add_sidebar_board: function(key) {
      var _this = this;
      _this.set('add_sidebar_board_error', null);
      var add_board = function(opts) {
        var boards = [].concat(_this.get('pending_preferences.sidebar_boards') || []);
        boards.unshift(opts);
        _this.set('pending_preferences.sidebar_boards', boards);
        _this.set('new_sidebar_board', null);
      };
      if(key.match(/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_:%-]+|\d+_\d+/)) {
        // try to find board, error if not available
        _this.store.findRecord('board', key).then(function(board) {
          add_board({
            name: board.get('name'),
            key: board.get('key'),
            image: board.get('image_url')
          });
        }, function(err) {
          _this.set('add_sidebar_board_error', i18n.t('board_not_found', "No board found with that key"));
        });
      } else if(key.match(/^:\w+/)) {
        var action = key.match(/^[^\(]+/)[0];
        var arg = null;
        if(action) {
          var arg = key.slice(action.length + 1, key.length - 1);
        }
        var image_url = "https://d18vdu4p71yql0.cloudfront.net/libraries/noun-project/touch_437_g.svg";
        var special = SweetSuite.find_special_action(key);
        if(special && !special.completion && !special.modifier && !special.inline) {
          add_board({
            name: action.slice(1),
            special: true,
            image: image_url,
            action: action
          });
          image_url = "https://d18vdu4p71yql0.cloudfront.net/libraries/noun-project/Gear-46ef6dda86.svg";
        } else if(action == ':app') {
          var app_name = 'app';
          if(arg.match(/eyetech/)) {
            app_name = 'eyetech';
            image_url = "https://d18vdu4p71yql0.cloudfront.net/libraries/noun-project/Eye-c002f4a036.svg";
          }
          add_board({
            name: app_name,
            special: true,
            image: image_url,
            action: action,
            arg: arg
          });
        }
      } else {
        _this.set('add_sidebar_board_error', i18n.t('bad_sidebar_board_key', "Unrecogonized value, please enter a board key or action code"));
      }

    },

    // -----------------------------------------------------------------------
    // LLM Voice Consent Actions
    // -----------------------------------------------------------------------

    /** Toggle the LLM voice consent flag on or off. */
    toggle_llm_voice_consent: function() {
      var current = this.get('pending_preferences.llm_voice_consent');
      if (current) {
        // Revoking consent — also clear supervisor approval and reset provider
        this.set('pending_preferences.llm_voice_consent', false);
        this.set('pending_preferences.supervisor_llm_voice_consent', false);
        this.set('pending_preferences.llm_voice_provider_preference', 'sherpa');
      } else {
        this.set('pending_preferences.llm_voice_consent', true);
      }
    },

    /** Toggle supervisor-level LLM voice approval (only meaningful for supervised users). */
    toggle_supervisor_llm_voice_consent: function() {
      var current = this.get('pending_preferences.supervisor_llm_voice_consent');
      this.set('pending_preferences.supervisor_llm_voice_consent', !current);
    },

    /** Change the preferred LLM voice provider, resetting consent if switching away from local. */
    change_llm_voice_provider: function(providerId) {
      this.set('pending_preferences.llm_voice_provider_preference', providerId);
      // If switching to a cloud provider and user doesn't have supervisor consent, warn
      if (!llmVoiceConsentGate.isLocalProvider(providerId) && this.get('llmVoiceRequiresSupervisorApproval')) {
        if (!this.get('pending_preferences.supervisor_llm_voice_consent')) {
          this.set('llm_voice_cloud_consent_warning', true);
        }
      } else {
        this.set('llm_voice_cloud_consent_warning', false);
      }
    },

    /** Set the default LLM voice from the dropdown. */
    set_default_llm_voice: function(voiceId) {
      this.set('pending_preferences.default_llm_voice', voiceId || null);
    },

    /** Test the currently selected LLM voice by synthesizing a short phrase. */
    test_llm_voice: function() {
      var voiceId = this.get('pending_preferences.default_llm_voice');
      if (!voiceId) { return; }
      var prefs = this.get('pending_preferences');
      var resolved = llmVoiceConsentGate.resolveProvider(prefs);
      if (resolved.provider) {
        resolved.provider.synthesizeWithFallback(
          'Hello, this is my voice.',
          voiceId,
          { lang: 'en' }
        ).then(function(audioUrl) {
          var audio = new Audio(audioUrl);
          audio.play();
        }).catch(function(err) {
          console.warn('LLM voice test failed:', err);
        });
      }
    },

    /** Set a per-language voice mapping. */
    set_llm_voice_for_language: function(langCode, voiceId) {
      var prefs = this.get('pending_preferences');
      var updated = llmVoiceLanguageMap.setVoiceForLanguage(langCode, voiceId, prefs);
      this.set('pending_preferences.llm_voice_language_map', updated.llm_voice_language_map);
    }
  }
});
