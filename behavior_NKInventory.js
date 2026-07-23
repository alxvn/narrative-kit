// The following embedded xml is for the editor and describes how the behavior can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <behavior jsname="behavior_NKInventory" description="NK - Inventory (SH style) v1.0">
        <property name="closeLookAtOnAnyClick" type="bool" default="true" />
    </behavior>
*/

/**
 * @typedef NkInventoryItem
 * @property { string } id
 * @property { string } name
 * @property { string } desc
 * @property { string } type  quest | medic | bullets
 * @property { number } [stock]
 * @property { number } [maxStock]
 */

var NK_INVENTORY_MEDIC_MAX_STOCK = 3;
var NK_INVENTORY_BULLETS_MAX_STOCK = 10;

/**
 * Item catalog. Edit / extend as needed.
 * Images come from scene nodes named texture__${id} (e.g. texture__lighter).
 * Stock items (medic / bullets) always stay in the inventory array; stock 0 hides them in the UI.
 * @type { Object.<string, NkInventoryItem> }
 */
var nkInventoryItemDefs = {
    lighter: {
        id: 'lighter',
        name: 'Lighter',
        desc: 'An old lighter. Still has some fuel left.',
        type: 'quest'
    },
    medic_pack: {
        id: 'medic_pack',
        name: 'First-aid kits',
        desc: 'A first-aid kit. Restores health when used.',
        type: 'medic',
        stock: 3,
        maxStock: NK_INVENTORY_MEDIC_MAX_STOCK
    },
    bullets: {
        id: 'bullets',
        name: 'Bullets',
        desc: 'Handgun ammunition.',
        type: 'bullets',
        stock: 0,
        maxStock: NK_INVENTORY_BULLETS_MAX_STOCK
    }
};

/**
 * Usage map.
 * Keys: `${interactableNodeName}::${itemId}` or wildcard `***::${itemId}`.
 * Lookup order: exact key first, then wildcard.
 * Wildcards are intended for medic / ammo style items.
 *
 * Stock changes belong here — mutate ctx.item.stock (clamped helpers available).
 * @type { Object.<string, function> }
 */
var nkInventoryUsageMap = {
    '***::medic_pack': function (ctx) {
        print('NK Inventory: used medic pack (placeholder heal), stock=' + ctx.item.stock);
    },
    '***::bullets': function (ctx) {
        print('NK Inventory: used bullets (placeholder reload), stock=' + ctx.item.stock);
    }
    // Quest items: add exact keys like 'some_interactable::lighter'
    // 'candle_unlit::lighter': function (ctx) {
    //     print('NK Inventory: lit the candle');
    //     ctx.scheduleReturnToGameplay();
    // }
};

/**
 * Persistent inventory runtime (survives scene switches).
 * @type {{
 *   items: NkInventoryItem[],
 *   selectedIndex: number,
 *   focusedInteractableName: string,
 *   returnSceneName: string,
 *   returnPointerNodeName: string,
 *   initialized: boolean
 * }}
 */
var nkInventory;

if (!nkInventory) {
    nkInventory = {
        items: [],
        selectedIndex: 0,
        focusedInteractableName: '',
        returnSceneName: '',
        returnPointerNodeName: '',
        initialized: false
    };
}

/**
 * Seed starter items once. Medic / bullets always exist (hidden at stock 0).
 */
function nkInventoryEnsureDefaults() {
    if (nkInventory.initialized) {
        return;
    }
    nkInventory.initialized = true;
    nkInventoryAddItem('lighter');
    nkInventoryEnsureStockItem('medic_pack');
    nkInventoryEnsureStockItem('bullets');
}

/**
 * @param { string } itemId
 * @returns { NkInventoryItem | null }
 */
function nkInventoryGetItemById(itemId) {
    for (var i = 0; i < nkInventory.items.length; i++) {
        if (nkInventory.items[i].id === itemId) {
            return nkInventory.items[i];
        }
    }
    return null;
}

/**
 * Make sure a stock item slot exists in the inventory array.
 * @param { string } itemId
 * @returns { NkInventoryItem | null }
 */
function nkInventoryEnsureStockItem(itemId) {
    var existing = nkInventoryGetItemById(itemId);
    if (existing) {
        return existing;
    }
    nkInventoryAddItem(itemId);
    return nkInventoryGetItemById(itemId);
}

