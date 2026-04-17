/**
  Copyright 2021, OpenAAC
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
**/

import Component from '@ember/component';
import { computed } from '@ember/object';
import { observer } from '@ember/object';
import { get as emberGet } from '@ember/object';
import { htmlSafe } from '@ember/string';
import { later as runLater } from '@ember/runloop';
import zumlyManager from '../utils/zumly_manager';

/**
 * ZumlyCanvas renders an interactive zoom-navigation canvas for AAC boards.
 *
 * It accepts a `board` parameter (Ember model with grid.rows, grid.columns,
 * grid.order, and buttons) and generates z-view content for Zumly. The canvas
 * supports configurable grid sizes for motor/visual accessibility, renders with
 * proper ARIA landmarks (role="grid", role="gridcell"), and can operate in both
 * grid and non-grid layout modes.
 *
 * Usage:
 *   {{zumly-canvas board=board gridRows=6 gridColumns=8}}
 *   {{zumly-canvas board=board layoutMode="freeform"}}
 *
 * @class ZumlyCanvas
 * @extends Ember.Component
 */
export default Component.extend({
  /**
   * Render as a div with the zumly-canvas class.
   * @type {string}
   */
  tagName: 'div',
  classNames: ['zumly-canvas'],

  /**
   * HTML attributes to bind to the element.
   * @type {string[]}
   */
  attributeBindings: ['role', 'ariaLabel:aria-label', 'tabindex'],

  /**
   * ARIA role for the canvas container — acts as a grid for accessibility.
   * @type {string}
   */
  role: 'grid',

  /**
   * Accessible label describing the Zumly canvas.
   * @type {string}
   */
  ariaLabel: 'Zumly zoom navigation canvas',

  /**
   * Make the canvas focusable for keyboard navigation.
   * @type {number}
   */
  tabindex: 0,

  /**
   * Board data to render as Zumly z-views. Expected to be an Ember model
   * with grid.rows, grid.columns, grid.order, and buttons properties.
   * @type {Object|null}
   */
  board: null,

  /**
   * Layout mode: 'grid' renders a structured button grid with ARIA gridcell
   * roles; 'freeform' renders buttons without grid structure for future
   * visual scene display support.
   * @type {string}
   */
  layoutMode: 'grid',

  /**
   * Override grid rows from board settings. When provided, takes precedence
   * over the board's grid.rows value. Allows users to configure different
   * button sizes based on motor/visual ability.
   * @type {number|null}
   */
  gridRows: null,

  /**
   * Override grid columns from board settings. When provided, takes precedence
   * over the board's grid.columns value. Allows users to configure different
   * button sizes based on motor/visual ability.
   * @type {number|null}
   */
  gridColumns: null,

  /**
   * Tracks the last DOM element that triggered a zoom-in, so focus can
   * be returned to it on zoom-out per WCAG focus management requirements.
   * @type {HTMLElement|null}
   * @private
   */
  _lastZoomTriggerElement: null,

  /**
   * Effective number of rows used for rendering. Falls back to the board's
   * grid.rows if gridRows override is not set.
   * @type {number}
   */
  effectiveRows: computed('gridRows', 'board.grid.rows', function() {
    var override = this.get('gridRows');
    if (override !== null && override !== undefined) {
      return parseInt(override, 10);
    }
    var boardRows = this.get('board.grid.rows');
    return boardRows ? parseInt(boardRows, 10) : 2;
  }),

  /**
   * Effective number of columns used for rendering. Falls back to the board's
   * grid.columns if gridColumns override is not set.
   * @type {number}
   */
  effectiveColumns: computed('gridColumns', 'board.grid.columns', function() {
    var override = this.get('gridColumns');
    if (override !== null && override !== undefined) {
      return parseInt(override, 10);
    }
    var boardCols = this.get('board.grid.columns');
    return boardCols ? parseInt(boardCols, 10) : 4;
  }),

  /**
   * Whether the component is currently in grid layout mode.
   * @type {boolean}
   */
  isGridLayout: computed('layoutMode', function() {
    return this.get('layoutMode') === 'grid';
  }),

  /**
   * Generates CSS grid template based on effective rows and columns.
   * Returns an htmlSafe style string for the grid container.
   * @type {string}
   */
  gridStyle: computed('effectiveRows', 'effectiveColumns', function() {
    var rows = this.get('effectiveRows');
    var cols = this.get('effectiveColumns');
    return htmlSafe(
      'display: grid; grid-template-rows: repeat(' + rows + ', 1fr); grid-template-columns: repeat(' + cols + ', 1fr);'
    );
  }),

  /**
   * Builds the grid cells data from board data. Each cell includes button
   * info and its row/column position for ARIA gridcell attributes.
   * Returns an array of cell objects.
   * @type {Array}
   */
  gridCells: computed(
    'board.id',
    'effectiveRows',
    'effectiveColumns',
    'board.grid.order',
    'board.buttons.@each.id',
    function() {
      var board = this.get('board');
      if (!board) {
        return [];
      }

      var rows = this.get('effectiveRows');
      var cols = this.get('effectiveColumns');
      var order = board.get('grid.order') || [];
      var buttons = {};
      var buttonList = board.get('buttons') || [];

      // Index buttons by id for fast lookup
      buttonList.forEach(function(btn) {
        if (btn && btn.id) {
          buttons[btn.id] = btn;
        }
      });

      var cells = [];
      var foundFirst = false;
      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var buttonId = (order[row] || [])[col];
          var button = buttonId ? buttons[buttonId] : null;
          var isFirst = !foundFirst && !!button;
          if (isFirst) { foundFirst = true; }
          cells.push({
            row: row,
            col: col,
            button: button,
            buttonId: buttonId || null,
            isEmpty: !button,
            isFolder: !!(button && button.load_board && button.load_board.id),
            isFirst: isFirst
          });
        }
      }
      return cells;
    }
  ),

  /**
   * Generates the initial z-view HTML for Zumly based on board data.
   * Returns an HTML string that Zumly will use as the first view.
   *
   * @returns {string} HTML content for the initial z-view.
   */
  buildInitialViewHTML: function() {
    var cells = this.get('gridCells');
    var isGrid = this.get('isGridLayout');

    if (isGrid) {
      return this._buildGridViewHTML(cells);
    } else {
      return this._buildFreeformViewHTML(cells);
    }
  },

  /**
   * Generates grid-layout z-view HTML with proper ARIA gridcell roles.
   *
   * @param {Array} cells - Array of cell objects from gridCells.
   * @returns {string} HTML string for a grid z-view.
   * @private
   */
  _buildGridViewHTML: function(cells) {
    var rows = this.get('effectiveRows');
    var cols = this.get('effectiveColumns');
    var html = '<div class="z-view" role="grid" aria-label="Board buttons">';

    for (var row = 0; row < rows; row++) {
      html += '<div class="z-view-row" role="row">';
      for (var col = 0; col < cols; col++) {
        var cell = cells[row * cols + col];
        if (cell && cell.button) {
          html += '<div class="z-view-cell" role="gridcell" ' +
            'data-row="' + row + '" data-col="' + col + '" ' +
            'aria-label="' + (cell.button.label || 'Empty') + '">';
          html += this._buildButtonHTML(cell.button);
          html += '</div>';
        } else {
          html += '<div class="z-view-cell empty" role="gridcell" ' +
            'data-row="' + row + '" data-col="' + col + '"></div>';
        }
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  /**
   * Generates freeform-layout z-view HTML for visual scene displays.
   * Buttons are rendered without grid structure.
   *
   * @param {Array} cells - Array of cell objects from gridCells.
   * @returns {string} HTML string for a freeform z-view.
   * @private
   */
  _buildFreeformViewHTML: function(cells) {
    var html = '<div class="z-view freeform" aria-label="Board buttons">';
    cells.forEach(function(cell) {
      if (cell.button) {
        html += '<div class="z-view-item" aria-label="' +
          (cell.button.label || 'Button') + '">';
        html += this._buildButtonHTML(cell.button);
        html += '</div>';
      }
    }.bind(this));
    html += '</div>';
    return html;
  },

  /**
   * Generates HTML for a single AAC button within a z-view cell.
   *
   * @param {Object} button - Button data object with label, image, etc.
   * @returns {string} HTML string for the button.
   * @private
   */
  _buildButtonHTML: function(button) {
    var isFolder = !!(button.load_board && button.load_board.id);
    var html = '<div class="z-view-button' +
      (isFolder ? ' zoom-me' : '') + '"';
    if (isFolder) {
      html += ' data-to="board-' + button.load_board.id + '"' +
        ' aria-expanded="false"';
    }
    html += ' tabindex="-1"';
    if (button.background_color) {
      html += ' style="background-color: ' + button.background_color + ';"';
    }
    html += '>';
    var imageUrl = emberGet(button, 'image.url') || emberGet(button, 'image_url') || button.image;
    if (imageUrl) {
      html += '<img src="' + imageUrl + '" alt="' + (button.label || '') + '" class="z-view-button-image">';
    }
    if (button.label) {
      html += '<span class="z-view-button-label">' + button.label + '</span>';
    }
    html += '</div>';
    return html;
  },

  /**
   * Initializes the Zumly instance when the component's element is inserted
   * into the DOM. Builds z-view content from the board parameter and mounts
   * Zumly via zumly_manager.
   */
  didInsertElement: function() {
    this._super.apply(this, arguments);
    this._initializeZumly();
  },

  /**
   * Tears down the Zumly instance when the component's element is about
   * to be removed from the DOM. Cleans up DOM references and event listeners.
   */
  willDestroyElement: function() {
    this._super.apply(this, arguments);
    this.set('_lastZoomTriggerElement', null);
    zumlyManager.teardown();
  },

  /**
   * Performs the actual Zumly initialization. Builds view HTML from board
   * data and calls zumly_manager.init() with the canvas selector.
   *
   * @private
   */
  _initializeZumly: function() {
    var board = this.get('board');
    if (!board) {
      return;
    }

    var viewHTML = this.buildInitialViewHTML();
    var views = {
      board: viewHTML
    };

    // Build sub-board views for any buttons that load a board
    var buttons = board.get('buttons') || [];
    buttons.forEach(function(btn) {
      if (btn && btn.load_board && btn.load_board.id) {
        views['board-' + btn.load_board.id] =
          '<div class="z-view" role="grid" aria-label="' +
          (btn.load_board.name || 'Sub-board') +
          '"><div class="z-view-row" role="row">' +
          '<div class="z-view-cell" role="gridcell" aria-label="Loading sub-board">' +
          '<span class="z-view-button-label">' +
          (btn.load_board.name || 'Loading...') +
          '</span></div></div></div>';
      }
    });

    var _this = this;
    zumlyManager.init('.zumly-canvas', {
      initialView: 'board',
      views: views
    }).then(function() {
      // Ensure aria-live region exists for screen reader announcements
      zumlyManager.getOrCreateLiveRegion('.zumly-canvas');
      // Emit action to inform parent that Zumly is ready
      if (_this.get('onReady')) {
        _this.sendAction('onReady');
      }
    }).catch(function() {
      // Initialization failed silently — canvas will show static content
    });
  },

  /**
   * Re-initializes Zumly when the board changes (new board loaded).
   * Tears down the old instance and sets up a new one.
   */
  boardChanged: observer('board.id', function() {
    var _this = this;
    // Ensure DOM is stable before re-initializing
    if (this.get('isDestroyed') || this.get('isDestroying')) {
      return;
    }
    zumlyManager.teardown();
    this._initializeZumly();
  }),

  /**
   * Handles keyboard events on the canvas for accessible grid navigation.
   * Supports arrow keys for movement between buttons, Enter and Space for
   * activation, and Home/End for jumping to the first/last button.
   * Implements the WAI-ARIA grid keyboard interaction pattern.
   *
   * @param {KeyboardEvent} event - The keyboard event.
   */
  keyDown: function(event) {
    var key = event.key;

    if (key === 'ArrowRight' || key === 'ArrowLeft' ||
        key === 'ArrowUp' || key === 'ArrowDown' ||
        key === 'Home' || key === 'End') {
      event.preventDefault();
      this._handleArrowNavigation(event);
      return;
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      var focused = document.activeElement;
      if (focused === this.element) {
        // Canvas itself has focus — focus the first navigable button
        var buttons = this._getNavigableButtons();
        if (buttons.length > 0) {
          buttons[0].setAttribute('tabindex', '0');
          buttons[0].focus();
        }
      } else if (focused && (
        focused.classList.contains('z-view-button') ||
        focused.classList.contains('zumly-canvas-cell')
      )) {
        focused.click();
      }
    }
  },

  /**
   * Handles click events on the canvas via event delegation. Tracks
   * zoom-me button clicks for focus management and announces transitions
   * to screen readers via the aria-live region.
   *
   * @param {MouseEvent} event - The click event.
   */
  click: function(event) {
    var target = event.target;
    var zoomButton = target.closest ? target.closest('.zoom-me') : null;

    if (zoomButton) {
      this.set('_lastZoomTriggerElement', zoomButton);
      var viewName = zoomButton.getAttribute('data-to');
      var label = zoomButton.textContent.trim() || 'sub-board';
      var _this = this;

      runLater(function() {
        zumlyManager.focusFirstButton('.zumly-canvas');
        zumlyManager.updateAriaExpanded('.zumly-canvas', viewName);
        _this._announceTransition('Zoomed into ' + label);
      }, 700);
      return;
    }

    // Handle back button (Zumly depth navigation)
    var backButton = target.closest ? target.closest('.zl-back, .zl-depth-nav') : null;
    if (backButton) {
      var _this = this;
      runLater(function() {
        var lastTrigger = _this.get('_lastZoomTriggerElement');
        if (lastTrigger && lastTrigger.parentNode) {
          lastTrigger.setAttribute('tabindex', '0');
          lastTrigger.focus();
        } else {
          zumlyManager.focusFirstButton('.zumly-canvas');
        }
        zumlyManager.updateAriaExpanded('.zumly-canvas', null);
        _this._announceTransition('Zoomed out to parent board');
        _this.set('_lastZoomTriggerElement', null);
      }, 700);
    }
  },

  /**
   * Returns an array of navigable button elements in the current canvas.
   * Checks for Zumly-rendered z-view buttons first, then falls back to
   * template-rendered grid cells.
   *
   * @returns {HTMLElement[]} Array of focusable button elements.
   * @private
   */
  _getNavigableButtons: function() {
    var canvas = this.element;
    if (!canvas) { return []; }
    var zumlyButtons = canvas.querySelectorAll('.z-view-button');
    if (zumlyButtons.length > 0) {
      return Array.prototype.slice.call(zumlyButtons);
    }
    var templateCells = canvas.querySelectorAll(
      '.zumly-canvas-cell:not(.empty)'
    );
    return Array.prototype.slice.call(templateCells);
  },

  /**
   * Handles arrow key navigation between buttons in the grid.
   * Uses the WAI-ARIA grid pattern: left/right move within a row,
   * up/down move between rows. Wraps at grid edges.
   *
   * @param {KeyboardEvent} event - The keyboard event with an arrow key.
   * @private
   */
  _handleArrowNavigation: function(event) {
    var buttons = this._getNavigableButtons();
    if (buttons.length === 0) { return; }

    var focused = document.activeElement;
    var currentIndex = -1;
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i] === focused) {
        currentIndex = i;
        break;
      }
    }

    var cols = this.get('effectiveColumns');
    var targetIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        if (currentIndex === -1) { targetIndex = 0; }
        else { targetIndex = (currentIndex + 1) % buttons.length; }
        break;
      case 'ArrowLeft':
        if (currentIndex === -1) { targetIndex = buttons.length - 1; }
        else { targetIndex = (currentIndex - 1 + buttons.length) % buttons.length; }
        break;
      case 'ArrowDown':
        if (currentIndex === -1) { targetIndex = 0; }
        else {
          targetIndex = currentIndex + cols;
          if (targetIndex >= buttons.length) {
            targetIndex = currentIndex;
          }
        }
        break;
      case 'ArrowUp':
        if (currentIndex === -1) { targetIndex = 0; }
        else {
          targetIndex = currentIndex - cols;
          if (targetIndex < 0) { targetIndex = currentIndex; }
        }
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = buttons.length - 1;
        break;
    }

    if (targetIndex !== currentIndex) {
      // Roving tabindex: previous button loses tab stop, new one gains it
      if (currentIndex >= 0 && buttons[currentIndex]) {
        buttons[currentIndex].setAttribute('tabindex', '-1');
      }
      buttons[targetIndex].setAttribute('tabindex', '0');
      buttons[targetIndex].focus();
    } else if (currentIndex === -1 && targetIndex >= 0) {
      // No button focused yet — focus the target
      buttons[targetIndex].setAttribute('tabindex', '0');
      buttons[targetIndex].focus();
    }
  },

  /**
   * Announces a zoom transition message to screen readers via the
   * aria-live region managed by zumly_manager.
   *
   * @param {string} message - The message to announce.
   * @private
   */
  _announceTransition: function(message) {
    zumlyManager.announceToScreenReader('.zumly-canvas', message);
  },

  /**
    * Action handlers for template-invoked actions.
    * The cellSelected action is fired when a grid cell in the template
    * is clicked (from zumly-canvas.hbs via {{action "cellSelected" cell}}).
    * It delegates to the click handler's logic for folder (zoom-me) buttons
    * and fires the onCellSelect closure action if provided by the parent.
    */
  actions: {
    /**
     * Handles cell selection from the template-rendered grid.
     * For folder cells (isFolder), triggers zoom-in via zumlyManager.
     * For speech cells, fires the onCellSelect closure action.
     *
     * @param {Object} cell - Cell object from gridCells computed property.
     */
    cellSelected: function(cell) {
      if (!cell || cell.isEmpty) { return; }

      // If it's a folder button, delegate to Zumly zoom-in
      if (cell.isFolder && cell.button && cell.button.load_board &&
          cell.button.load_board.id) {
        var viewName = 'board-' + cell.button.load_board.id;
        var label = cell.button.label || 'sub-board';

        this.set('_lastZoomTriggerElement', null);
        zumlyManager.zoomIn(viewName).then(function() {
          zumlyManager.focusFirstButton('.zumly-canvas');
          zumlyManager.updateAriaExpanded('.zumly-canvas', viewName);
        }.bind(this)).catch(function() {
          // Zoom-in failed — the view may not be loaded yet
        });
        this._announceTransition('Zoomed into ' + label);
        return;
      }

      // For speech/action buttons, notify parent via closure action
      if (this.get('onCellSelect')) {
        this.sendAction('onCellSelect', cell);
      }
    }
  }
});
