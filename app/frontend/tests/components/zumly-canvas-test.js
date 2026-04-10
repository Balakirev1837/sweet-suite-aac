/**
 * Tests for the zumly-canvas Ember component.
 * Validates initialization, teardown, grid rendering, ARIA attributes,
 * layout modes, and configurable grid sizes.
 */
import EmberObject from '@ember/object';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  stub,
  waitsFor,
  runs
} from 'frontend/tests/helpers/jasmine';
import zumlyManager from '../../utils/zumly_manager';
import zumlyCanvas from '../../components/zumly-canvas';

describe('zumly-canvas', function() {
  var component = null;
  var teardownCalled = false;
  var initCalled = false;
  var initArgs = null;

  // Create a minimal board mock matching the expected interface
  function mockBoard(opts) {
    var rows = (opts && opts.rows) || 2;
    var cols = (opts && opts.cols) || 4;
    var buttons = (opts && opts.buttons) || [
      { id: 'btn1', label: 'Hello' },
      { id: 'btn2', label: 'World' }
    ];
    var order = (opts && opts.order) || [['btn1', 'btn2', null, null], [null, null, null, null]];
    return EmberObject.create({
      id: (opts && opts.id) || 'board-1',
      grid: {
        rows: rows,
        columns: cols,
        order: order
      },
      buttons: buttons
    });
  }

  beforeEach(function() {
    teardownCalled = false;
    initCalled = false;
    initArgs = null;

    // Stub zumlyManager methods to avoid real Zumly initialization
    stub(zumlyManager, 'teardown', function() {
      teardownCalled = true;
      zumlyManager.set('instance', null);
    });
    stub(zumlyManager, 'init', function(selector, options) {
      initCalled = true;
      initArgs = { selector: selector, options: options };
      return Promise.resolve({ fake: true });
    });

    component = this.subject();
  });

  afterEach(function() {
    // Clean up stubs
    if (stub.stubs && stub.stubs.length > 0) {
      while (stub.stubs.length > 0) {
        var entry = stub.stubs.pop();
        entry[0][entry[1]] = entry[2];
      }
    }
  });

  // --- Basic component structure ---

  it('should render as a div with zumly-canvas class', function() {
    expect(component.tagName).toEqual('div');
    expect(component.classNames.indexOf('zumly-canvas')).toBeGreaterThan(-1);
  });

  it('should have role="grid" for accessibility', function() {
    expect(component.get('role')).toEqual('grid');
  });

  it('should have an aria-label', function() {
    expect(component.get('ariaLabel')).toEqual('Zumly zoom navigation canvas');
  });

  it('should be focusable via tabindex', function() {
    expect(component.get('tabindex')).toEqual(0);
  });

  // --- Default values ---

  it('should default to grid layout mode', function() {
    expect(component.get('layoutMode')).toEqual('grid');
  });

  it('should default gridRows to null (no override)', function() {
    expect(component.get('gridRows')).toEqual(null);
  });

  it('should default gridColumns to null (no override)', function() {
    expect(component.get('gridColumns')).toEqual(null);
  });

  // --- Effective rows/columns computed properties ---

  it('should use board grid.rows when gridRows override is not set', function() {
    component.set('board', mockBoard({ rows: 6 }));
    expect(component.get('effectiveRows')).toEqual(6);
  });

  it('should use gridRows override when provided', function() {
    component.set('board', mockBoard({ rows: 6 }));
    component.set('gridRows', 3);
    expect(component.get('effectiveRows')).toEqual(3);
  });

  it('should use board grid.columns when gridColumns override is not set', function() {
    component.set('board', mockBoard({ cols: 8 }));
    expect(component.get('effectiveColumns')).toEqual(8);
  });

  it('should use gridColumns override when provided', function() {
    component.set('board', mockBoard({ cols: 8 }));
    component.set('gridColumns', 4);
    expect(component.get('effectiveColumns')).toEqual(4);
  });

  it('should default to 2 rows when no board is set', function() {
    expect(component.get('effectiveRows')).toEqual(2);
  });

  it('should default to 4 columns when no board is set', function() {
    expect(component.get('effectiveColumns')).toEqual(4);
  });

  // --- isGridLayout computed property ---

  it('should identify grid layout mode', function() {
    component.set('layoutMode', 'grid');
    expect(component.get('isGridLayout')).toEqual(true);
  });

  it('should identify non-grid (freeform) layout mode', function() {
    component.set('layoutMode', 'freeform');
    expect(component.get('isGridLayout')).toEqual(false);
  });

  // --- gridCells computed property ---

  it('should return empty array when no board is set', function() {
    expect(component.get('gridCells')).toEqual([]);
  });

  it('should generate the correct number of grid cells', function() {
    var board = mockBoard({ rows: 2, cols: 3, order: [['a', 'b', 'c'], ['d', 'e', 'f']], buttons: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
      { id: 'd', label: 'D' },
      { id: 'e', label: 'E' },
      { id: 'f', label: 'F' }
    ]});
    component.set('board', board);
    var cells = component.get('gridCells');
    expect(cells.length).toEqual(6);
  });

  it('should mark cells without a matching button as empty', function() {
    var board = mockBoard({ rows: 1, cols: 2, order: [['btn1', null]], buttons: [
      { id: 'btn1', label: 'Hello' }
    ]});
    component.set('board', board);
    var cells = component.get('gridCells');
    expect(cells.length).toEqual(2);
    expect(cells[0].isEmpty).toEqual(false);
    expect(cells[0].button.label).toEqual('Hello');
    expect(cells[1].isEmpty).toEqual(true);
    expect(cells[1].button).toEqual(null);
  });

  // --- gridStyle computed property ---

  it('should generate CSS grid style based on effective dimensions', function() {
    component.set('board', mockBoard({ rows: 3, cols: 5 }));
    var style = component.get('gridStyle').toString();
    expect(style).toMatch(/grid-template-rows: repeat\(3, 1fr\)/);
    expect(style).toMatch(/grid-template-columns: repeat\(5, 1fr\)/);
  });

  // --- Lifecycle ---

  it('should call zumlyManager.teardown on willDestroyElement', function() {
    component.willDestroyElement();
    expect(teardownCalled).toEqual(true);
  });

  it('should call zumlyManager.init when board is set and didInsertElement fires', function() {
    component.set('board', mockBoard());
    component.didInsertElement();
    expect(initCalled).toEqual(true);
  });

  it('should not call zumlyManager.init when no board is set on didInsertElement', function() {
    component.didInsertElement();
    expect(initCalled).toEqual(false);
  });

  it('should pass the correct selector and initial view to zumlyManager.init', function() {
    component.set('board', mockBoard());
    component.didInsertElement();
    expect(initArgs.selector).toEqual('.zumly-canvas');
    expect(initArgs.options.initialView).toEqual('board');
  });

  // --- HTML generation ---

  describe('buildInitialViewHTML', function() {
    it('should produce grid HTML with ARIA roles in grid mode', function() {
      var board = mockBoard({
        rows: 1, cols: 2,
        order: [['btn1', 'btn2']],
        buttons: [
          { id: 'btn1', label: 'Hello' },
          { id: 'btn2', label: 'World' }
        ]
      });
      component.set('board', board);
      component.set('layoutMode', 'grid');
      var html = component.buildInitialViewHTML();
      expect(html).toMatch(/role="grid"/);
      expect(html).toMatch(/role="gridcell"/);
      expect(html).toMatch(/Hello/);
      expect(html).toMatch(/World/);
    });

    it('should produce freeform HTML in freeform mode', function() {
      var board = mockBoard({
        rows: 1, cols: 2,
        order: [['btn1', 'btn2']],
        buttons: [
          { id: 'btn1', label: 'Hello' },
          { id: 'btn2', label: 'World' }
        ]
      });
      component.set('board', board);
      component.set('layoutMode', 'freeform');
      var html = component.buildInitialViewHTML();
      expect(html).toMatch(/freeform/);
      expect(html).toMatch(/Hello/);
      expect(html).toMatch(/World/);
    });

    it('should include data-row and data-col attributes on grid cells', function() {
      var board = mockBoard({
        rows: 1, cols: 1,
        order: [['btn1']],
        buttons: [{ id: 'btn1', label: 'Test' }]
      });
      component.set('board', board);
      component.set('layoutMode', 'grid');
      var html = component.buildInitialViewHTML();
      expect(html).toMatch(/data-row="0"/);
      expect(html).toMatch(/data-col="0"/);
    });
  });

  // --- _buildButtonHTML ---

  describe('_buildButtonHTML', function() {
    it('should include label text', function() {
      var html = component._buildButtonHTML({ label: 'Speak' });
      expect(html).toMatch(/Speak/);
      expect(html).toMatch(/z-view-button-label/);
    });

    it('should include image when image_url is present', function() {
      var html = component._buildButtonHTML({ label: 'Go', image_url: 'http://example.com/img.png' });
      expect(html).toMatch(/<img/);
      expect(html).toMatch(/example\.com\/img\.png/);
    });

    it('should include background color style when present', function() {
      var html = component._buildButtonHTML({ label: 'X', background_color: '#ff0000' });
      expect(html).toMatch(/background-color: #ff0000/);
    });

    it('should produce valid HTML even with minimal button data', function() {
      var html = component._buildButtonHTML({ label: 'Minimal' });
      expect(html).toMatch(/z-view-button/);
      expect(html).toMatch(/Minimal/);
    });
  });
});