/**
 * @param { NkInventoryItem } item
 * @returns { boolean }
 */
function nkInventoryItemHasStock(item) {
    return item && typeof item.maxStock === 'number';
}

/**
 * Stock items with 0 stock stay in the array but are hidden from the carousel.
 * @param { NkInventoryItem } item
 * @returns { boolean }
 */
function nkInventoryIsItemVisible(item) {
    if (nkInventoryItemHasStock(item)) {
        return item.stock > 0;
    }
    return true;
}

/**
 * @returns { NkInventoryItem[] }
 */
function nkInventoryGetVisibleItems() {
    var visible = [];
    for (var i = 0; i < nkInventory.items.length; i++) {
        if (nkInventoryIsItemVisible(nkInventory.items[i])) {
            visible.push(nkInventory.items[i]);
        }
    }
    return visible;
}

/**
 * @param { NkInventoryItem } item
 * @returns { string }
 */
function nkInventoryFormatItemTitle(item) {
    if (!item) {
        return '';
    }
    if (nkInventoryItemHasStock(item)) {
        return item.name + ' (' + item.stock + ')';
    }
    return item.name;
}

/**
 * Keep selectedIndex valid for the current visible list.
 */
function nkInventoryClampSelection() {
    var visible = nkInventoryGetVisibleItems();
    if (visible.length === 0) {
        nkInventory.selectedIndex = 0;
        return;
    }
    if (nkInventory.selectedIndex >= visible.length) {
        nkInventory.selectedIndex = visible.length - 1;
    }
    if (nkInventory.selectedIndex < 0) {
        nkInventory.selectedIndex = 0;
    }
}

/**
 * @param { string | NkInventoryItem } itemOrId
 */
function nkInventoryAddItem(itemOrId) {
    var item = typeof itemOrId === 'string' ? nkInventoryItemDefs[itemOrId] : itemOrId;
    if (!item || !item.id) {
        print('NK Inventory: cannot add unknown item');
        return;
    }
    var entry = {
        id: item.id,
        name: item.name,
        desc: item.desc,
        type: item.type
    };
    if (typeof item.maxStock === 'number') {
        entry.stock = typeof item.stock === 'number' ? item.stock : 0;
        entry.maxStock = item.maxStock;
    }
    nkInventory.items.push(entry);
}

/**
 * Add first-aid kits, clamped to max stock.
 * @param { number } amount
 * @returns { number } amount actually added
 */
function nkInventoryAddMedicPacks(amount) {
    nkInventoryEnsureDefaults();
    var item = nkInventoryEnsureStockItem('medic_pack');
    if (!item) {
        return 0;
    }
    var add = parseInt(amount, 10);
    if (!add || add < 0) {
        add = 0;
    }
    var room = item.maxStock - item.stock;
    if (room < 0) {
        room = 0;
    }
    if (add > room) {
        add = room;
    }
    item.stock += add;
    return add;
}

/**
 * Add spare bullets, clamped to max stock.
 * Later this will also count rounds already loaded in the gun toward the cap.
 * @param { number } amount
 * @returns { number } amount actually added
 */
function nkInventoryAddBullets(amount) {
    nkInventoryEnsureDefaults();
    var item = nkInventoryEnsureStockItem('bullets');
    if (!item) {
        return 0;
    }
    var add = parseInt(amount, 10);
    if (!add || add < 0) {
        add = 0;
    }
    // TODO: subtract / include ammo currently loaded in the gun when enforcing max
    var room = item.maxStock - item.stock;
    if (room < 0) {
        room = 0;
    }
    if (add > room) {
        add = room;
    }
    item.stock += add;
    return add;
}

/**
 * Removes first matching non-stock item by id. Stock items are never removed — use stock instead.
 * @param { string } itemId
 * @returns { boolean }
 */
function nkInventoryRemoveItem(itemId) {
    for (var i = 0; i < nkInventory.items.length; i++) {
        if (nkInventory.items[i].id === itemId) {
            if (nkInventoryItemHasStock(nkInventory.items[i])) {
                print('NK Inventory: refuse to remove stock item "' + itemId + '", change stock instead');
                return false;
            }
            nkInventory.items.splice(i, 1);
            nkInventoryClampSelection();
            return true;
        }
    }
    return false;
}

