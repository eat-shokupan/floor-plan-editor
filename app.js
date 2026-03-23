// constants.js - グリッドサイズ、色、デフォルト値
window.FPE = window.FPE || {};

FPE.CONST = {
  // グリッド
  GRID_PX: 60,               // 1グリッドあたりの基本ピクセル数
  GRID_MM: 910,              // 1グリッド = 910mm（尺モジュール）
  SNAP_DIVISION: 4,          // 1/4グリッドスナップ
  TATAMI_DIVISOR: 2,         // 帖数 = (W*H) / 2

  // ズーム
  ZOOM_MIN: 0.2,
  ZOOM_MAX: 5.0,
  ZOOM_STEP: 0.1,

  // 色
  COLOR_GRID_MAJOR: '#ccc',
  COLOR_GRID_MINOR: '#eee',
  COLOR_BACKGROUND: '#f9f9f9',
  COLOR_SELECTION: '#2196F3',
  COLOR_HANDLE: '#1976D2',
  COLOR_PREVIEW: 'rgba(33,150,243,0.3)',
  COLOR_BOUNDARY: '#4CAF50',
  COLOR_WALL_EXT: '#333',
  COLOR_WALL_INT: '#666',
  COLOR_STAIRS: '#9E9E9E',

  // 階段タイプ
  STAIR_TYPES: [
    { value: 'straight', label: '直線' },
    { value: 'L', label: 'L字' },
    { value: 'U', label: 'U字' },
  ],

  // 壁の厚み（グリッド単位）
  WALL_EXT_THICK: 0.15,
  WALL_INT_THICK: 0.08,

  // ハンドル
  HANDLE_SIZE: 8,

  // 部屋プリセット
  ROOM_PRESETS: [
    { name: 'LDK',      color: '#E8D4B8', width: 4, height: 3 },
    { name: 'リビング',   color: '#E8D4B8', width: 3, height: 3 },
    { name: '和室',      color: '#C8E6C9', width: 3, height: 3 },
    { name: '洋室',      color: '#BBDEFB', width: 3, height: 2.5 },
    { name: 'キッチン',   color: '#FFF9C4', width: 2, height: 2 },
    { name: '浴室',      color: '#B3E5FC', width: 1.5, height: 1.5 },
    { name: 'トイレ',    color: '#F3E5F5', width: 1, height: 1 },
    { name: '玄関',      color: '#D7CCC8', width: 2, height: 1.5 },
    { name: '廊下',      color: '#EFEBE9', width: 1, height: 3 },
    { name: 'クローゼット', color: '#F5F5F5', width: 1, height: 1.5 },
    { name: '洗面所',    color: '#E0F7FA', width: 1.5, height: 1.5 },
    { name: '階段',      color: '#E0E0E0', width: 1, height: 2 },
  ],

  // デフォルト部屋
  DEFAULT_ROOM_COLOR: '#E8D4B8',
  DEFAULT_ROOM_NAME: '部屋',
};
// snap.js - グリッドスナップユーティリティ
window.FPE = window.FPE || {};

FPE.Snap = {
  /** グリッド座標を1/4グリッドにスナップ */
  toGrid(value) {
    const div = FPE.CONST.SNAP_DIVISION;
    return Math.round(value * div) / div;
  },

  /** {x,y} をスナップ */
  point(x, y) {
    return { x: this.toGrid(x), y: this.toGrid(y) };
  },

  /** サイズを最小値以上にスナップ（最小0.5グリッド） */
  size(value, min) {
    min = min || 0.5;
    const snapped = this.toGrid(value);
    return Math.max(min, snapped);
  },
};
// data-model.js - データモデル＋イベントシステム
window.FPE = window.FPE || {};

FPE.DataModel = (function () {
  var data = null;
  var listeners = {};

  function createEmpty() {
    data = {
      version: 1,
      metadata: {
        projectName: '我が家',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      floors: {
        '1F': { rooms: [], stairs: [], walls: [] },
        '2F': { rooms: [], stairs: [], walls: [] },
      },
      siteBoundary: { vertices: [] },
    };
    emit('data-loaded');
    return data;
  }

  function getData() { return data; }

  function setData(d) {
    data = d;
    emit('data-loaded');
  }

  function currentFloorId() {
    return FPE.FloorManager ? FPE.FloorManager.currentFloor() : '1F';
  }

  function currentFloor() {
    return data.floors[currentFloorId()];
  }

  function getRooms() { return currentFloor().rooms; }
  function getStairs() { return currentFloor().stairs; }
  function getWalls() { return currentFloor().walls; }

  // --- 部屋 CRUD ---
  var roomCounter = 0;

  function addRoom(room) {
    if (!room.id) {
      roomCounter++;
      room.id = 'room-' + String(roomCounter).padStart(3, '0');
    }
    currentFloor().rooms.push(room);
    touch();
    emit('room-added', room);
    return room;
  }

  function updateRoom(id, changes) {
    var room = findRoom(id);
    if (!room) return null;
    Object.assign(room, changes);
    touch();
    emit('room-updated', room);
    return room;
  }

  function removeRoom(id) {
    var floor = currentFloor();
    var idx = floor.rooms.findIndex(function (r) { return r.id === id; });
    if (idx >= 0) {
      var removed = floor.rooms.splice(idx, 1)[0];
      touch();
      emit('room-removed', removed);
      return removed;
    }
    return null;
  }

  function findRoom(id) {
    return currentFloor().rooms.find(function (r) { return r.id === id; });
  }

  // --- 階段 CRUD ---
  var stairsCounter = 0;

  function addStairs(s) {
    if (!s.id) {
      stairsCounter++;
      s.id = 'stairs-' + String(stairsCounter).padStart(3, '0');
    }
    currentFloor().stairs.push(s);
    touch();
    emit('stairs-added', s);
    return s;
  }

  function updateStairs(id, changes) {
    var s = findStairs(id);
    if (!s) return null;
    Object.assign(s, changes);
    touch();
    emit('stairs-updated', s);
    return s;
  }

  function removeStairs(id) {
    var floor = currentFloor();
    var idx = floor.stairs.findIndex(function (s) { return s.id === id; });
    if (idx >= 0) {
      var removed = floor.stairs.splice(idx, 1)[0];
      touch();
      emit('stairs-removed', removed);
      return removed;
    }
    return null;
  }

  function findStairs(id) {
    return currentFloor().stairs.find(function (s) { return s.id === id; });
  }

  // --- 壁 CRUD ---
  var wallCounter = 0;

  function setWalls(walls) {
    currentFloor().walls = walls;
    touch();
    emit('walls-updated');
  }

  function addWall(w) {
    if (!w.id) {
      wallCounter++;
      w.id = 'wall-' + String(wallCounter).padStart(3, '0');
    }
    currentFloor().walls.push(w);
    touch();
    return w;
  }

  function findWall(id) {
    return currentFloor().walls.find(function (w) { return w.id === id; });
  }

  // --- 敷地境界 ---
  function setSiteBoundary(vertices) {
    data.siteBoundary.vertices = vertices;
    touch();
    emit('boundary-updated');
  }

  function getSiteBoundary() {
    return data.siteBoundary;
  }

  // --- イベントシステム ---
  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (f) { return f !== fn; });
  }

  function emit(event, payload) {
    if (!listeners[event]) return;
    listeners[event].forEach(function (fn) { fn(payload); });
  }

  function touch() {
    if (data && data.metadata) {
      data.metadata.updatedAt = new Date().toISOString();
    }
  }

  /** 全フロアからIDの最大値を取得してカウンタを合わせる */
  function syncCounters() {
    roomCounter = 0;
    stairsCounter = 0;
    wallCounter = 0;
    Object.keys(data.floors).forEach(function (fid) {
      var fl = data.floors[fid];
      fl.rooms.forEach(function (r) {
        var n = parseInt(r.id.replace('room-', ''), 10);
        if (n > roomCounter) roomCounter = n;
      });
      fl.stairs.forEach(function (s) {
        var n = parseInt(s.id.replace('stairs-', ''), 10);
        if (n > stairsCounter) stairsCounter = n;
      });
      fl.walls.forEach(function (w) {
        var n = parseInt(w.id.replace('wall-', ''), 10);
        if (n > wallCounter) wallCounter = n;
      });
    });
  }

  return {
    createEmpty: createEmpty,
    getData: getData,
    setData: setData,
    currentFloorId: currentFloorId,
    currentFloor: currentFloor,
    getRooms: getRooms,
    getStairs: getStairs,
    getWalls: getWalls,
    addRoom: addRoom,
    updateRoom: updateRoom,
    removeRoom: removeRoom,
    findRoom: findRoom,
    addStairs: addStairs,
    updateStairs: updateStairs,
    removeStairs: removeStairs,
    findStairs: findStairs,
    setWalls: setWalls,
    addWall: addWall,
    findWall: findWall,
    setSiteBoundary: setSiteBoundary,
    getSiteBoundary: getSiteBoundary,
    on: on,
    off: off,
    emit: emit,
    syncCounters: syncCounters,
  };
})();
// viewport.js - ズーム/パン/座標変換
window.FPE = window.FPE || {};

FPE.Viewport = (function () {
  let zoom = 1.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panStartPanX = 0;
  let panStartPanY = 0;
  let spaceDown = false;
  let svg = null;

  function init(svgEl) {
    svg = svgEl;
    updateTransform();

    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function updateTransform() {
    const content = document.getElementById('svg-content');
    if (content) {
      content.setAttribute('transform',
        'translate(' + panX + ',' + panY + ') scale(' + zoom + ')');
    }
    // ステータスバー更新
    const zoomLabel = document.getElementById('zoom-label');
    if (zoomLabel) {
      zoomLabel.textContent = Math.round(zoom * 100) + '%';
    }
  }

  function onWheel(e) {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+ホイール → ズーム（マウス位置中心）
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const oldZoom = zoom;
      const delta = e.deltaY > 0 ? -FPE.CONST.ZOOM_STEP : FPE.CONST.ZOOM_STEP;
      zoom = Math.max(FPE.CONST.ZOOM_MIN, Math.min(FPE.CONST.ZOOM_MAX, zoom + delta * zoom));

      panX = mx - (mx - panX) * (zoom / oldZoom);
      panY = my - (my - panY) * (zoom / oldZoom);
    } else if (e.shiftKey) {
      // Shift+ホイール → 左右スクロール
      panX -= e.deltaY;
    } else {
      // 通常ホイール → スクロール（パン）
      panX -= e.deltaX;
      panY -= e.deltaY;
    }

    updateTransform();
  }

  function onMouseDown(e) {
    // 中ボタン or Space+左ボタン
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      panStartPanX = panX;
      panStartPanY = panY;
      e.preventDefault();
    }
  }

  function onMouseMove(e) {
    if (isPanning) {
      panX = panStartPanX + (e.clientX - panStartX);
      panY = panStartPanY + (e.clientY - panStartY);
      updateTransform();
    }
    // カーソル位置をグリッド座標で表示
    if (svg) {
      var pos = screenToGrid(e.clientX, e.clientY);
      var cursorLabel = document.getElementById('cursor-pos');
      if (cursorLabel) {
        cursorLabel.textContent = '(' + pos.x.toFixed(1) + ', ' + pos.y.toFixed(1) + ')';
      }
    }
  }

  function onMouseUp(e) {
    if (e.button === 1 || e.button === 0) {
      isPanning = false;
    }
  }

  function onKeyDown(e) {
    if (e.code === 'Space' && !e.repeat) {
      spaceDown = true;
      if (svg) svg.style.cursor = 'grab';
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      spaceDown = false;
      if (svg && !isPanning) {
        svg.style.cursor = '';
        if (FPE.ToolManager) FPE.ToolManager.updateCursor();
      }
    }
  }

  /** スクリーン座標→グリッド座標 */
  function screenToGrid(clientX, clientY) {
    var rect = svg.getBoundingClientRect();
    var sx = clientX - rect.left;
    var sy = clientY - rect.top;
    return {
      x: (sx - panX) / zoom / FPE.CONST.GRID_PX,
      y: (sy - panY) / zoom / FPE.CONST.GRID_PX,
    };
  }

  /** グリッド座標→SVGピクセル座標 */
  function gridToPixel(gx, gy) {
    return {
      x: gx * FPE.CONST.GRID_PX,
      y: gy * FPE.CONST.GRID_PX,
    };
  }

  function setZoom(z) {
    var rect = svg.getBoundingClientRect();
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    var oldZoom = zoom;
    zoom = Math.max(FPE.CONST.ZOOM_MIN, Math.min(FPE.CONST.ZOOM_MAX, z));
    panX = cx - (cx - panX) * (zoom / oldZoom);
    panY = cy - (cy - panY) * (zoom / oldZoom);
    updateTransform();
  }

  function getZoom() { return zoom; }
  function getPan() { return { x: panX, y: panY }; }
  function isSpaceDown() { return spaceDown; }
  function getIsPanning() { return isPanning; }

  function setPan(x, y) {
    panX = x;
    panY = y;
    updateTransform();
  }

  return {
    init: init,
    screenToGrid: screenToGrid,
    gridToPixel: gridToPixel,
    setZoom: setZoom,
    getZoom: getZoom,
    getPan: getPan,
    setPan: setPan,
    isSpaceDown: isSpaceDown,
    getIsPanning: getIsPanning,
    updateTransform: updateTransform,
  };
})();
// grid-renderer.js - SVGグリッド描画
window.FPE = window.FPE || {};

