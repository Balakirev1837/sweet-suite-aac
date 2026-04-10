/**
  Copyright 2021, OpenAAC
  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
**/

import EmberObject from '@ember/object';
import { get as emberGet } from '@ember/object';
import { later as runLater } from '@ember/runloop';
import Zumly from 'zumly';

/**
 * ZumlyManager wraps Zumly initialization and lifecycle management
 * for the Sweet Suite AAC application. It provides an Ember-compatible
 * interface to the Zumly zoom-navigation engine, using the WAAPI driver
 * for best animation performance.
 *
 * Usage:
 *   import zumlyManager from 'frontend/utils/zumly_manager';
 *   await zumlyManager.init('.my-canvas', {
 *     initialView: 'home',
 *     views: { home: '...', detail: '...' }
 *   });
 */
var zumlyManager = EmberObject.extend({

  /**
   * The currently active Zumly instance, or null if not initialized.
   * @type {Zumly|null}
   */
  instance: null,

  /**
   * Default transition configuration using the WAAPI driver.
   * WAAPI (Web Animations API) provides smooth, hardware-accelerated
   * animations with no additional library dependencies.
   */
  defaultTransitions: {
    driver: 'waapi',
    duration: '600ms',
    ease: 'ease-in-out',
    cover: 'width',
    effects: ['blur(3px) brightness(0.7)', 'blur(8px) saturate(0)'],
    stagger: 0,
    hideTrigger: false
  },

  /**
   * Default navigation configuration for accessibility-friendly AAC use.
   * Depth nav enabled (back button), lateral nav in auto mode.
   */
  defaultNavOptions: {
    depthNav: { position: 'bottom-left' },
    lateralNav: { mode: 'auto', dots: true, position: 'bottom-center' }
  },

  /**
   * Default input configuration. Click and keyboard enabled by default;
   * wheel and touch can be enabled per-context for motor-accessibility.
   */
  defaultInputs: {
    click: true,
    keyboard: true,
    wheel: false,
    touch: true
  },

  /**
   * Initializes Zumly and mounts it to the specified canvas element.
   *
   * @param {string} mountSelector - CSS selector for the canvas element
   *   (must reference an element with class `zumly-canvas`).
   * @param {Object} options - Zumly configuration options.
   * @param {string} options.initialView - Name of the first view to display.
   * @param {Object} options.views - Map of view names to view sources
   *   (HTML strings, URLs, async functions, or objects with render()).
   * @param {string[]} [options.preload] - View names to preload during init.
   * @param {Object} [options.transitions] - Override default transition config.
   * @param {boolean|Object} [options.depthNav] - Override depth nav settings.
   * @param {boolean|Object} [options.lateralNav] - Override lateral nav settings.
   * @param {boolean|Object} [options.inputs] - Override input method settings.
   * @param {boolean} [options.debug=false] - Enable debug logging.
   * @param {boolean} [options.deferred=false] - Defer rendering until after animation.
   * @returns {Promise} Resolves when Zumly is fully initialized.
   * @throws {Error} If mountSelector does not match a DOM element.
   */
  init: function(mountSelector, options) {
    var canvas = document.querySelector(mountSelector);
    if (!canvas) {
      throw new Error('Zumly canvas element not found: ' + mountSelector);
    }

    // Tear down any existing instance before re-initializing
    this.teardown();

    var transitions = this.mergeTransitions(
      this.defaultTransitions,
      options.transitions
    );

    var navOptions = this.mergeNavOptions(options);

    var inputs = options.inputs;
    if (inputs === undefined || inputs === null) {
      inputs = this.defaultInputs;
    } else if (typeof inputs === 'object') {
      inputs = this.mergeInputs(this.defaultInputs, inputs);
    }

    var config = {
      mount: mountSelector,
      initialView: options.initialView,
      views: options.views || {},
      transitions: transitions,
      depthNav: navOptions.depthNav,
      lateralNav: navOptions.lateralNav,
      inputs: inputs,
      debug: options.debug || false,
      deferred: options.deferred || false
    };

    if (options.preload) {
      config.preload = options.preload;
    }

    var instance = new Zumly(config);
    this.set('instance', instance);

    return instance.init().then(function() {
      return instance;
    });
  },

  /**
   * Zooms into the specified view by name. If a trigger element is
   * provided, the zoom origin will be calculated from its position.
   *
   * @param {string} viewName - The target view to zoom into.
   * @returns {Promise} Resolves when the zoom-in transition completes.
   */
  zoomIn: function(viewName) {
    var inst = this.get('instance');
    if (!inst) {
      return Promise.reject(new Error('Zumly not initialized'));
    }
    return inst.zoomTo(viewName);
  },

  /**
   * Zooms out to the parent view in the navigation stack.
   *
   * @returns {Promise} Resolves when the zoom-out transition completes.
   */
  zoomOut: function() {
    var inst = this.get('instance');
    if (!inst) {
      return Promise.reject(new Error('Zumly not initialized'));
    }
    return inst.back();
  },

  /**
   * Returns the name of the currently displayed view.
   *
   * @returns {string|null} The current view name, or null if not initialized.
   */
  getCurrentViewName: function() {
    var inst = this.get('instance');
    if (!inst) { return null; }
    return inst.getCurrentViewName();
  },

  /**
   * Registers a Zumly plugin on the active instance.
   * Must be called after init().
   *
   * @param {Object|Function} plugin - Plugin with install() method or function.
   * @param {Object} [options] - Options passed to the plugin's install().
   */
  usePlugin: function(plugin, options) {
    var inst = this.get('instance');
    if (!inst) {
      throw new Error('Zumly not initialized, call init() first');
    }
    inst.use(plugin, options);
  },

  /**
   * Tears down the current Zumly instance, releasing DOM references
   * and event listeners. Safe to call multiple times.
   */
  teardown: function() {
    var inst = this.get('instance');
    if (inst) {
      // Remove canvas content if the element still exists
      try {
        var canvas = document.querySelector(emberGet(inst, '_mount') || '');
        if (canvas) {
          canvas.innerHTML = '';
        }
      } catch (e) {
        // Selector may be invalid after teardown; ignore
      }
      this.set('instance', null);
    }
  },

  /**
   * Schedules teardown on the Ember run loop to integrate with
   * component/component destroy lifecycle hooks.
   */
  destroy: function() {
    runLater(this.teardown.bind(this));
  },

  /**
   * Merges user-provided transition overrides with defaults.
   *
   * @param {Object} defaults - Default transition settings.
   * @param {Object} [overrides] - User overrides to apply.
   * @returns {Object} Merged transition configuration.
   */
  mergeTransitions: function(defaults, overrides) {
    if (!overrides) { return defaults; }
    var merged = {};
    for (var key in defaults) {
      if (defaults.hasOwnProperty(key)) {
        merged[key] = defaults[key];
      }
    }
    for (var key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        merged[key] = overrides[key];
      }
    }
    return merged;
  },

  /**
   * Merges user-provided navigation options with defaults.
   *
   * @param {Object} options - The full options object from init().
   * @returns {Object} Navigation config with depthNav and lateralNav.
   */
  mergeNavOptions: function(options) {
    var result = {
      depthNav: options.depthNav !== undefined ? options.depthNav : this.defaultNavOptions.depthNav,
      lateralNav: options.lateralNav !== undefined ? options.lateralNav : this.defaultNavOptions.lateralNav
    };
    return result;
  },

  /**
   * Merges user-provided input method settings with defaults.
   *
   * @param {Object} defaults - Default input settings.
   * @param {Object} overrides - User overrides.
   * @returns {Object} Merged input configuration.
   */
  mergeInputs: function(defaults, overrides) {
    var merged = {};
    for (var key in defaults) {
      if (defaults.hasOwnProperty(key)) {
        merged[key] = defaults[key];
      }
    }
    for (var key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        merged[key] = overrides[key];
      }
    }
    return merged;
  }
}).create();

export default zumlyManager;