/**
 * @param { string } itemId
 * @returns { boolean }
 */
function nkInventoryHasItem(itemId) {
    var item = nkInventoryGetItemById(itemId);
    if (!item) {
        return false;
    }
    if (nkInventoryItemHasStock(item)) {
        return item.stock > 0;
    }
    return true;
}

/**
 * Call before switching into the inventory scene.
 * Return scene is read from CopperCube variable RETURN_SCENE_NAME.
 * @param { string } focusedInteractableName
 * @param { string } returnPointerNodeName
 */
function nkInventoryPrepareOpen(focusedInteractableName, returnPointerNodeName) {
    nkInventoryEnsureDefaults();
    nkInventory.focusedInteractableName = focusedInteractableName || '';
    nkInventory.returnSceneName = ccbGetCopperCubeVariable('RETURN_SCENE_NAME') || '';
    nkInventory.returnPointerNodeName = returnPointerNodeName || '';
    nkInventoryClampSelection();
}

/**
 * Copy Image from texture__${itemId} onto a display overlay node.
 * @param { scenenode } targetNode
 * @param { string } itemId
 */
function nkInventoryApplyItemImage(targetNode, itemId) {
    if (!targetNode) {
        return;
    }
    var textureNode = ccbGetSceneNodeFromName('texture__' + itemId);
    if (!textureNode) {
        print('NK Inventory: missing texture node "texture__' + itemId + '"');
        return;
    }
    ccbSetSceneNodeProperty(targetNode, 'Image', ccbGetSceneNodeProperty(textureNode, 'Image'));
}

/**
 * Resolve use handler: exact `${interactable}::${itemId}` then `***::${itemId}`.
 * @param { string } focusedInteractableName
 * @param { string } itemId
 * @returns { function | null }
 */
function nkInventoryResolveUsage(focusedInteractableName, itemId) {
    var exactKey = (focusedInteractableName || '') + '::' + itemId;
    if (typeof nkInventoryUsageMap[exactKey] === 'function') {
        return nkInventoryUsageMap[exactKey];
    }
    var wildKey = '***::' + itemId;
    if (typeof nkInventoryUsageMap[wildKey] === 'function') {
        return nkInventoryUsageMap[wildKey];
    }
    return null;
}

/**
 * Fade helper shared with open-inventory action. Requires okeEventHandler.
 * @param { string } sceneName
 * @param { string } pointerNodeName
 * @param { boolean } isGameplayScene
 */
function nkInventoryScheduleSwitchToScene(sceneName, pointerNodeName, isGameplayScene) {
    if (!sceneName) {
        print('NK Inventory: scheduleSwitchToScene missing sceneName');
        return;
    }
    if (!interactablesManager) {
        print('NK Inventory: interactablesManager is not registered');
        return;
    }

    var isNotGameplayScene = !isGameplayScene;
    var FADE_COLOR = 0xff000000;
    var FADE_TIME_MS = 500;

    if (typeof okeEventHandler === 'undefined' || !okeEventHandler) {
        interactablesManager.scheduleSwitchToAnotherScene(sceneName, pointerNodeName || '', isNotGameplayScene);
        return;
    }

    var phase = 0;
    var elapsed = 0;

    var fadeFn = function inner(dt) {
        elapsed += dt;

        if (phase === 0) {
            var fadeOutAlpha = (elapsed / FADE_TIME_MS) * 255;
            if (fadeOutAlpha > 255) {
                fadeOutAlpha = 255;
            }
            var fadeOutColor = (Math.floor(fadeOutAlpha) << 24) | (FADE_COLOR & 0x00ffffff);
            ccbDrawColoredRectangle(fadeOutColor, 0, 0, ccbGetScreenWidth(), ccbGetScreenHeight());

            if (elapsed >= FADE_TIME_MS) {
                interactablesManager.scheduleSwitchToAnotherScene(sceneName, pointerNodeName || '', isNotGameplayScene);
                phase = 1;
                elapsed = 0;
            }
        } else if (phase === 1) {
            var fadeInAlpha = (1 - elapsed / FADE_TIME_MS) * 255;
            if (fadeInAlpha < 0) {
                fadeInAlpha = 0;
            }
            var fadeInColor = (Math.floor(fadeInAlpha) << 24) | (FADE_COLOR & 0x00ffffff);
            ccbDrawColoredRectangle(fadeInColor, 0, 0, ccbGetScreenWidth(), ccbGetScreenHeight());

            if (elapsed >= FADE_TIME_MS) {
                okeEventHandler.unregisterEvent(inner);
            }
        }
    };

    // turnOff needs live gameplay cameras/crosshair — skip when already in inventory / non-gameplay
    if (interactablesManager.mode === InteractablesManagerMode.GAMEPLAY) {
        interactablesManager.turnOff();
    }
    okeEventHandler.registerEvent(fadeFn);
}