FPE.GridRenderer = (function () {
  var layerGrid = null;
  var gridRange = { cols: 30, rows: 20 };

  function init() {
    layerGrid = document.getElementById('layer-grid');
    render();
  }

  function render() {
    if (!layerGrid) return;
    layerGrid.innerHTML = '';

    var G = FPE.CONST.GRID_PX;
    var cols = gridRange.cols;
    var rows = gridRange.rows;
    var startX = -5;
    var startY = -5;
    var endX = cols + 5;
    var endY = rows + 5;
    var div = FPE.CONST.SNAP_DIVISION;

    // 背景
    var bg = createSVG('rect', {
      x: startX * G, y: startY * G,
      width: (endX - startX) * G,
      height: (endY - startY) * G,
      fill: FPE.CONST.COLOR_BACKGROUND,
    });
    layerGrid.appendChild(bg);

    // 1/4グリッド（薄い線）
    for (var i = startX * div; i <= endX * div; i++) {
      if (i % div === 0) continue; // 主線はスキップ
      var x = (i / div) * G;
      layerGrid.appendChild(createSVG('line', {
        x1: x, y1: startY * G, x2: x, y2: endY * G,
        stroke: FPE.CONST.COLOR_GRID_MINOR, 'stroke-width': 0.5,
      }));
    }
    for (var j = startY * div; j <= endY * div; j++) {
      if (j % div === 0) continue;
      var y = (j / div) * G;
      layerGrid.appendChild(createSVG('line', {
        x1: startX * G, y1: y, x2: endX * G, y2: y,
        stroke: FPE.CONST.COLOR_GRID_MINOR, 'stroke-width': 0.5,
      }));
    }

    // 1グリッド主線
    for (var i = startX; i <= endX; i++) {
      var x = i * G;
      layerGrid.appendChild(createSVG('line', {
        x1: x, y1: startY * G, x2: x, y2: endY * G,
        stroke: FPE.CONST.COLOR_GRID_MAJOR, 'stroke-width': 1,
      }));
    }
    for (var j = startY; j <= endY; j++) {
      var y = j * G;
      layerGrid.appendChild(createSVG('line', {
        x1: startX * G, y1: y, x2: endX * G, y2: y,
        stroke: FPE.CONST.COLOR_GRID_MAJOR, 'stroke-width': 1,
      }));
    }

    // 原点マーク
    layerGrid.appendChild(createSVG('circle', {
      cx: 0, cy: 0, r: 3,
      fill: '#F44336', 'fill-opacity': 0.5,
    }));
  }

  function createSVG(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) {
      el.setAttribute(k, attrs[k]);
    }
    return el;
  }

  return {
    init: init,
    render: render,
    createSVG: createSVG,
  };
})();
// tool-manager.js - ツール状態管理
window.FPE = window.FPE || {};

FPE.ToolManager = (function () {
  var currentTool = 'select';
  var subMode = null; // 'window' or 'door' for opening tool

  var tools = {
    select:   { cursor: 'default',   label: '選択' },
    room:     { cursor: 'crosshair', label: '部屋追加' },
    stairs:   { cursor: 'crosshair', label: '階段' },
    boundary: { cursor: 'crosshair', label: '敷地' },
    wall:     { cursor: 'pointer',   label: '壁編集' },
    opening:  { cursor: 'pointer',   label: '窓/ドア' },
  };

  function setTool(name) {
    if (!tools[name]) return;
    currentTool = name;
    subMode = null;
    updateCursor();
    updateToolButtons();
    updateLayerPassthrough();
    FPE.DataModel.emit('tool-changed', name);
  }

  function getTool() { return currentTool; }

  function setSubMode(mode) { subMode = mode; }
  function getSubMode() { return subMode; }

  function updateCursor() {
    var svg = document.getElementById('main-svg');
    if (svg) {
      svg.style.cursor = tools[currentTool].cursor;
    }
  }

  function updateToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tool === currentTool);
    });
  }

  /** openingツール時は部屋・階段・ラベルレイヤーのクリックを透過させ壁をクリック可能にする */
  function updateLayerPassthrough() {
    var passthrough = currentTool === 'opening';
    var ids = ['layer-rooms', 'layer-stairs', 'layer-labels'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.pointerEvents = passthrough ? 'none' : '';
    });
  }

  return {
    setTool: setTool,
    getTool: getTool,
    setSubMode: setSubMode,
    getSubMode: getSubMode,
    updateCursor: updateCursor,
    updateToolButtons: updateToolButtons,
    tools: tools,
  };
})();
// selection-manager.js - 選択状態＋プロパティパネル更新（複数選択対応）
window.FPE = window.FPE || {};

FPE.SelectionManager = (function () {
  var selectedIds = [];
  var typeMap = {}; // { 'room-001': 'room', 'stairs-001': 'stairs' }
  var handles = [];

  // --- 単一選択（従来互換: 配列リセット+1個追加） ---
  function select(id, type) {
    selectedIds = [id];
    typeMap = {};
    typeMap[id] = type || 'room';
    renderHandles();
    updatePropertyPanel();
    FPE.DataModel.emit('selection-changed', { id: id, type: typeMap[id] });
  }

  // --- Ctrl+Click 用トグル追加/除外 ---
  function addToSelection(id, type) {
    var idx = selectedIds.indexOf(id);
    if (idx >= 0) {
      // 既に選択中 → 除外
      selectedIds.splice(idx, 1);
      delete typeMap[id];
    } else {
      // 追加
      selectedIds.push(id);
      typeMap[id] = type || 'room';
    }
    renderHandles();
    updatePropertyPanel();
    FPE.DataModel.emit('selection-changed', selectedIds.length === 1
      ? { id: selectedIds[0], type: typeMap[selectedIds[0]] }
      : { ids: selectedIds.slice(), typeMap: Object.assign({}, typeMap) });
  }

  // --- 矩形選択用: 一括設定 ---
  function selectMultiple(items) {
    selectedIds = [];
    typeMap = {};
    items.forEach(function (item) {
      if (selectedIds.indexOf(item.id) < 0) {
        selectedIds.push(item.id);
        typeMap[item.id] = item.type || 'room';
      }
    });
    renderHandles();
    updatePropertyPanel();
    FPE.DataModel.emit('selection-changed', selectedIds.length === 1
      ? { id: selectedIds[0], type: typeMap[selectedIds[0]] }
      : { ids: selectedIds.slice(), typeMap: Object.assign({}, typeMap) });
  }

  function deselect() {
    selectedIds = [];
    typeMap = {};
    clearHandles();
    updatePropertyPanel();
    FPE.DataModel.emit('selection-changed', null);
  }

  // --- 互換性API（単一選択時のみ値を返す） ---
  function getSelectedId() {
    return selectedIds.length === 1 ? selectedIds[0] : null;
  }
  function getSelectedType() {
    return selectedIds.length === 1 ? typeMap[selectedIds[0]] : null;
  }

  // --- 複数選択API ---
  function getSelectedIds() { return selectedIds.slice(); }
  function getSelectedTypes() { return Object.assign({}, typeMap); }
  function isSelected(id) { return selectedIds.indexOf(id) >= 0; }
  function getSelectedCount() { return selectedIds.length; }

  // --- ハンドル描画: 単一 room 選択時、各パーツごとに表示 ---
  function renderHandles() {
    clearHandles();
    if (selectedIds.length !== 1) return;
    var id = selectedIds[0];
    if (typeMap[id] !== 'room') return;
    var room = FPE.DataModel.findRoom(id);
    if (!room) return;

    var layer = document.getElementById('layer-handles');
    var G = FPE.CONST.GRID_PX;
    var hs = FPE.CONST.HANDLE_SIZE;

    room.parts.forEach(function (part, partIndex) {
      var px = part.x * G;
      var py = part.y * G;
      var pw = part.width * G;
      var ph = part.height * G;

      var positions = [
        { cx: px,        cy: py,        cursor: 'nw-resize', dir: 'nw' },
        { cx: px + pw/2, cy: py,        cursor: 'n-resize',  dir: 'n'  },
        { cx: px + pw,   cy: py,        cursor: 'ne-resize', dir: 'ne' },
        { cx: px,        cy: py + ph/2, cursor: 'w-resize',  dir: 'w'  },
        { cx: px + pw,   cy: py + ph/2, cursor: 'e-resize',  dir: 'e'  },
        { cx: px,        cy: py + ph,   cursor: 'sw-resize', dir: 'sw' },
        { cx: px + pw/2, cy: py + ph,   cursor: 's-resize',  dir: 's'  },
        { cx: px + pw,   cy: py + ph,   cursor: 'se-resize', dir: 'se' },
      ];

      positions.forEach(function (p) {
        var rect = FPE.GridRenderer.createSVG('rect', {
          x: p.cx - hs/2, y: p.cy - hs/2,
          width: hs, height: hs,
          fill: '#fff', stroke: FPE.CONST.COLOR_HANDLE, 'stroke-width': 2,
          cursor: p.cursor,
          'data-handle': p.dir,
          'data-room-id': id,
          'data-part-index': partIndex,
        });
        rect.classList.add('resize-handle');
        layer.appendChild(rect);
        handles.push(rect);
      });
    });
  }

  function clearHandles() {
    var layer = document.getElementById('layer-handles');
    if (layer) layer.innerHTML = '';
    handles = [];
  }

  function getRoomBounds(room) {
    if (!room.parts || room.parts.length === 0) {
      return { x: 0, y: 0, width: 1, height: 1 };
    }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    room.parts.forEach(function (p) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + p.width > maxX) maxX = p.x + p.width;
      if (p.y + p.height > maxY) maxY = p.y + p.height;
    });
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  // --- プロパティパネル ---
  function updatePropertyPanel() {
    var panel = document.getElementById('property-panel-content');
    if (!panel) return;

    // 選択なし
    if (selectedIds.length === 0) {
      panel.innerHTML = '<p class="hint">部屋を選択してください</p>';
      return;
    }

    // 複数選択
    if (selectedIds.length > 1) {
      renderMultiSelectPanel(panel);
      return;
    }

    // 単一選択
    var id = selectedIds[0];
    var type = typeMap[id];

    if (type === 'stairs') {
      renderStairsPanel(panel, id);
      return;
    }

    if (type !== 'room') {
      panel.innerHTML = '<p class="hint">部屋を選択してください</p>';
      return;
    }

    var room = FPE.DataModel.findRoom(id);
    if (!room) {
      panel.innerHTML = '<p class="hint">部屋を選択してください</p>';
      return;
    }

    renderSingleRoomPanel(panel, room, id);
  }

  // --- 単一部屋パネル（従来通り） ---
  function renderSingleRoomPanel(panel, room, id) {
    var bounds = getRoomBounds(room);
    var tatami = calcTatami(room);
    var MM = FPE.CONST.GRID_MM;
    var totalW_mm = Math.round(bounds.width * MM);
    var totalH_mm = Math.round(bounds.height * MM);

    var html =
      '<div class="prop-group">' +
        '<label>名前</label>' +
        '<input type="text" id="prop-name" value="' + escHtml(room.name) + '">' +
      '</div>' +
      '<div class="prop-group">' +
        '<label>色</label>' +
        '<input type="color" id="prop-color" value="' + room.color + '">' +
      '</div>' +
      '<div class="prop-group">' +
        '<label>全体サイズ</label>' +
        '<span>' + bounds.width.toFixed(1) + ' × ' + bounds.height.toFixed(1) + ' マス</span><br>' +
        '<span class="mm-value">' + totalW_mm + ' × ' + totalH_mm + ' mm</span>' +
      '</div>' +
      '<div class="prop-group">' +
        '<label>帖数</label>' +
        '<span class="tatami-value">' + tatami.toFixed(1) + ' 帖</span>' +
      '</div>';

    if (room.parts.length > 0) {
      html += '<div class="prop-group"><label>パーツ寸法</label>';
      room.parts.forEach(function (p, i) {
        var pw_mm = Math.round(p.width * MM);
        var ph_mm = Math.round(p.height * MM);
        var pTatami = (p.width * p.height) / FPE.CONST.TATAMI_DIVISOR;
        html += '<div class="part-info">' +
          '<span class="part-label">Part ' + (i + 1) + ':</span> ' +
          p.width.toFixed(1) + '×' + p.height.toFixed(1) +
          ' <span class="mm-value">(' + pw_mm + '×' + ph_mm + 'mm)</span>' +
          ' <span class="part-tatami">' + pTatami.toFixed(1) + '帖</span>';
        if (room.parts.length > 1) {
          html += ' <button class="btn-delete-part small-btn danger" data-part-index="' + i + '" style="padding:0 4px;font-size:11px;min-width:auto;margin-left:4px;">×</button>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    html +=
      '<div class="prop-group">' +
        '<button id="btn-add-part" class="small-btn">パーツ追加</button>' +
        '<button id="btn-delete-room" class="small-btn danger">削除</button>' +
      '</div>';

    panel.innerHTML = html;

    document.getElementById('prop-name').addEventListener('change', function (e) {
      FPE.DataModel.updateRoom(id, { name: e.target.value });
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
      FPE.RoomManager.render();
    });
    document.getElementById('prop-color').addEventListener('input', function (e) {
      FPE.DataModel.updateRoom(id, { color: e.target.value });
      FPE.RoomManager.render();
    });
    document.getElementById('prop-color').addEventListener('change', function () {
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
    });
    document.getElementById('btn-delete-room').addEventListener('click', function () {
      FPE.DataModel.removeRoom(id);
      deselect();
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
      FPE.RoomManager.render();
      if (FPE.WallManager) FPE.WallManager.generateWalls();
    });
    document.getElementById('btn-add-part').addEventListener('click', function () {
      if (FPE.RoomManager) FPE.RoomManager.startAddPart(id);
    });

    // パーツ削除ボタン
    var deleteBtns = panel.querySelectorAll('.btn-delete-part');
    deleteBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var partIdx = parseInt(btn.dataset.partIndex);
        var currentRoom = FPE.DataModel.findRoom(id);
        if (!currentRoom || currentRoom.parts.length <= 1) return;
        currentRoom.parts.splice(partIdx, 1);
        FPE.DataModel.updateRoom(id, { parts: currentRoom.parts });
        FPE.RoomManager.render();
        renderHandles();
        updatePropertyPanel();
        if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
        if (FPE.WallManager) FPE.WallManager.generateWalls();
      });
    });
  }

  // --- 階段パネル（単一選択） ---
  function renderStairsPanel(panel, id) {
    var s = FPE.DataModel.findStairs(id);
    if (!s) {
      panel.innerHTML = '<p class="hint">部屋を選択してください</p>';
      return;
    }

    var stairType = s.stairType || 'straight';
    var rotation = s.rotation || 0;
    var types = FPE.CONST.STAIR_TYPES;

    // タイプ選択
    var typeOptions = '';
    types.forEach(function (t) {
      typeOptions += '<option value="' + t.value + '"' +
        (t.value === stairType ? ' selected' : '') + '>' + t.label + '</option>';
    });

    var html =
      '<div class="prop-group">' +
        '<label>種類</label>' +
        '<select id="prop-stair-type" class="prop-select">' + typeOptions + '</select>' +
      '</div>' +
      '<div class="prop-group">' +
        '<label>回転</label>' +
        '<div class="prop-row">' +
          '<button id="btn-rotate-stairs" class="small-btn">↻ 90°回転</button>' +
          '<span id="rotation-display" class="rotation-display">' + rotation + '°</span>' +
        '</div>' +
      '</div>' +
      '<div class="prop-group">' +
        '<label>方向</label>' +
        '<button id="btn-toggle-dir" class="small-btn">' +
          (s.direction === 'up' ? '上り → 下りに切替' : '下り → 上りに切替') +
        '</button>' +
      '</div>' +
      '<div class="prop-group">' +
        '<button id="btn-delete-stairs" class="small-btn danger">削除</button>' +
      '</div>';
    panel.innerHTML = html;

    // タイプ変更
    document.getElementById('prop-stair-type').addEventListener('change', function (e) {
      FPE.DataModel.updateStairs(id, { stairType: e.target.value });
      FPE.StairsManager.render();
      renderHandles();
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
      updatePropertyPanel();
    });

    // 回転
    document.getElementById('btn-rotate-stairs').addEventListener('click', function () {
      var current = FPE.DataModel.findStairs(id);
      var newRotation = ((current.rotation || 0) + 90) % 360;
      FPE.DataModel.updateStairs(id, { rotation: newRotation });
      FPE.StairsManager.render();
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
      updatePropertyPanel();
    });

    // 方向トグル
    document.getElementById('btn-toggle-dir').addEventListener('click', function () {
      var current = FPE.DataModel.findStairs(id);
      var newDir = current.direction === 'up' ? 'down' : 'up';
      FPE.DataModel.updateStairs(id, { direction: newDir });
      FPE.StairsManager.render();
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
      updatePropertyPanel();
    });

    // 削除
    document.getElementById('btn-delete-stairs').addEventListener('click', function () {
      FPE.DataModel.removeStairs(id);
      deselect();
      FPE.StairsManager.render();
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
    });
  }

  // --- 複数選択パネル ---
  function renderMultiSelectPanel(panel) {
    var count = selectedIds.length;
    var roomCount = 0;
    var stairsCount = 0;
    var totalTatami = 0;

    selectedIds.forEach(function (id) {
      var type = typeMap[id];
      if (type === 'room') {
        roomCount++;
        var room = FPE.DataModel.findRoom(id);
        if (room) totalTatami += calcTatami(room);
      } else if (type === 'stairs') {
        stairsCount++;
      }
    });

    var details = [];
    if (roomCount > 0) details.push('部屋 ' + roomCount + '個');
    if (stairsCount > 0) details.push('階段 ' + stairsCount + '個');

    var html =
      '<div class="multi-select-info">' +
        '<div class="multi-select-count">' + count + '個 選択中</div>' +
        '<div class="multi-select-detail">' + details.join('、') + '</div>' +
      '</div>';

    if (totalTatami > 0) {
      html +=
        '<div class="prop-group">' +
          '<label>合計帖数</label>' +
          '<span class="tatami-value">' + totalTatami.toFixed(1) + ' 帖</span>' +
        '</div>';
    }

    html +=
      '<div class="prop-group">' +
        '<button id="btn-delete-all" class="small-btn danger">一括削除</button>' +
      '</div>';

    panel.innerHTML = html;

    document.getElementById('btn-delete-all').addEventListener('click', function () {
      deleteAllSelected();
    });
  }

  // --- 選択中オブジェクトの一括削除 ---
  function deleteAllSelected() {
    var ids = selectedIds.slice();
    var types = Object.assign({}, typeMap);
    var needWallRegen = false;

    ids.forEach(function (id) {
      if (types[id] === 'room') {
        FPE.DataModel.removeRoom(id);
        needWallRegen = true;
      } else if (types[id] === 'stairs') {
        FPE.DataModel.removeStairs(id);
      }
    });

    deselect();
    FPE.RoomManager.render();
    FPE.StairsManager.render();
    if (needWallRegen && FPE.WallManager) FPE.WallManager.generateWalls();
    if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
  }

  function calcTatami(room) {
    if (!room.parts) return 0;
    var total = 0;
    room.parts.forEach(function (p) {
      total += (p.width * p.height) / FPE.CONST.TATAMI_DIVISOR;
    });
    return total;
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    select: select,
    addToSelection: addToSelection,
    selectMultiple: selectMultiple,
    deselect: deselect,
    getSelectedId: getSelectedId,
    getSelectedType: getSelectedType,
    getSelectedIds: getSelectedIds,
    getSelectedTypes: getSelectedTypes,
    isSelected: isSelected,
    getSelectedCount: getSelectedCount,
    renderHandles: renderHandles,
    clearHandles: clearHandles,
    getRoomBounds: getRoomBounds,
    updatePropertyPanel: updatePropertyPanel,
    deleteAllSelected: deleteAllSelected,
    calcTatami: calcTatami,
  };
})();
// room-manager.js - 部屋のCRUD・描画・ドラッグ操作（複数選択一括移動対応）
window.FPE = window.FPE || {};

FPE.RoomManager = (function () {
  var isDraggingNew = false;
  var dragStart = null;
  var dragCurrent = null;
  var isDraggingMove = false;
  var moveStart = null;
  var moveIds = [];        // 一括移動対象ID配列
  var moveOrigData = {};   // { id: { parts: [...] } } or { id: { x, y } } for stairs
  var isDraggingResize = false;
  var resizeDir = null;
  var resizeRoomId = null;
  var resizeOrigBounds = null;
  var resizePartIndex = 0;
  var isAddingPart = false;
  var addPartRoomId = null;

  // 矩形範囲選択用
  var isBoxSelecting = false;
  var boxSelectStart = null;

  function init() {
    // SVGイベントはui.jsから接続
  }

  // --- 描画 ---
  function render() {
    var layerRooms = document.getElementById('layer-rooms');
    var layerLabels = document.getElementById('layer-labels');
    if (!layerRooms) return;
    layerRooms.innerHTML = '';
    layerLabels.innerHTML = '';

    var rooms = FPE.DataModel.getRooms();
    rooms.forEach(function (room) {
      drawRoom(room, layerRooms, layerLabels);
    });
  }

  function drawRoom(room, layerRooms, layerLabels) {
    var G = FPE.CONST.GRID_PX;
    var isSelected = FPE.SelectionManager.isSelected(room.id);

    if (room.parts.length === 1) {
      var p = room.parts[0];
      var rect = FPE.GridRenderer.createSVG('rect', {
        x: p.x * G, y: p.y * G,
        width: p.width * G, height: p.height * G,
        fill: room.color, 'fill-opacity': 0.6,
        stroke: isSelected ? FPE.CONST.COLOR_SELECTION : '#888',
        'stroke-width': isSelected ? 2.5 : 1.5,
        cursor: 'move',
        'data-room-id': room.id,
      });
      rect.classList.add('room-shape');
      layerRooms.appendChild(rect);
    } else {
      var path = computeOuterPath(room.parts);
      var pathEl = FPE.GridRenderer.createSVG('path', {
        d: path,
        fill: room.color, 'fill-opacity': 0.6,
        stroke: isSelected ? FPE.CONST.COLOR_SELECTION : '#888',
        'stroke-width': isSelected ? 2.5 : 1.5,
        cursor: 'move',
        'data-room-id': room.id,
      });
      pathEl.classList.add('room-shape');
      layerRooms.appendChild(pathEl);

      room.parts.forEach(function (p) {
        var inner = FPE.GridRenderer.createSVG('rect', {
          x: p.x * G, y: p.y * G,
          width: p.width * G, height: p.height * G,
          fill: 'none',
          stroke: '#aaa', 'stroke-width': 0.5, 'stroke-dasharray': '4,2',
          'pointer-events': 'none',
        });
        layerRooms.appendChild(inner);
      });
    }

    // ラベル — 最大パーツの中心に配置（L字等で形状外にならないように）
    var tatami = FPE.SelectionManager.calcTatami(room);
    var MM = FPE.CONST.GRID_MM;
    var labelPart = findLargestPart(room);
    var cx, cy;
    if (room.parts.length > 1 && labelPart) {
      cx = (labelPart.x + labelPart.width / 2) * G;
      cy = (labelPart.y + labelPart.height / 2) * G;
    } else {
      var bounds = FPE.SelectionManager.getRoomBounds(room);
      cx = (bounds.x + bounds.width / 2) * G;
      cy = (bounds.y + bounds.height / 2) * G;
    }

    var nameLabel = FPE.GridRenderer.createSVG('text', {
      x: cx, y: cy - 8,
      'text-anchor': 'middle', 'dominant-baseline': 'auto',
      'font-size': 13, 'font-weight': 'bold',
      fill: '#333', 'pointer-events': 'none',
    });
    nameLabel.textContent = room.name;
    layerLabels.appendChild(nameLabel);

    var tatamiLabel = FPE.GridRenderer.createSVG('text', {
      x: cx, y: cy + 8,
      'text-anchor': 'middle', 'dominant-baseline': 'auto',
      'font-size': 11,
      fill: '#666', 'pointer-events': 'none',
    });
    tatamiLabel.textContent = tatami.toFixed(1) + '帖';
    layerLabels.appendChild(tatamiLabel);

    if (room.parts.length === 1) {
      var singleBounds = FPE.SelectionManager.getRoomBounds(room);
      var totalW_mm = Math.round(singleBounds.width * MM);
      var totalH_mm = Math.round(singleBounds.height * MM);
      var mmLabel = FPE.GridRenderer.createSVG('text', {
        x: cx, y: cy + 22,
        'text-anchor': 'middle', 'dominant-baseline': 'auto',
        'font-size': 10,
        fill: '#999', 'pointer-events': 'none',
      });
      mmLabel.textContent = totalW_mm + '×' + totalH_mm + 'mm';
      layerLabels.appendChild(mmLabel);
    }

    if (room.parts.length > 1) {
      room.parts.forEach(function (p) {
        var pcx = (p.x + p.width / 2) * G;
        var pcy = (p.y + p.height / 2) * G;
        var pw_mm = Math.round(p.width * MM);
        var ph_mm = Math.round(p.height * MM);
        var partLabel = FPE.GridRenderer.createSVG('text', {
          x: pcx, y: pcy + 4,
          'text-anchor': 'middle', 'dominant-baseline': 'auto',
          'font-size': 9,
          fill: '#aaa', 'pointer-events': 'none',
        });
        partLabel.textContent = pw_mm + '×' + ph_mm;
        layerLabels.appendChild(partLabel);
      });
    }
  }

  // --- 最大面積パーツを返す ---
  function findLargestPart(room) {
    if (!room.parts || room.parts.length === 0) return null;
    var largest = room.parts[0];
    var maxArea = largest.width * largest.height;
    for (var i = 1; i < room.parts.length; i++) {
      var area = room.parts[i].width * room.parts[i].height;
      if (area > maxArea) {
        maxArea = area;
        largest = room.parts[i];
      }
    }
    return largest;
  }

  // --- 外周パス計算 ---
  function computeOuterPath(parts) {
    var G = FPE.CONST.GRID_PX;
    var resolution = 4;
    var cells = {};

    parts.forEach(function (p) {
      var x0 = Math.round(p.x * resolution);
      var y0 = Math.round(p.y * resolution);
      var x1 = Math.round((p.x + p.width) * resolution);
      var y1 = Math.round((p.y + p.height) * resolution);
      for (var cy = y0; cy < y1; cy++) {
        for (var cx = x0; cx < x1; cx++) {
          cells[cx + ',' + cy] = true;
        }
      }
    });

    var edges = [];
    Object.keys(cells).forEach(function (key) {
      var parts = key.split(',');
      var cx = parseInt(parts[0]);
      var cy = parseInt(parts[1]);
      if (!cells[cx + ',' + (cy - 1)]) {
        edges.push({ x1: cx, y1: cy, x2: cx + 1, y2: cy });
      }
      if (!cells[cx + ',' + (cy + 1)]) {
        edges.push({ x1: cx + 1, y1: cy + 1, x2: cx, y2: cy + 1 });
      }
      if (!cells[(cx - 1) + ',' + cy]) {
        edges.push({ x1: cx, y1: cy + 1, x2: cx, y2: cy });
      }
      if (!cells[(cx + 1) + ',' + cy]) {
        edges.push({ x1: cx + 1, y1: cy, x2: cx + 1, y2: cy + 1 });
      }
    });

    if (edges.length === 0) return '';
    var scale = G / resolution;
    var sorted = chainEdges(edges);
    var d = 'M ' + (sorted[0].x * scale) + ' ' + (sorted[0].y * scale);
    for (var i = 1; i < sorted.length; i++) {
      d += ' L ' + (sorted[i].x * scale) + ' ' + (sorted[i].y * scale);
    }
    d += ' Z';
    return d;
  }

  function chainEdges(edges) {
    if (edges.length === 0) return [];
    var adjacency = {};
    edges.forEach(function (e) {
      var k1 = e.x1 + ',' + e.y1;
      var k2 = e.x2 + ',' + e.y2;
      if (!adjacency[k1]) adjacency[k1] = [];
      if (!adjacency[k2]) adjacency[k2] = [];
      adjacency[k1].push(k2);
      adjacency[k2].push(k1);
    });

    var start = edges[0].x1 + ',' + edges[0].y1;
    var path = [];
    var visited = {};
    var current = start;

    var prev = null;
    for (var iter = 0; iter < edges.length * 2 + 2; iter++) {
      var parts = current.split(',');
      path.push({ x: parseInt(parts[0]), y: parseInt(parts[1]) });
      visited[current] = true;
      var neighbors = adjacency[current];
      var next = null;
      for (var i = 0; i < neighbors.length; i++) {
        if (neighbors[i] !== prev && !visited[neighbors[i]]) {
          next = neighbors[i];
          break;
        }
      }
      if (!next) {
        for (var i = 0; i < neighbors.length; i++) {
          if (neighbors[i] === start && path.length > 2) {
            next = start;
            break;
          }
        }
        if (!next) break;
      }
      if (next === start) break;
      prev = current;
      current = next;
    }

    var simplified = [];
    for (var i = 0; i < path.length; i++) {
      var prev = path[(i - 1 + path.length) % path.length];
      var curr = path[i];
      var next = path[(i + 1) % path.length];
      var dx1 = curr.x - prev.x;
      var dy1 = curr.y - prev.y;
      var dx2 = next.x - curr.x;
      var dy2 = next.y - curr.y;
      if (dx1 !== dx2 || dy1 !== dy2) {
        simplified.push(curr);
      }
    }

    return simplified.length > 0 ? simplified : path;
  }

  // --- 移動開始: 全選択オブジェクトの元座標を保存 ---
  function startBatchMove(gridPos) {
    isDraggingMove = true;
    moveStart = FPE.Snap.point(gridPos.x, gridPos.y);
    moveIds = FPE.SelectionManager.getSelectedIds();
    moveOrigData = {};

    var types = FPE.SelectionManager.getSelectedTypes();
    moveIds.forEach(function (id) {
      if (types[id] === 'room') {
        var room = FPE.DataModel.findRoom(id);
        if (room) {
          moveOrigData[id] = { type: 'room', parts: JSON.parse(JSON.stringify(room.parts)) };
        }
      } else if (types[id] === 'stairs') {
        var s = FPE.DataModel.findStairs(id);
        if (s) {
          moveOrigData[id] = { type: 'stairs', x: s.x, y: s.y };
        }
      }
    });
  }

  // --- マウスイベント ---
  function onMouseDown(e, gridPos) {
    var tool = FPE.ToolManager.getTool();

    if (tool === 'room') {
      if (isAddingPart) {
        dragStart = FPE.Snap.point(gridPos.x, gridPos.y);
        dragCurrent = dragStart;
        return;
      }
      isDraggingNew = true;
      dragStart = FPE.Snap.point(gridPos.x, gridPos.y);
      dragCurrent = dragStart;
      return;
    }

    if (tool === 'select') {
      // ハンドルチェック
      if (e.target.classList.contains('resize-handle')) {
        isDraggingResize = true;
        resizeDir = e.target.dataset.handle;
        resizeRoomId = e.target.dataset.roomId;
        resizePartIndex = parseInt(e.target.dataset.partIndex) || 0;
        var room = FPE.DataModel.findRoom(resizeRoomId);
        var part = room.parts[resizePartIndex];
        resizeOrigBounds = { x: part.x, y: part.y, width: part.width, height: part.height };
        moveStart = FPE.Snap.point(gridPos.x, gridPos.y);
        return;
      }

      // 部屋クリック
      if (e.target.classList.contains('room-shape')) {
        var roomId = e.target.dataset.roomId;

        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Click: トグル追加/除外
          FPE.SelectionManager.addToSelection(roomId, 'room');
          FPE.RoomManager.render();
          return;
        }

        if (FPE.SelectionManager.isSelected(roomId) && FPE.SelectionManager.getSelectedCount() > 1) {
          // 既に選択中 + 他にも選択あり → 一括移動開始
          startBatchMove(gridPos);
          return;
        }

        // 通常クリック: 単一選択 + 移動開始
        FPE.SelectionManager.select(roomId, 'room');
        startBatchMove(gridPos);
        FPE.RoomManager.render();
        return;
      }

      // 階段クリック（ui.jsから呼ばれる場合用）
      var stairsEl = e.target.closest && e.target.closest('.stairs-shape');
      if (stairsEl) {
        var stairsId = stairsEl.dataset.stairsId;
        if (e.ctrlKey || e.metaKey) {
          FPE.SelectionManager.addToSelection(stairsId, 'stairs');
          FPE.StairsManager.render();
          return;
        }
        if (FPE.SelectionManager.isSelected(stairsId) && FPE.SelectionManager.getSelectedCount() > 1) {
          startBatchMove(gridPos);
          return;
        }
        FPE.SelectionManager.select(stairsId, 'stairs');
        startBatchMove(gridPos);
        FPE.StairsManager.render();
        return;
      }

      // 何もないところ → 矩形範囲選択開始
      if (!e.ctrlKey && !e.metaKey) {
        FPE.SelectionManager.deselect();
        FPE.RoomManager.render();
        FPE.StairsManager.render();
      }
      isBoxSelecting = true;
      boxSelectStart = { x: gridPos.x, y: gridPos.y };
    }
  }

  function onMouseMove(e, gridPos) {
    if (isDraggingNew) {
      dragCurrent = FPE.Snap.point(gridPos.x, gridPos.y);
      renderPreview();
      return;
    }

    if (isDraggingMove) {
      var snapped = FPE.Snap.point(gridPos.x, gridPos.y);
      var dx = snapped.x - moveStart.x;
      var dy = snapped.y - moveStart.y;

      moveIds.forEach(function (id) {
        var orig = moveOrigData[id];
        if (!orig) return;
        if (orig.type === 'room') {
          var room = FPE.DataModel.findRoom(id);
          if (room) {
            room.parts.forEach(function (p, i) {
              p.x = orig.parts[i].x + dx;
              p.y = orig.parts[i].y + dy;
            });
          }
        } else if (orig.type === 'stairs') {
          var s = FPE.DataModel.findStairs(id);
          if (s) {
            s.x = orig.x + dx;
            s.y = orig.y + dy;
          }
        }
      });

      render();
      FPE.StairsManager.render();
      FPE.SelectionManager.renderHandles();
      FPE.SelectionManager.updatePropertyPanel();
      return;
    }

    if (isDraggingResize) {
      handleResize(gridPos);
      return;
    }

    // 矩形範囲選択のプレビュー
    if (isBoxSelecting && boxSelectStart) {
      renderBoxSelectPreview(gridPos);
      return;
    }

    // パーツ追加プレビュー
    if (isAddingPart) {
      dragCurrent = FPE.Snap.point(gridPos.x, gridPos.y);
      if (dragStart) renderPreview();
    }
  }

  function onMouseUp(e, gridPos) {
    if (isDraggingNew) {
      isDraggingNew = false;
      var snapped = FPE.Snap.point(gridPos.x, gridPos.y);
      var x = Math.min(dragStart.x, snapped.x);
      var y = Math.min(dragStart.y, snapped.y);
      var w = Math.abs(snapped.x - dragStart.x);
      var h = Math.abs(snapped.y - dragStart.y);
      w = FPE.Snap.size(w);
      h = FPE.Snap.size(h);
      if (w >= 0.5 && h >= 0.5) {
        var room = FPE.DataModel.addRoom({
          name: FPE.CONST.DEFAULT_ROOM_NAME,
          color: FPE.CONST.DEFAULT_ROOM_COLOR,
          parts: [{ x: x, y: y, width: w, height: h }],
        });
        render();
        FPE.SelectionManager.select(room.id, 'room');
        if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
        if (FPE.WallManager) FPE.WallManager.generateWalls();
        FPE.ToolManager.setTool('select');
      }
      clearPreview();
      return;
    }

    if (isDraggingMove) {
      isDraggingMove = false;
      moveIds = [];
      moveOrigData = {};
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
      if (FPE.WallManager) FPE.WallManager.generateWalls();
      return;
    }

    if (isDraggingResize) {
      isDraggingResize = false;
      resizeRoomId = null;
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
      if (FPE.WallManager) FPE.WallManager.generateWalls();
      return;
    }

    // 矩形範囲選択の確定
    if (isBoxSelecting) {
      isBoxSelecting = false;
      if (boxSelectStart) {
        finishBoxSelect(gridPos);
        boxSelectStart = null;
      }
      clearPreview();
      return;
    }

    if (isAddingPart && dragStart) {
      var snapped = FPE.Snap.point(gridPos.x, gridPos.y);
      var x = Math.min(dragStart.x, snapped.x);
      var y = Math.min(dragStart.y, snapped.y);
      var w = Math.abs(snapped.x - dragStart.x);
      var h = Math.abs(snapped.y - dragStart.y);
      w = FPE.Snap.size(w);
      h = FPE.Snap.size(h);
      if (w >= 0.5 && h >= 0.5 && addPartRoomId) {
        var room = FPE.DataModel.findRoom(addPartRoomId);
        if (room) {
          room.parts.push({ x: x, y: y, width: w, height: h });
          FPE.DataModel.updateRoom(addPartRoomId, { parts: room.parts });
          render();
          FPE.SelectionManager.renderHandles();
          FPE.SelectionManager.updatePropertyPanel();
          if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
          if (FPE.WallManager) FPE.WallManager.generateWalls();
        }
      }
      isAddingPart = false;
      addPartRoomId = null;
      clearPreview();
      FPE.ToolManager.setTool('select');
      return;
    }
  }

  // --- 矩形範囲選択プレビュー ---
  function renderBoxSelectPreview(gridPos) {
    var layer = document.getElementById('layer-preview');
    if (!layer) return;
    layer.innerHTML = '';
    var G = FPE.CONST.GRID_PX;

    var x1 = boxSelectStart.x;
    var y1 = boxSelectStart.y;
    var x2 = gridPos.x;
    var y2 = gridPos.y;

    var rx = Math.min(x1, x2) * G;
    var ry = Math.min(y1, y2) * G;
    var rw = Math.abs(x2 - x1) * G;
    var rh = Math.abs(y2 - y1) * G;

    var rect = FPE.GridRenderer.createSVG('rect', {
      x: rx, y: ry, width: rw, height: rh,
      fill: 'rgba(33, 150, 243, 0.1)',
      stroke: FPE.CONST.COLOR_SELECTION,
      'stroke-width': 1, 'stroke-dasharray': '4,3',
      'pointer-events': 'none',
    });
    layer.appendChild(rect);
  }

  // --- 矩形範囲選択の確定 ---
  function finishBoxSelect(gridPos) {
    var x1 = Math.min(boxSelectStart.x, gridPos.x);
    var y1 = Math.min(boxSelectStart.y, gridPos.y);
    var x2 = Math.max(boxSelectStart.x, gridPos.x);
    var y2 = Math.max(boxSelectStart.y, gridPos.y);

    // 範囲が極小の場合は選択しない
    if (Math.abs(x2 - x1) < 0.2 && Math.abs(y2 - y1) < 0.2) return;

    var items = [];

    // 部屋との交差判定
    var rooms = FPE.DataModel.getRooms();
    rooms.forEach(function (room) {
      var bounds = FPE.SelectionManager.getRoomBounds(room);
      if (rectsOverlap(x1, y1, x2, y2, bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height)) {
        items.push({ id: room.id, type: 'room' });
      }
    });

    // 階段との交差判定
    var stairs = FPE.DataModel.getStairs();
    stairs.forEach(function (s) {
      if (rectsOverlap(x1, y1, x2, y2, s.x, s.y, s.x + s.width, s.y + s.height)) {
        items.push({ id: s.id, type: 'stairs' });
      }
    });

    if (items.length > 0) {
      FPE.SelectionManager.selectMultiple(items);
      render();
      FPE.StairsManager.render();
    }
  }

  // 2つのAABBが重なるか判定
  function rectsOverlap(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
    return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
  }

  function handleResize(gridPos) {
    var snapped = FPE.Snap.point(gridPos.x, gridPos.y);
    var room = FPE.DataModel.findRoom(resizeRoomId);
    if (!room) return;
    var p = room.parts[resizePartIndex];
    if (!p) return;

    var orig = resizeOrigBounds;
    var dir = resizeDir;

    var newX = p.x, newY = p.y, newW = p.width, newH = p.height;

    if (dir.includes('w')) {
      newX = Math.min(snapped.x, orig.x + orig.width - 0.5);
      newW = orig.x + orig.width - newX;
    }
    if (dir.includes('e')) {
      newW = Math.max(0.5, snapped.x - orig.x);
    }
    if (dir.includes('n')) {
      newY = Math.min(snapped.y, orig.y + orig.height - 0.5);
      newH = orig.y + orig.height - newY;
    }
    if (dir.includes('s')) {
      newH = Math.max(0.5, snapped.y - orig.y);
    }

    p.x = FPE.Snap.toGrid(newX);
    p.y = FPE.Snap.toGrid(newY);
    p.width = FPE.Snap.size(newW);
    p.height = FPE.Snap.size(newH);

    render();
    FPE.SelectionManager.renderHandles();
    FPE.SelectionManager.updatePropertyPanel();
  }

  // --- プレビュー描画 ---
  function renderPreview() {
    clearPreview();
    if (!dragStart || !dragCurrent) return;
    var layer = document.getElementById('layer-preview');
    var G = FPE.CONST.GRID_PX;

    var x = Math.min(dragStart.x, dragCurrent.x);
    var y = Math.min(dragStart.y, dragCurrent.y);
    var w = Math.abs(dragCurrent.x - dragStart.x);
    var h = Math.abs(dragCurrent.y - dragStart.y);

    var rect = FPE.GridRenderer.createSVG('rect', {
      x: x * G, y: y * G,
      width: w * G, height: h * G,
      fill: FPE.CONST.COLOR_PREVIEW,
      stroke: FPE.CONST.COLOR_SELECTION,
      'stroke-width': 1.5, 'stroke-dasharray': '6,3',
      'pointer-events': 'none',
    });
    layer.appendChild(rect);

    if (w >= 0.25 && h >= 0.25) {
      var tatami = (w * h) / FPE.CONST.TATAMI_DIVISOR;
      var MM = FPE.CONST.GRID_MM;
      var w_mm = Math.round(w * MM);
      var h_mm = Math.round(h * MM);
      var cx = (x + w / 2) * G;
      var cy = (y + h / 2) * G;
      var sizeText = FPE.GridRenderer.createSVG('text', {
        x: cx, y: cy - 7,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-size': 12, fill: FPE.CONST.COLOR_SELECTION,
        'pointer-events': 'none',
      });
      sizeText.textContent = w.toFixed(1) + '×' + h.toFixed(1) + ' (' + tatami.toFixed(1) + '帖)';
      var mmText = FPE.GridRenderer.createSVG('text', {
        x: cx, y: cy + 9,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-size': 11, fill: FPE.CONST.COLOR_SELECTION,
        'pointer-events': 'none',
      });
      mmText.textContent = w_mm + '×' + h_mm + 'mm';
      layer.appendChild(sizeText);
      layer.appendChild(mmText);
    }
  }

  function clearPreview() {
    var layer = document.getElementById('layer-preview');
    if (layer) layer.innerHTML = '';
  }

  // --- パーツ追加モード ---
  function startAddPart(roomId) {
    isAddingPart = true;
    addPartRoomId = roomId;
    dragStart = null;
    FPE.ToolManager.setTool('room');
  }

  // --- 部屋プリセットから追加 ---
  function addPreset(preset) {
    var room = FPE.DataModel.addRoom({
      name: preset.name,
      color: preset.color,
      parts: [{ x: 1, y: 1, width: preset.width, height: preset.height }],
    });
    render();
    FPE.SelectionManager.select(room.id, 'room');
    if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
    if (FPE.WallManager) FPE.WallManager.generateWalls();
    FPE.ToolManager.setTool('select');
  }

  function getIsAddingPart() { return isAddingPart; }

  return {
    init: init,
    render: render,
    onMouseDown: onMouseDown,
    onMouseMove: onMouseMove,
    onMouseUp: onMouseUp,
    renderPreview: renderPreview,
    clearPreview: clearPreview,
    startAddPart: startAddPart,
    addPreset: addPreset,
    getIsAddingPart: getIsAddingPart,
    computeOuterPath: computeOuterPath,
  };
})();
// wall-manager.js - 壁の自動生成＋窓/ドア配置
window.FPE = window.FPE || {};