/**
 * Switch back to the gameplay scene stored in prepareOpen.
 */
function nkInventoryScheduleReturnToGameplay() {
    var returnSceneName = ccbGetCopperCubeVariable('RETURN_SCENE_NAME') || nkInventory.returnSceneName || '';
    if (!returnSceneName) {
        print('NK Inventory: RETURN_SCENE_NAME is empty');
        return;
    }
    nkInventoryScheduleSwitchToScene(
        returnSceneName,
        nkInventory.returnPointerNodeName,
        true
    );
}

/**
 * Carousel neighbors with wrap-around.
 * @param { NkInventoryItem[] } arr
 * @param { number } index
 */
function nkInventoryGetCarousel(arr, index) {
    if (!arr || arr.length === 0) {
        return { current: null, left: null, right: null };
    }
    var n = arr.length;
    var i = index % n;
    if (i < 0) {
        i += n;
    }
    if (n === 1) {
        return { current: arr[0], left: null, right: null };
    }
    return {
        current: arr[i],
        left: arr[(i - 1 + n) % n],
        right: arr[(i + 1) % n]
    };
}

var behavior_NKInventory = function () {
    this.nodesCached = false;
    this.mouseEventNextFrame = false;
    this.isLookAtOpen = false;
    this.lookAtIgnoreClickFrames = 0;
    this.lastDrawnSelectedIndex = -1;
    this.lastDrawnItemCount = -1;
    this.lastDrawnSelectedStock = -1;
    /**
     * @type { Object.<string, { x: number, y: number, width: number, height: number, id: string }> }
     */
    this.triggerBoxes = [];
};

behavior_NKInventory.prototype.onAnimate = function (node, timeMs) {
    nkInventoryEnsureDefaults();

    if (!this.nodesCached) {
        this.cacheNodes();
        this.nodesCached = true;
        this.mapTriggerZones();
        this.hideLookAt();
        this.redraw();
        ccbSetCursorVisible(true);
    }

    ccbSetCursorVisible(true);

    if (this.lookAtIgnoreClickFrames > 0) {
        this.lookAtIgnoreClickFrames -= 1;
    }

    var mousePosX = ccbGetMousePosX() * 100 / ccbGetScreenWidth();
    var mousePosY = ccbGetMousePosY() * 100 / ccbGetScreenHeight();
    var hoveredId = this.hitTest(mousePosX, mousePosY);

    if (this.mouseEventNextFrame) {
        this.mouseEventNextFrame = false;

        // Same physical click that opened look-at must not close it immediately
        if (this.isLookAtOpen) {
            if (this.lookAtIgnoreClickFrames > 0) {
                return true;
            }
            if (this.closeLookAtOnAnyClick) {
                this.hideLookAt();
            }
            return true;
        }

        if (hoveredId === 'left') {
            this.moveSelection(-1);
        } else if (hoveredId === 'right') {
            this.moveSelection(1);
        } else if (hoveredId === 'use') {
            this.useSelectedItem();
        } else if (hoveredId === 'look_at') {
            this.showLookAt();
        }
    }

    var visible = nkInventoryGetVisibleItems();
    var selectedStock = -1;
    if (visible.length > 0 && visible[nkInventory.selectedIndex]) {
        selectedStock = typeof visible[nkInventory.selectedIndex].stock === 'number'
            ? visible[nkInventory.selectedIndex].stock
            : -1;
    }

    if (
        this.lastDrawnSelectedIndex !== nkInventory.selectedIndex ||
        this.lastDrawnItemCount !== visible.length ||
        this.lastDrawnSelectedStock !== selectedStock
    ) {
        this.redraw();
    }

    return true;
};

behavior_NKInventory.prototype.onMouseEvent = function (event) {
    // 3 = left mouse down (same convention as other NK behaviors)
    if (event === 3) {
        this.mouseEventNextFrame = true;
    }
};

behavior_NKInventory.prototype.onKeyEvent = function (key, pressed) {
    if (!pressed) {
        return;
    }
    // Esc closes look-at first, then returns to gameplay
    if (key === 27) {
        if (this.isLookAtOpen) {
            this.hideLookAt();
            return;
        }
        nkInventoryScheduleReturnToGameplay();
        return;
    }
    // I also closes inventory (same key often used to open it)
    if (key === 73) {
        if (this.isLookAtOpen) {
            this.hideLookAt();
            return;
        }
        nkInventoryScheduleReturnToGameplay();
    }
};

behavior_NKInventory.prototype.cacheNodes = function () {
    this.nodeSelected = ccbGetSceneNodeFromName('inv_item_selected');
    this.nodeLeft = ccbGetSceneNodeFromName('inv_item_left');
    this.nodeRight = ccbGetSceneNodeFromName('inv_item_right');
    this.nodeLeftOverlay = ccbGetSceneNodeFromName('inv_item_left_overlay');
    this.nodeRightOverlay = ccbGetSceneNodeFromName('inv_item_right_overlay');
    this.nodeTitle = ccbGetSceneNodeFromName('ivn_item_title');
    this.nodeLeftBtn = ccbGetSceneNodeFromName('inv_left_btn');
    this.nodeRightBtn = ccbGetSceneNodeFromName('inv_right_btn');
    this.nodeUseBtn = ccbGetSceneNodeFromName('ivn_use_btn');
    this.nodeLookAtBtn = ccbGetSceneNodeFromName('ivn_look_at_btn');

    this.nodeLookAtFolder = ccbGetSceneNodeFromName('hud__item_look_at');
    this.nodeLookAtOverlayBlack = ccbGetSceneNodeFromName('hud__item_look_at__overay_black');
    this.nodeLookAtPicture = ccbGetSceneNodeFromName('hud__item_look_at__picture');
    this.nodeLookAtDesc = ccbGetSceneNodeFromName('hud__item_look_at__desc');
    this.nodeLookAtName = ccbGetSceneNodeFromName('hud__item_look_at__item_name');
};

behavior_NKInventory.prototype.mapTriggerZones = function () {
    this.triggerBoxes = [];
    this.pushTrigger('left', this.nodeLeftBtn);
    this.pushTrigger('right', this.nodeRightBtn);
    this.pushTrigger('use', this.nodeUseBtn);
    this.pushTrigger('look_at', this.nodeLookAtBtn);
};

/**
 * @param { string } id
 * @param { scenenode } btnNode
 */
behavior_NKInventory.prototype.pushTrigger = function (id, btnNode) {
    if (!btnNode) {
        print('NK Inventory: missing button node for "' + id + '"');
        return;
    }
    this.triggerBoxes.push({
        id: id,
        x: ccbGetSceneNodeProperty(btnNode, 'Pos X (percent)'),
        y: ccbGetSceneNodeProperty(btnNode, 'Pos Y (percent)'),
        width: ccbGetSceneNodeProperty(btnNode, 'Width (percent)'),
        height: ccbGetSceneNodeProperty(btnNode, 'Height (percent)')
    });
};

behavior_NKInventory.prototype.hitTest = function (px, py) {
    for (var i = 0; i < this.triggerBoxes.length; i++) {
        var box = this.triggerBoxes[i];
        if (
            px >= box.x && px <= box.x + box.width &&
            py >= box.y && py <= box.y + box.height
        ) {
            return box.id;
        }
    }
    return null;
};

/**
 * @param { number } delta
 */
behavior_NKInventory.prototype.moveSelection = function (delta) {
    var visible = nkInventoryGetVisibleItems();
    var count = visible.length;
    if (count === 0) {
        return;
    }
    var next = (nkInventory.selectedIndex + delta) % count;
    if (next < 0) {
        next += count;
    }
    nkInventory.selectedIndex = next;
    this.redraw();
};