FPE.WallManager = (function () {
  function init() {}

  /** 部屋の境界から壁を自動生成 */
  function generateWalls() {
    var rooms = FPE.DataModel.getRooms();
    var walls = [];
    var G = FPE.CONST.GRID_PX;
    var resolution = 4;

    // 全部屋のセルマップを作成
    var cellToRoom = {};
    rooms.forEach(function (room) {
      room.parts.forEach(function (p) {
        var x0 = Math.round(p.x * resolution);
        var y0 = Math.round(p.y * resolution);
        var x1 = Math.round((p.x + p.width) * resolution);
        var y1 = Math.round((p.y + p.height) * resolution);
        for (var cy = y0; cy < y1; cy++) {
          for (var cx = x0; cx < x1; cx++) {
            var key = cx + ',' + cy;
            if (!cellToRoom[key]) cellToRoom[key] = [];
            cellToRoom[key].push(room.id);
          }
        }
      });
    });

    // エッジ抽出
    var edgeMap = {};
    Object.keys(cellToRoom).forEach(function (key) {
      var parts = key.split(',');
      var cx = parseInt(parts[0]);
      var cy = parseInt(parts[1]);
      var roomIds = cellToRoom[key];

      // 4方向チェック
      var dirs = [
        { dx: 0, dy: -1, x1: cx, y1: cy, x2: cx + 1, y2: cy },       // 上
        { dx: 0, dy: 1,  x1: cx, y1: cy + 1, x2: cx + 1, y2: cy + 1 }, // 下
        { dx: -1, dy: 0, x1: cx, y1: cy, x2: cx, y2: cy + 1 },       // 左
        { dx: 1, dy: 0,  x1: cx + 1, y1: cy, x2: cx + 1, y2: cy + 1 }, // 右
      ];

      dirs.forEach(function (d) {
        var nk = (cx + d.dx) + ',' + (cy + d.dy);
        var neighborRooms = cellToRoom[nk] || [];

        // 境界を正規化キーで管理
        var ek = [
          Math.min(d.x1, d.x2) + ',' + Math.min(d.y1, d.y2),
          Math.max(d.x1, d.x2) + ',' + Math.max(d.y1, d.y2),
        ].join('-');

        if (edgeMap[ek]) return; // 重複防止

        if (neighborRooms.length === 0) {
          // 外壁
          edgeMap[ek] = {
            x1: d.x1 / resolution, y1: d.y1 / resolution,
            x2: d.x2 / resolution, y2: d.y2 / resolution,
            type: 'exterior',
          };
        } else {
          // 異なる部屋との境界 = 内壁
          var isInternal = false;
          neighborRooms.forEach(function (nid) {
            if (roomIds.indexOf(nid) < 0) isInternal = true;
          });
          if (isInternal) {
            edgeMap[ek] = {
              x1: d.x1 / resolution, y1: d.y1 / resolution,
              x2: d.x2 / resolution, y2: d.y2 / resolution,
              type: 'interior',
            };
          }
        }
      });
    });

    // エッジを壁セグメントにマージ（同一直線上の連続エッジを結合）
    var edgeList = Object.values(edgeMap);
    var merged = mergeEdges(edgeList);

    // 既存壁の開口部を絶対座標で収集
    var oldWalls = FPE.DataModel.getWalls();
    var savedOpenings = [];
    oldWalls.forEach(function (w) {
      if (!w.openings) return;
      var dx = w.x2 - w.x1;
      var dy = w.y2 - w.y1;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;
      var ux = dx / len;
      var uy = dy / len;
      w.openings.forEach(function (op) {
        // 開口部の中心の絶対グリッド座標を算出
        savedOpenings.push({
          absX: w.x1 + ux * op.position,
          absY: w.y1 + uy * op.position,
          opening: JSON.parse(JSON.stringify(op)),
        });
      });
    });

    // 壁データに変換
    var wallCounter = 0;
    merged.forEach(function (seg) {
      wallCounter++;
      var wall = {
        id: 'wall-' + String(wallCounter).padStart(3, '0'),
        x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2,
        type: seg.type,
        openings: [],
      };
      walls.push(wall);
    });

    // 開口部を新しい壁に再マッピング
    savedOpenings.forEach(function (saved) {
      var bestWall = null;
      var bestDist = Infinity;
      var bestPos = 0;

      walls.forEach(function (w) {
        var dx = w.x2 - w.x1;
        var dy = w.y2 - w.y1;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        // 壁上への射影位置 t (0〜1)
        var t = ((saved.absX - w.x1) * dx + (saved.absY - w.y1) * dy) / (len * len);
        if (t < 0.01 || t > 0.99) return; // 壁の端すぎる場合は除外
        // 壁からの垂直距離
        var projX = w.x1 + dx * t;
        var projY = w.y1 + dy * t;
        var dist = Math.sqrt(
          (saved.absX - projX) * (saved.absX - projX) +
          (saved.absY - projY) * (saved.absY - projY)
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestWall = w;
          bestPos = t * len;
        }
      });

      // 壁上またはごく近傍（0.1グリッド以内）の場合のみ復元
      if (bestWall && bestDist < 0.1) {
        var op = saved.opening;
        op.position = FPE.Snap.toGrid(bestPos);
        bestWall.openings.push(op);
      }
    });

    FPE.DataModel.setWalls(walls);
    renderWalls();
  }



  /** 同一直線上のエッジをマージ */
  function mergeEdges(edges) {
    // 水平と垂直を分けてソート・マージ
    var horizontal = edges.filter(function (e) { return e.y1 === e.y2; });
    var vertical = edges.filter(function (e) { return e.x1 === e.x2; });
    var merged = [];

    // 水平エッジをy+typeでグループ化
    var hGroups = {};
    horizontal.forEach(function (e) {
      var key = e.y1 + '|' + e.type;
      if (!hGroups[key]) hGroups[key] = [];
      hGroups[key].push(e);
    });
    Object.values(hGroups).forEach(function (group) {
      group.sort(function (a, b) { return Math.min(a.x1, a.x2) - Math.min(b.x1, b.x2); });
      var cur = Object.assign({}, group[0]);
      cur.x1 = Math.min(cur.x1, cur.x2);
      cur.x2 = Math.max(group[0].x1, group[0].x2);
      for (var i = 1; i < group.length; i++) {
        var next = group[i];
        var nx1 = Math.min(next.x1, next.x2);
        var nx2 = Math.max(next.x1, next.x2);
        if (Math.abs(nx1 - cur.x2) < 0.01) {
          cur.x2 = nx2; // 延長
        } else {
          merged.push(cur);
          cur = { x1: nx1, y1: next.y1, x2: nx2, y2: next.y2, type: next.type };
        }
      }
      merged.push(cur);
    });

    // 垂直エッジ
    var vGroups = {};
    vertical.forEach(function (e) {
      var key = e.x1 + '|' + e.type;
      if (!vGroups[key]) vGroups[key] = [];
      vGroups[key].push(e);
    });
    Object.values(vGroups).forEach(function (group) {
      group.sort(function (a, b) { return Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2); });
      var cur = Object.assign({}, group[0]);
      cur.y1 = Math.min(cur.y1, cur.y2);
      cur.y2 = Math.max(group[0].y1, group[0].y2);
      for (var i = 1; i < group.length; i++) {
        var next = group[i];
        var ny1 = Math.min(next.y1, next.y2);
        var ny2 = Math.max(next.y1, next.y2);
        if (Math.abs(ny1 - cur.y2) < 0.01) {
          cur.y2 = ny2;
        } else {
          merged.push(cur);
          cur = { x1: next.x1, y1: ny1, x2: next.x2, y2: ny2, type: next.type };
        }
      }
      merged.push(cur);
    });

    return merged;
  }

  /** 壁をSVGに描画 */
  function renderWalls() {
    var layerWalls = document.getElementById('layer-walls');
    var layerOpenings = document.getElementById('layer-openings');
    if (!layerWalls) return;
    layerWalls.innerHTML = '';
    if (layerOpenings) layerOpenings.innerHTML = '';

    var walls = FPE.DataModel.getWalls();
    var G = FPE.CONST.GRID_PX;

    walls.forEach(function (w) {
      var thick = w.type === 'exterior'
        ? FPE.CONST.WALL_EXT_THICK * G
        : FPE.CONST.WALL_INT_THICK * G;
      var color = w.type === 'exterior'
        ? FPE.CONST.COLOR_WALL_EXT
        : FPE.CONST.COLOR_WALL_INT;

      var line = FPE.GridRenderer.createSVG('line', {
        x1: w.x1 * G, y1: w.y1 * G,
        x2: w.x2 * G, y2: w.y2 * G,
        stroke: color,
        'stroke-width': thick,
        'stroke-linecap': 'square',
        'data-wall-id': w.id,
      });
      line.classList.add('wall-line');
      layerWalls.appendChild(line);

      // 開口部描画
      if (w.openings && layerOpenings) {
        w.openings.forEach(function (op) {
          drawOpening(layerOpenings, w, op, G);
        });
      }
    });
  }

  function drawOpening(layer, wall, opening, G) {
    var dx = wall.x2 - wall.x1;
    var dy = wall.y2 - wall.y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    var ux = dx / len;
    var uy = dy / len;
    // 法線
    var nx = -uy;
    var ny = ux;

    var pos = opening.position;
    var halfW = opening.width / 2;

    var cx = (wall.x1 + ux * pos) * G;
    var cy = (wall.y1 + uy * pos) * G;
    var sx = (wall.x1 + ux * (pos - halfW)) * G;
    var sy = (wall.y1 + uy * (pos - halfW)) * G;
    var ex = (wall.x1 + ux * (pos + halfW)) * G;
    var ey = (wall.y1 + uy * (pos + halfW)) * G;

    if (opening.type === 'window') {
      // 窓: 二重線
      var offset = 3;
      var line1 = FPE.GridRenderer.createSVG('line', {
        x1: sx + nx * offset, y1: sy + ny * offset,
        x2: ex + nx * offset, y2: ey + ny * offset,
        stroke: '#4FC3F7', 'stroke-width': 2,
      });
      var line2 = FPE.GridRenderer.createSVG('line', {
        x1: sx - nx * offset, y1: sy - ny * offset,
        x2: ex - nx * offset, y2: ey - ny * offset,
        stroke: '#4FC3F7', 'stroke-width': 2,
      });
      // 背景（壁を消す）
      var bg = FPE.GridRenderer.createSVG('line', {
        x1: sx, y1: sy, x2: ex, y2: ey,
        stroke: '#f9f9f9', 'stroke-width': 10,
      });
      layer.appendChild(bg);
      layer.appendChild(line1);
      layer.appendChild(line2);
    } else if (opening.type === 'door') {
      // ドア: 線＋円弧
      var swing = opening.swing === 'right' ? 1 : -1;
      var hinge = opening.hinge || 'start'; // 'start' or 'end'
      var doorLen = opening.width * G;
      // ヒンジ側（start=壁始点側, end=壁終点側）
      var hx = hinge === 'end' ? ex : sx;
      var hy = hinge === 'end' ? ey : sy;
      // ドア先端の壁上の端
      var tx = hinge === 'end' ? sx : ex;
      var ty = hinge === 'end' ? sy : ey;
      // 開き側
      var ox = hx + nx * swing * doorLen;
      var oy = hy + ny * swing * doorLen;

      // 背景
      var bg = FPE.GridRenderer.createSVG('line', {
        x1: sx, y1: sy, x2: ex, y2: ey,
        stroke: '#f9f9f9', 'stroke-width': 10,
      });
      layer.appendChild(bg);

      // ドア線
      var doorLine = FPE.GridRenderer.createSVG('line', {
        x1: hx, y1: hy, x2: ox, y2: oy,
        stroke: '#333', 'stroke-width': 1.5,
      });
      layer.appendChild(doorLine);

      // 円弧
      var sweepFlag = swing > 0 ? 1 : 0;
      if (hinge === 'end') sweepFlag = 1 - sweepFlag;
      var arcPath = 'M ' + ox + ' ' + oy +
        ' A ' + doorLen + ' ' + doorLen + ' 0 0 ' +
        sweepFlag + ' ' + tx + ' ' + ty;
      var arc = FPE.GridRenderer.createSVG('path', {
        d: arcPath,
        fill: 'none', stroke: '#333', 'stroke-width': 1,
        'stroke-dasharray': '4,2',
      });
      layer.appendChild(arc);

      // クリック可能な透明ヒットエリア（ドアの操作用）
      var hitGroup = FPE.GridRenderer.createSVG('g', {
        cursor: 'pointer',
        'data-wall-id': wall.id,
        'data-opening-pos': opening.position,
      });
      hitGroup.classList.add('door-hit');
      var hitLine = FPE.GridRenderer.createSVG('line', {
        x1: hx, y1: hy, x2: ox, y2: oy,
        stroke: 'transparent', 'stroke-width': 10,
      });
      var hitArc = FPE.GridRenderer.createSVG('path', {
        d: arcPath,
        fill: 'none', stroke: 'transparent', 'stroke-width': 10,
      });
      hitGroup.appendChild(hitLine);
      hitGroup.appendChild(hitArc);
      layer.appendChild(hitGroup);
    }
  }

  /** 壁クリック → 窓/ドア追加、または既存ドアの反転 */
  function onWallClick(e, gridPos) {
    // 既存ドアのクリック判定
    var doorHit = e.target.closest('.door-hit');
    if (doorHit) {
      handleDoorClick(doorHit, e);
      return;
    }

    var wallEl = e.target.closest('.wall-line');
    if (!wallEl) return;
    var wallId = wallEl.dataset.wallId;
    var wall = FPE.DataModel.findWall(wallId);
    if (!wall) return;

    var subMode = FPE.ToolManager.getSubMode() || 'window';

    // 壁上のクリック位置を計算
    var dx = wall.x2 - wall.x1;
    var dy = wall.y2 - wall.y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    var t = ((gridPos.x - wall.x1) * dx + (gridPos.y - wall.y1) * dy) / (len * len);
    t = Math.max(0.1, Math.min(0.9, t));
    var position = t * len;

    var opening = {
      type: subMode,
      position: FPE.Snap.toGrid(position),
      width: subMode === 'window' ? 1.0 : 0.75,
    };
    if (subMode === 'door') {
      opening.swing = 'left';
      opening.hinge = 'start';
    }

    if (!wall.openings) wall.openings = [];
    wall.openings.push(opening);
    FPE.DataModel.emit('walls-updated');
    if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
    renderWalls();
  }

  /** 既存ドアクリック: クリック→swing反転, Ctrl+クリック→ヒンジ反転 */
  function handleDoorClick(hitEl, e) {
    var wallId = hitEl.dataset.wallId;
    var openingPos = parseFloat(hitEl.dataset.openingPos);
    var wall = FPE.DataModel.findWall(wallId);
    if (!wall || !wall.openings) return;

    var opening = wall.openings.find(function (op) {
      return op.type === 'door' && Math.abs(op.position - openingPos) < 0.01;
    });
    if (!opening) return;

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+クリック → ヒンジ位置反転
      opening.hinge = (opening.hinge || 'start') === 'start' ? 'end' : 'start';
    } else {
      // クリック → swing方向反転
      opening.swing = opening.swing === 'left' ? 'right' : 'left';
    }

    FPE.DataModel.emit('walls-updated');
    if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
    renderWalls();
  }

  return {
    init: init,
    generateWalls: generateWalls,
    renderWalls: renderWalls,
    onWallClick: onWallClick,
  };
})();
// stairs-manager.js - 階段配置・描画（直線・L字・U字＋回転対応）
window.FPE = window.FPE || {};