behavior_NKInventory.prototype.redraw = function () {
    nkInventoryClampSelection();
    var visible = nkInventoryGetVisibleItems();
    var carousel = nkInventoryGetCarousel(visible, nkInventory.selectedIndex);

    if (carousel.current) {
        nkInventoryApplyItemImage(this.nodeSelected, carousel.current.id);
        this.setNodeVisible(this.nodeSelected, true);
        this.setNodeText(this.nodeTitle, nkInventoryFormatItemTitle(carousel.current));
    } else {
        this.setNodeVisible(this.nodeSelected, false);
        this.setNodeText(this.nodeTitle, '');
    }

    if (carousel.left) {
        nkInventoryApplyItemImage(this.nodeLeft, carousel.left.id);
        this.setNodeVisible(this.nodeLeft, true);
        this.setNodeVisible(this.nodeLeftOverlay, false);
    } else {
        this.setNodeVisible(this.nodeLeft, false);
        this.setNodeVisible(this.nodeLeftOverlay, true);
    }

    if (carousel.right) {
        nkInventoryApplyItemImage(this.nodeRight, carousel.right.id);
        this.setNodeVisible(this.nodeRight, true);
        this.setNodeVisible(this.nodeRightOverlay, false);
    } else {
        this.setNodeVisible(this.nodeRight, false);
        this.setNodeVisible(this.nodeRightOverlay, true);
    }

    this.lastDrawnSelectedIndex = nkInventory.selectedIndex;
    this.lastDrawnItemCount = visible.length;
    this.lastDrawnSelectedStock = carousel.current && typeof carousel.current.stock === 'number'
        ? carousel.current.stock
        : -1;
};

behavior_NKInventory.prototype.useSelectedItem = function () {
    var visible = nkInventoryGetVisibleItems();
    var item = visible[nkInventory.selectedIndex];
    if (!item) {
        print('NK Inventory: no item selected');
        return;
    }

    var focused = nkInventory.focusedInteractableName || '';
    var handler = nkInventoryResolveUsage(focused, item.id);
    var ctx = {
        item: item,
        focusedInteractableName: focused,
        scheduleReturnToGameplay: nkInventoryScheduleReturnToGameplay,
        scheduleSwitchToScene: nkInventoryScheduleSwitchToScene,
        removeSelected: function () {
            nkInventoryRemoveItem(item.id);
        }
    };

    if (handler) {
        handler(ctx);
    } else {
        print('NK Inventory: cannot use "' + item.id + '" on "' + focused + '"');
    }

    nkInventoryClampSelection();
    this.redraw();
};

behavior_NKInventory.prototype.showLookAt = function () {
    var visible = nkInventoryGetVisibleItems();
    var item = visible[nkInventory.selectedIndex];
    if (!item) {
        print('NK Inventory: look-at requested but no item selected');
        return;
    }
    if (!this.nodeLookAtFolder) {
        print('NK Inventory: cannot open look-at, hud__item_look_at missing');
        return;
    }

    nkInventoryApplyItemImage(this.nodeLookAtPicture, item.id);
    this.setNodeText(this.nodeLookAtName, nkInventoryFormatItemTitle(item));
    this.setNodeText(this.nodeLookAtDesc, item.desc);

    // Force-show folder + children (children may be individually hidden in the editor)
    this.setNodeVisible(this.nodeLookAtFolder, true);
    this.setNodeVisible(this.nodeLookAtOverlayBlack, true);
    this.setNodeVisible(this.nodeLookAtPicture, true);
    this.setNodeVisible(this.nodeLookAtDesc, true);
    this.setNodeVisible(this.nodeLookAtName, true);

    this.isLookAtOpen = true;
    // Swallow the rest of this click / immediate duplicate mouse events
    this.lookAtIgnoreClickFrames = 2;
    this.mouseEventNextFrame = false;
};

behavior_NKInventory.prototype.hideLookAt = function () {
    this.setNodeVisible(this.nodeLookAtFolder, false);
    this.isLookAtOpen = false;
    this.lookAtIgnoreClickFrames = 0;
};

behavior_NKInventory.prototype.setNodeVisible = function (node, visible) {
    if (node) {
        ccbSetSceneNodeProperty(node, 'Visible', visible);
    }
};

behavior_NKInventory.prototype.setNodeText = function (node, text) {
    if (node) {
        ccbSetSceneNodeProperty(node, 'Text', text);
    }
};