FPE.StairsManager = (function () {
  var isDragging = false;
  var dragStart = null;

  function init() {}

  // --- ヘルパー ---
  function svg(tag, attrs) {
    return FPE.GridRenderer.createSVG(tag, attrs);
  }

  // --- タイプ別描画 dispatch ---
  function render() {
    var layer = document.getElementById('layer-stairs');
    if (!layer) return;
    layer.innerHTML = '';

    var stairs = FPE.DataModel.getStairs();
    var G = FPE.CONST.GRID_PX;

    stairs.forEach(function (s) {
      var type = s.stairType || 'straight';
      var rotation = s.rotation || 0;
      var isSelected = FPE.SelectionManager.isSelected(s.id);

      // 外側グループ（位置+回転）
      var outerG = svg('g', {
        'data-stairs-id': s.id,
        cursor: 'move',
      });
      outerG.classList.add('stairs-shape');

      // 回転transform: バウンディングボックス中心を軸に回転
      var cx = (s.x + s.width / 2) * G;
      var cy = (s.y + s.height / 2) * G;
      if (rotation !== 0) {
        outerG.setAttribute('transform', 'rotate(' + rotation + ' ' + cx + ' ' + cy + ')');
      }

      // 描画コンテキスト
      var ctx = {
        s: s, G: G, isSelected: isSelected,
        px: s.x * G, py: s.y * G,
        pw: s.width * G, ph: s.height * G,
        cx: cx, cy: cy, rotation: rotation,
      };

      // タイプ別描画
      if (type === 'L') {
        drawLShaped(outerG, ctx);
      } else if (type === 'U') {
        drawUShaped(outerG, ctx);
      } else {
        drawStraight(outerG, ctx);
      }

      // ラベル（逆回転で常に水平）
      drawLabel(outerG, ctx, type);

      layer.appendChild(outerG);
    });
  }

  // --- 直線階段 ---
  function drawStraight(g, ctx) {
    var s = ctx.s, G = ctx.G;

    // 背景
    g.appendChild(svg('rect', {
      x: ctx.px, y: ctx.py,
      width: ctx.pw, height: ctx.ph,
      fill: FPE.CONST.COLOR_STAIRS, 'fill-opacity': 0.3,
      stroke: ctx.isSelected ? FPE.CONST.COLOR_SELECTION : '#999',
      'stroke-width': ctx.isSelected ? 2 : 1,
    }));

    // 段のライン（水平）
    var steps = Math.max(3, Math.round(s.height * 3));
    var stepH = ctx.ph / steps;
    for (var i = 1; i < steps; i++) {
      g.appendChild(svg('line', {
        x1: ctx.px, y1: ctx.py + i * stepH,
        x2: ctx.px + ctx.pw, y2: ctx.py + i * stepH,
        stroke: '#999', 'stroke-width': 0.5,
      }));
    }

    // 矢印
    drawArrow(g, ctx, ctx.px, ctx.py, ctx.pw, ctx.ph, s.direction, 'vertical');
  }

  // --- L字階段 ---
  function drawLShaped(g, ctx) {
    var s = ctx.s, G = ctx.G;
    var px = ctx.px, py = ctx.py, pw = ctx.pw, ph = ctx.ph;
    var halfW = pw / 2;
    var halfH = ph / 2;

    // 全体背景
    g.appendChild(svg('rect', {
      x: px, y: py, width: pw, height: ph,
      fill: FPE.CONST.COLOR_STAIRS, 'fill-opacity': 0.3,
      stroke: ctx.isSelected ? FPE.CONST.COLOR_SELECTION : '#999',
      'stroke-width': ctx.isSelected ? 2 : 1,
    }));

    // 下半分右側を隠す（L字形状）— 背景色で塗りつぶし
    g.appendChild(svg('rect', {
      x: px + halfW, y: py + halfH,
      width: halfW, height: halfH,
      fill: '#f9f9f9', 'fill-opacity': 1,
      stroke: ctx.isSelected ? FPE.CONST.COLOR_SELECTION : '#999',
      'stroke-width': ctx.isSelected ? 2 : 1,
    }));

    // run1: 下半分左側（垂直走行 → 水平ステップ線）
    var run1Steps = Math.max(2, Math.round(s.height * 1.5));
    var run1StepH = halfH / run1Steps;
    for (var i = 1; i < run1Steps; i++) {
      g.appendChild(svg('line', {
        x1: px, y1: py + halfH + i * run1StepH,
        x2: px + halfW, y2: py + halfH + i * run1StepH,
        stroke: '#999', 'stroke-width': 0.5,
      }));
    }

    // run2: 上半分右側（水平走行 → 垂直ステップ線）
    var run2Steps = Math.max(2, Math.round(s.width * 1.5));
    var run2StepW = halfW / run2Steps;
    for (var i = 1; i < run2Steps; i++) {
      g.appendChild(svg('line', {
        x1: px + halfW + i * run2StepW, y1: py,
        x2: px + halfW + i * run2StepW, y2: py + halfH,
        stroke: '#999', 'stroke-width': 0.5,
      }));
    }

    // 踊り場（左上）破線区切り
    g.appendChild(svg('line', {
      x1: px + halfW, y1: py,
      x2: px + halfW, y2: py + halfH,
      stroke: '#999', 'stroke-width': 1, 'stroke-dasharray': '4,3',
    }));
    g.appendChild(svg('line', {
      x1: px, y1: py + halfH,
      x2: px + halfW, y2: py + halfH,
      stroke: '#999', 'stroke-width': 1, 'stroke-dasharray': '4,3',
    }));

    // run1 矢印（下から上へ）
    if (s.direction === 'up') {
      drawArrow(g, ctx, px, py + halfH, halfW, halfH, 'up', 'vertical');
      drawArrow(g, ctx, px + halfW, py, halfW, halfH, 'up', 'horizontal-right');
    } else {
      drawArrow(g, ctx, px + halfW, py, halfW, halfH, 'down', 'horizontal-left');
      drawArrow(g, ctx, px, py + halfH, halfW, halfH, 'down', 'vertical');
    }
  }

  // --- U字階段 ---
  function drawUShaped(g, ctx) {
    var s = ctx.s, G = ctx.G;
    var px = ctx.px, py = ctx.py, pw = ctx.pw, ph = ctx.ph;
    var halfW = pw / 2;
    var landingH = ph * 0.2;
    var runH = ph - landingH;

    // 全体背景
    g.appendChild(svg('rect', {
      x: px, y: py, width: pw, height: ph,
      fill: FPE.CONST.COLOR_STAIRS, 'fill-opacity': 0.3,
      stroke: ctx.isSelected ? FPE.CONST.COLOR_SELECTION : '#999',
      'stroke-width': ctx.isSelected ? 2 : 1,
    }));

    // 中央の縦仕切り（破線）
    g.appendChild(svg('line', {
      x1: px + halfW, y1: py + landingH,
      x2: px + halfW, y2: py + ph,
      stroke: '#999', 'stroke-width': 1, 'stroke-dasharray': '4,3',
    }));

    // 踊り場区切り（上部横線）
    g.appendChild(svg('line', {
      x1: px, y1: py + landingH,
      x2: px + pw, y2: py + landingH,
      stroke: '#999', 'stroke-width': 1, 'stroke-dasharray': '4,3',
    }));

    // run1: 左半分（水平ステップ線）
    var runSteps = Math.max(3, Math.round((ph - landingH) * 2.5));
    var stepH = runH / runSteps;
    for (var i = 1; i < runSteps; i++) {
      // 左半分
      g.appendChild(svg('line', {
        x1: px, y1: py + landingH + i * stepH,
        x2: px + halfW, y2: py + landingH + i * stepH,
        stroke: '#999', 'stroke-width': 0.5,
      }));
      // 右半分
      g.appendChild(svg('line', {
        x1: px + halfW, y1: py + landingH + i * stepH,
        x2: px + pw, y2: py + landingH + i * stepH,
        stroke: '#999', 'stroke-width': 0.5,
      }));
    }

    // 矢印
    if (s.direction === 'up') {
      drawArrow(g, ctx, px, py + landingH, halfW, runH, 'up', 'vertical');
      drawArrow(g, ctx, px + halfW, py + landingH, halfW, runH, 'down', 'vertical');
    } else {
      drawArrow(g, ctx, px, py + landingH, halfW, runH, 'down', 'vertical');
      drawArrow(g, ctx, px + halfW, py + landingH, halfW, runH, 'up', 'vertical');
    }
  }

  // --- 矢印描画ヘルパー ---
  function drawArrow(g, ctx, rx, ry, rw, rh, dir, orient) {
    var arrowCx, arrowCy, d;
    var sz = 6; // arrow head size

    if (orient === 'vertical') {
      arrowCx = rx + rw / 2;
      if (dir === 'up') {
        arrowCy = ry + 8;
        d = 'M ' + (arrowCx - sz) + ' ' + (arrowCy + sz) +
            ' L ' + arrowCx + ' ' + arrowCy +
            ' L ' + (arrowCx + sz) + ' ' + (arrowCy + sz);
      } else {
        arrowCy = ry + rh - 8;
        d = 'M ' + (arrowCx - sz) + ' ' + (arrowCy - sz) +
            ' L ' + arrowCx + ' ' + arrowCy +
            ' L ' + (arrowCx + sz) + ' ' + (arrowCy - sz);
      }
    } else if (orient === 'horizontal-right') {
      arrowCy = ry + rh / 2;
      arrowCx = rx + rw - 8;
      d = 'M ' + (arrowCx - sz) + ' ' + (arrowCy - sz) +
          ' L ' + arrowCx + ' ' + arrowCy +
          ' L ' + (arrowCx - sz) + ' ' + (arrowCy + sz);
    } else if (orient === 'horizontal-left') {
      arrowCy = ry + rh / 2;
      arrowCx = rx + 8;
      d = 'M ' + (arrowCx + sz) + ' ' + (arrowCy - sz) +
          ' L ' + arrowCx + ' ' + arrowCy +
          ' L ' + (arrowCx + sz) + ' ' + (arrowCy + sz);
    }

    g.appendChild(svg('path', {
      d: d,
      fill: 'none', stroke: '#555', 'stroke-width': 2,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }));
  }

  // --- ラベル描画（逆回転で水平維持） ---
  function drawLabel(g, ctx, type) {
    var s = ctx.s;
    var rotation = ctx.rotation;
    var labelText;

    if (type === 'L') {
      labelText = (s.direction === 'up' ? 'UP' : 'DN') + ' L';
    } else if (type === 'U') {
      labelText = (s.direction === 'up' ? 'UP' : 'DN') + ' U';
    } else {
      labelText = s.direction === 'up' ? 'UP' : 'DN';
    }

    var lx = ctx.cx;
    var ly = ctx.cy + 4;

    var attrs = {
      x: lx, y: ly,
      'text-anchor': 'middle', 'font-size': 10,
      fill: '#555', 'pointer-events': 'none',
    };

    // 逆回転でラベルを常に水平に
    if (rotation !== 0) {
      attrs.transform = 'rotate(' + (-rotation) + ' ' + lx + ' ' + (ly - 4) + ')';
    }

    var label = svg('text', attrs);
    label.textContent = labelText;
    g.appendChild(label);
  }

  // --- マウスイベント ---
  function onMouseDown(e, gridPos) {
    if (FPE.ToolManager.getTool() !== 'stairs') return;
    isDragging = true;
    dragStart = FPE.Snap.point(gridPos.x, gridPos.y);
  }

  function onMouseMove(e, gridPos) {
    if (!isDragging) return;
    var layer = document.getElementById('layer-preview');
    layer.innerHTML = '';
    var G = FPE.CONST.GRID_PX;
    var snapped = FPE.Snap.point(gridPos.x, gridPos.y);
    var x = Math.min(dragStart.x, snapped.x);
    var y = Math.min(dragStart.y, snapped.y);
    var w = Math.abs(snapped.x - dragStart.x);
    var h = Math.abs(snapped.y - dragStart.y);

    var rect = svg('rect', {
      x: x * G, y: y * G,
      width: w * G, height: h * G,
      fill: 'rgba(158,158,158,0.3)',
      stroke: '#999', 'stroke-width': 1, 'stroke-dasharray': '4,2',
      'pointer-events': 'none',
    });
    layer.appendChild(rect);
  }

  function onMouseUp(e, gridPos) {
    if (!isDragging) return;
    isDragging = false;
    var snapped = FPE.Snap.point(gridPos.x, gridPos.y);
    var x = Math.min(dragStart.x, snapped.x);
    var y = Math.min(dragStart.y, snapped.y);
    var w = FPE.Snap.size(Math.abs(snapped.x - dragStart.x));
    var h = FPE.Snap.size(Math.abs(snapped.y - dragStart.y));

    if (w >= 0.5 && h >= 0.5) {
      var s = FPE.DataModel.addStairs({
        x: x, y: y, width: w, height: h,
        direction: 'up',
        stairType: 'straight',
        rotation: 0,
        linkedStairsId: null,
      });
      render();
      FPE.SelectionManager.select(s.id, 'stairs');
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
      FPE.ToolManager.setTool('select');
    }
    var preview = document.getElementById('layer-preview');
    if (preview) preview.innerHTML = '';
  }

  /** 他階との階段連動 */
  function linkStairs(stairsId, otherFloor) {
    var s = FPE.DataModel.findStairs(stairsId);
    if (!s) return;

    var data = FPE.DataModel.getData();
    var otherFloorData = data.floors[otherFloor];
    if (!otherFloorData) return;

    var linked = {
      id: null,
      x: s.x, y: s.y, width: s.width, height: s.height,
      direction: s.direction === 'up' ? 'down' : 'up',
      stairType: s.stairType || 'straight',
      rotation: s.rotation || 0,
      linkedStairsId: stairsId,
    };

    var currentFloor = FPE.FloorManager.currentFloor();
    FPE.FloorManager.setFloor(otherFloor);
    var added = FPE.DataModel.addStairs(linked);
    FPE.FloorManager.setFloor(currentFloor);

    FPE.DataModel.updateStairs(stairsId, { linkedStairsId: added.id });
  }

  return {
    init: init,
    render: render,
    onMouseDown: onMouseDown,
    onMouseMove: onMouseMove,
    onMouseUp: onMouseUp,
    linkStairs: linkStairs,
  };
})();
// boundary-manager.js - 敷地境界ポリゴン
window.FPE = window.FPE || {};

FPE.BoundaryManager = (function () {
  var isDrawing = false;
  var tempVertices = [];
  var isDraggingVertex = false;
  var dragVertexIndex = -1;
  var dragOrigPos = null;

  function init() {}

  function render() {
    var layer = document.getElementById('layer-boundary');
    if (!layer) return;
    layer.innerHTML = '';

    var boundary = FPE.DataModel.getSiteBoundary();
    if (!boundary || !boundary.vertices || boundary.vertices.length < 2) return;

    var G = FPE.CONST.GRID_PX;
    var verts = boundary.vertices;

    // ポリゴン
    if (verts.length >= 3) {
      var points = verts.map(function (v) {
        return (v.x * G) + ',' + (v.y * G);
      }).join(' ');

      var polygon = FPE.GridRenderer.createSVG('polygon', {
        points: points,
        fill: 'rgba(76,175,80,0.08)',
        stroke: FPE.CONST.COLOR_BOUNDARY,
        'stroke-width': 2,
        'stroke-dasharray': '8,4',
        'pointer-events': 'none',
      });
      layer.appendChild(polygon);
    } else if (verts.length === 2) {
      // 2点のみ: 線
      var line = FPE.GridRenderer.createSVG('line', {
        x1: verts[0].x * G, y1: verts[0].y * G,
        x2: verts[1].x * G, y2: verts[1].y * G,
        stroke: FPE.CONST.COLOR_BOUNDARY,
        'stroke-width': 2, 'stroke-dasharray': '8,4',
      });
      layer.appendChild(line);
    }

    // 頂点ハンドル
    var isBoundaryTool = FPE.ToolManager.getTool() === 'boundary';
    verts.forEach(function (v, i) {
      var circle = FPE.GridRenderer.createSVG('circle', {
        cx: v.x * G, cy: v.y * G, r: isBoundaryTool ? 6 : 4,
        fill: '#fff', stroke: FPE.CONST.COLOR_BOUNDARY, 'stroke-width': 2,
        cursor: isBoundaryTool ? 'move' : 'default',
        'data-vertex-index': i,
      });
      circle.classList.add('boundary-vertex');
      layer.appendChild(circle);
    });

    // 辺の中点（頂点挿入用）
    if (isBoundaryTool && verts.length >= 2) {
      for (var i = 0; i < verts.length; i++) {
        var j = (i + 1) % verts.length;
        var mx = (verts[i].x + verts[j].x) / 2;
        var my = (verts[i].y + verts[j].y) / 2;
        var midCircle = FPE.GridRenderer.createSVG('circle', {
          cx: mx * G, cy: my * G, r: 4,
          fill: FPE.CONST.COLOR_BOUNDARY, 'fill-opacity': 0.4,
          stroke: 'none', cursor: 'pointer',
          'data-midpoint-after': i,
        });
        midCircle.classList.add('boundary-midpoint');
        layer.appendChild(midCircle);
      }
    }

    // 描画中のプレビュー線
    if (isDrawing && tempVertices.length > 0) {
      // 描画済み頂点を表示
      tempVertices.forEach(function (v) {
        var c = FPE.GridRenderer.createSVG('circle', {
          cx: v.x * G, cy: v.y * G, r: 5,
          fill: FPE.CONST.COLOR_BOUNDARY, stroke: '#fff', 'stroke-width': 1,
        });
        layer.appendChild(c);
      });
    }
  }

  function onMouseDown(e, gridPos) {
    if (FPE.ToolManager.getTool() !== 'boundary') return;

    // 中点クリック → 頂点挿入
    if (e.target.classList.contains('boundary-midpoint')) {
      var afterIdx = parseInt(e.target.dataset.midpointAfter);
      var boundary = FPE.DataModel.getSiteBoundary();
      var verts = boundary.vertices;
      var i = afterIdx;
      var j = (i + 1) % verts.length;
      var newV = {
        x: FPE.Snap.toGrid((verts[i].x + verts[j].x) / 2),
        y: FPE.Snap.toGrid((verts[i].y + verts[j].y) / 2),
      };
      verts.splice(j === 0 ? verts.length : j, 0, newV);
      FPE.DataModel.setSiteBoundary(verts);
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
      render();
      return;
    }

    // 頂点ドラッグ
    if (e.target.classList.contains('boundary-vertex')) {
      isDraggingVertex = true;
      dragVertexIndex = parseInt(e.target.dataset.vertexIndex);
      var v = FPE.DataModel.getSiteBoundary().vertices[dragVertexIndex];
      dragOrigPos = { x: v.x, y: v.y };
      return;
    }

    // 新規頂点追加
    var boundary = FPE.DataModel.getSiteBoundary();
    var snapped = e.altKey
      ? { x: gridPos.x, y: gridPos.y }
      : FPE.Snap.point(gridPos.x, gridPos.y);

    if (!boundary.vertices) boundary.vertices = [];
    boundary.vertices.push(snapped);
    FPE.DataModel.setSiteBoundary(boundary.vertices);
    if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
    render();
  }

  function onMouseMove(e, gridPos) {
    if (isDraggingVertex) {
      var snapped = e.altKey
        ? { x: gridPos.x, y: gridPos.y }
        : FPE.Snap.point(gridPos.x, gridPos.y);
      var verts = FPE.DataModel.getSiteBoundary().vertices;
      verts[dragVertexIndex] = snapped;
      FPE.DataModel.setSiteBoundary(verts);
      render();
    }
  }

  function onMouseUp(e) {
    if (isDraggingVertex) {
      isDraggingVertex = false;
      if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
    }
  }

  return {
    init: init,
    render: render,
    onMouseDown: onMouseDown,
    onMouseMove: onMouseMove,
    onMouseUp: onMouseUp,
  };
})();
// floor-manager.js - 1F/2F切替
window.FPE = window.FPE || {};

FPE.FloorManager = (function () {
  var current = '1F';

  function init() {
    updateButtons();
  }

  function currentFloor() { return current; }

  function setFloor(floorId) {
    if (floorId !== '1F' && floorId !== '2F') return;
    current = floorId;
    updateButtons();
    FPE.SelectionManager.deselect();
    renderAll();
    FPE.DataModel.emit('floor-changed', current);
  }

  function updateButtons() {
    document.querySelectorAll('.floor-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.floor === current);
    });
  }

  function renderAll() {
    FPE.RoomManager.render();
    FPE.StairsManager.render();
    FPE.WallManager.renderWalls();
    FPE.BoundaryManager.render();
  }

  return {
    init: init,
    currentFloor: currentFloor,
    setFloor: setFloor,
    renderAll: renderAll,
  };
})();
// history-manager.js - Undo/Redo
window.FPE = window.FPE || {};

FPE.HistoryManager = (function () {
  var undoStack = [];
  var redoStack = [];
  var MAX_HISTORY = 50;

  function init() {
    window.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    });
    // 初期状態をスナップショット
    snapshot();
  }

  function snapshot() {
    var data = FPE.DataModel.getData();
    if (!data) return;
    var json = JSON.stringify(data);
    // 直前と同じならスキップ
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === json) return;
    undoStack.push(json);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateButtons();
  }

  function undo() {
    if (undoStack.length <= 1) return;
    var current = undoStack.pop();
    redoStack.push(current);
    var prev = undoStack[undoStack.length - 1];
    restore(prev);
    updateButtons();
  }

  function redo() {
    if (redoStack.length === 0) return;
    var next = redoStack.pop();
    undoStack.push(next);
    restore(next);
    updateButtons();
  }

  function restore(json) {
    var data = JSON.parse(json);
    FPE.DataModel.setData(data);
    FPE.DataModel.syncCounters();
    FPE.SelectionManager.deselect();
    FPE.FloorManager.renderAll();
  }

  function updateButtons() {
    var undoBtn = document.getElementById('btn-undo');
    var redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = undoStack.length <= 1;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  return {
    init: init,
    snapshot: snapshot,
    undo: undo,
    redo: redo,
  };
})();
// file-io.js - JSON保存/読込
window.FPE = window.FPE || {};

FPE.FileIO = (function () {
  function init() {}

  /** JSONファイルとしてダウンロード */
  function save() {
    var data = FPE.DataModel.getData();
    if (!data) return;
    data.metadata.updatedAt = new Date().toISOString();
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (data.metadata.projectName || 'floor-plan') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** JSONファイルを読み込み */
  function load() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (evt) {
        try {
          var data = JSON.parse(evt.target.result);
          if (!data.version || !data.floors) {
            alert('無効なファイル形式です');
            return;
          }
          FPE.DataModel.setData(data);
          FPE.DataModel.syncCounters();
          FPE.SelectionManager.deselect();
          FPE.FloorManager.setFloor('1F');
          FPE.FloorManager.renderAll();
          if (FPE.HistoryManager) FPE.HistoryManager.snapshot();

          // プロジェクト名を更新
          var nameInput = document.getElementById('project-name');
          if (nameInput) nameInput.value = data.metadata.projectName || '';
        } catch (err) {
          alert('ファイルの読み込みに失敗しました: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  return {
    init: init,
    save: save,
    load: load,
  };
})();
// ui.js - DOM操作（ツールバー、パネル、イベント接続）（複数選択対応）
window.FPE = window.FPE || {};

FPE.UI = (function () {
  var svg = null;

  function init() {
    svg = document.getElementById('main-svg');
    bindToolButtons();
    bindFloorButtons();
    bindHeaderButtons();
    bindSVGEvents();
    buildPresetPanel();
    bindProjectName();
  }

  function bindToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tool = btn.dataset.tool;
        if (tool) FPE.ToolManager.setTool(tool);
      });
    });

    var subBtns = document.querySelectorAll('.sub-mode-btn');
    subBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        FPE.ToolManager.setSubMode(btn.dataset.submode);
        subBtns.forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
      });
    });
  }

  function bindFloorButtons() {
    document.querySelectorAll('.floor-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FPE.FloorManager.setFloor(btn.dataset.floor);
      });
    });
  }

  function bindHeaderButtons() {
    var undoBtn = document.getElementById('btn-undo');
    var redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.addEventListener('click', function () { FPE.HistoryManager.undo(); });
    if (redoBtn) redoBtn.addEventListener('click', function () { FPE.HistoryManager.redo(); });

    var saveBtn = document.getElementById('btn-save');
    var loadBtn = document.getElementById('btn-load');
    if (saveBtn) saveBtn.addEventListener('click', function () { FPE.FileIO.save(); });
    if (loadBtn) loadBtn.addEventListener('click', function () { FPE.FileIO.load(); });

    var zoomIn = document.getElementById('btn-zoom-in');
    var zoomOut = document.getElementById('btn-zoom-out');
    var zoomReset = document.getElementById('btn-zoom-reset');
    if (zoomIn) zoomIn.addEventListener('click', function () {
      FPE.Viewport.setZoom(FPE.Viewport.getZoom() + 0.1);
    });
    if (zoomOut) zoomOut.addEventListener('click', function () {
      FPE.Viewport.setZoom(FPE.Viewport.getZoom() - 0.1);
    });
    if (zoomReset) zoomReset.addEventListener('click', function () {
      FPE.Viewport.setZoom(1.0);
      FPE.Viewport.setPan(60, 60);
    });

    // ヘルプモーダル
    var helpModal = document.getElementById('help-modal');
    var btnHelp = document.getElementById('btn-help');
    var btnHelpClose = document.getElementById('btn-help-close');
    if (btnHelp && helpModal) {
      btnHelp.addEventListener('click', function () {
        helpModal.style.display = 'flex';
      });
      btnHelpClose.addEventListener('click', function () {
        helpModal.style.display = 'none';
      });
      helpModal.addEventListener('click', function (e) {
        if (e.target === helpModal) helpModal.style.display = 'none';
      });
      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && helpModal.style.display !== 'none') {
          helpModal.style.display = 'none';
        }
      });
    }
  }

  function bindSVGEvents() {
    svg.addEventListener('mousedown', function (e) {
      if (FPE.Viewport.isSpaceDown() || e.button === 1) return;
      if (e.button !== 0) return;
      var gridPos = FPE.Viewport.screenToGrid(e.clientX, e.clientY);
      var tool = FPE.ToolManager.getTool();

      if (tool === 'select') {
        // 部屋・階段・空白すべてRoomManagerに委譲（Ctrl対応・矩形選択含む）
        FPE.RoomManager.onMouseDown(e, gridPos);
      } else if (tool === 'room') {
        FPE.RoomManager.onMouseDown(e, gridPos);
      } else if (tool === 'stairs') {
        FPE.StairsManager.onMouseDown(e, gridPos);
      } else if (tool === 'boundary') {
        FPE.BoundaryManager.onMouseDown(e, gridPos);
      } else if (tool === 'opening') {
        FPE.WallManager.onWallClick(e, gridPos);
      }
    });

    svg.addEventListener('mousemove', function (e) {
      if (FPE.Viewport.getIsPanning()) return;
      var gridPos = FPE.Viewport.screenToGrid(e.clientX, e.clientY);
      var tool = FPE.ToolManager.getTool();

      if (tool === 'room' || tool === 'select') {
        FPE.RoomManager.onMouseMove(e, gridPos);
      } else if (tool === 'stairs') {
        FPE.StairsManager.onMouseMove(e, gridPos);
      } else if (tool === 'boundary') {
        FPE.BoundaryManager.onMouseMove(e, gridPos);
      }
    });

    svg.addEventListener('mouseup', function (e) {
      if (e.button !== 0) return;
      var gridPos = FPE.Viewport.screenToGrid(e.clientX, e.clientY);
      var tool = FPE.ToolManager.getTool();

      if (tool === 'room' || tool === 'select') {
        FPE.RoomManager.onMouseUp(e, gridPos);
      } else if (tool === 'stairs') {
        FPE.StairsManager.onMouseUp(e, gridPos);
      } else if (tool === 'boundary') {
        FPE.BoundaryManager.onMouseUp(e);
      }
    });

    // Delete/Backspace で選択中オブジェクトを一括削除
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        var count = FPE.SelectionManager.getSelectedCount();
        if (count === 0) return;

        if (count > 1) {
          // 複数選択 → 一括削除
          FPE.SelectionManager.deleteAllSelected();
        } else {
          // 単一選択 → 従来通り
          var id = FPE.SelectionManager.getSelectedId();
          var type = FPE.SelectionManager.getSelectedType();
          if (!id) return;
          if (type === 'room') {
            FPE.DataModel.removeRoom(id);
            FPE.SelectionManager.deselect();
            FPE.RoomManager.render();
            if (FPE.WallManager) FPE.WallManager.generateWalls();
            if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
          } else if (type === 'stairs') {
            FPE.DataModel.removeStairs(id);
            FPE.SelectionManager.deselect();
            FPE.StairsManager.render();
            if (FPE.HistoryManager) FPE.HistoryManager.snapshot();
          }
        }
      }
    });
  }

  function buildPresetPanel() {
    var container = document.getElementById('preset-list');
    if (!container) return;
    FPE.CONST.ROOM_PRESETS.forEach(function (preset) {
      var btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.innerHTML = '<span class="preset-color" style="background:' + preset.color + '"></span>' +
        preset.name;
      btn.addEventListener('click', function () {
        FPE.RoomManager.addPreset(preset);
      });
      container.appendChild(btn);
    });
  }

  function bindProjectName() {
    var input = document.getElementById('project-name');
    if (!input) return;
    input.addEventListener('change', function () {
      var data = FPE.DataModel.getData();
      if (data) data.metadata.projectName = input.value;
    });
  }

  return {
    init: init,
  };
})();
// app.js - エントリポイント・初期化
window.FPE = window.FPE || {};

(function () {
  window.addEventListener('DOMContentLoaded', function () {
    // データモデル初期化
    FPE.DataModel.createEmpty();

    // ビューポート初期化
    var svg = document.getElementById('main-svg');
    FPE.Viewport.init(svg);
    FPE.Viewport.setPan(60, 60);

    // グリッド描画
    FPE.GridRenderer.init();

    // マネージャ初期化
    FPE.RoomManager.init();
    FPE.WallManager.init();
    FPE.StairsManager.init();
    FPE.BoundaryManager.init();
    FPE.FloorManager.init();
    FPE.FileIO.init();
    FPE.HistoryManager.init();

    // UI接続
    FPE.UI.init();

    // ツール初期状態
    FPE.ToolManager.setTool('select');

    // 初期レンダリング
    FPE.FloorManager.renderAll();
  });
})();
