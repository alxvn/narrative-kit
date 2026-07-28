// The following embedded xml is for the editor and describes how the behavior can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <behavior jsname="behavior_NKOptionsOverlay" description="NK - Dialog options overlay lerp v1.0">
        <property name="lerpSpeed" type="float" default="0.18" />
        <property name="optionANodeName" type="string" default="player__static_hud_options_option_a" />
        <property name="optionBNodeName" type="string" default="player__static_hud_options_option_b" />
    </behavior>
*/

/**
 * Shared with action_NKShowDialogOptions.
 * Declared here so the behavior can be attached even if the action is not yet loaded.
 * @type {{ active: boolean, selected: number, pendingConfirm: boolean }}
 */
var nkDialogOptions;

if (!nkDialogOptions) {
    nkDialogOptions = {
        active: false,
        selected: 0,
        pendingConfirm: false
    };
}

var behavior_NKOptionsOverlay = function () {
    this.optionANode = null;
    this.optionBNode = null;
    this.triggerA = null;
    this.triggerB = null;
    this.nodesCached = false;
    this.mouseEventNextFrame = false;
};

behavior_NKOptionsOverlay.prototype.onAnimate = function (node, timeMs) {
    if (!nkDialogOptions || !nkDialogOptions.active) {
        this.mouseEventNextFrame = false;
        return false;
    }

    if (!this.nodesCached) {
        this.cacheOptionNodes();
    }

    if (!this.optionANode || !this.optionBNode || !this.triggerA || !this.triggerB) {
        return false;
    }

    // Refresh hit boxes each frame — Pos/Size can change with aspect fixes
    this.triggerA = this.readTriggerBox(this.optionANode);
    this.triggerB = this.readTriggerBox(this.optionBNode);

    var mouseX = ccbGetMousePosX() * 100 / ccbGetScreenWidth();
    var mouseY = ccbGetMousePosY() * 100 / ccbGetScreenHeight();
    var hoveringA = this.isPointInRectangle(
        mouseX, mouseY,
        this.triggerA.x, this.triggerA.y, this.triggerA.width, this.triggerA.height
    );
    var hoveringB = this.isPointInRectangle(
        mouseX, mouseY,
        this.triggerB.x, this.triggerB.y, this.triggerB.width, this.triggerB.height
    );

    // Hover highlights the option under the cursor
    if (hoveringA) {
        nkDialogOptions.selected = 0;
    } else if (hoveringB) {
        nkDialogOptions.selected = 1;
    }

    // Click on an option confirms it (action frame handler completes the choice)
    if (this.mouseEventNextFrame) {
        if (hoveringA) {
            nkDialogOptions.selected = 0;
            nkDialogOptions.pendingConfirm = true;
        } else if (hoveringB) {
            nkDialogOptions.selected = 1;
            nkDialogOptions.pendingConfirm = true;
        }
        this.mouseEventNextFrame = false;
    }

    var targetPosX = nkDialogOptions.selected === 0
        ? ccbGetSceneNodeProperty(this.optionANode, 'Pos X (percent)')
        : ccbGetSceneNodeProperty(this.optionBNode, 'Pos X (percent)');

    var currentPosX = ccbGetSceneNodeProperty(node, 'Pos X (percent)');
    var nextPosX = this.lerp(currentPosX, targetPosX, this.lerpSpeed);

    if (Math.abs(targetPosX - nextPosX) < 0.05) {
        nextPosX = targetPosX;
    }

    if (nextPosX !== currentPosX) {
        ccbSetSceneNodeProperty(node, 'Pos X (percent)', nextPosX);
    }

    return true;
}

behavior_NKOptionsOverlay.prototype.onMouseEvent = function (event) {
    // 3 = left mouse down (same convention as NK Flow Puzzle / Inventory)
    if (event === 3) {
        this.mouseEventNextFrame = true;
    }
}

behavior_NKOptionsOverlay.prototype.cacheOptionNodes = function () {
    this.optionANode = ccbGetSceneNodeFromName(this.optionANodeName);
    this.optionBNode = ccbGetSceneNodeFromName(this.optionBNodeName);
    this.nodesCached = true;

    if (this.optionANode) {
        this.triggerA = this.readTriggerBox(this.optionANode);
    }
    if (this.optionBNode) {
        this.triggerB = this.readTriggerBox(this.optionBNode);
    }
}

/**
 * @param { ccbNode } btnNode
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
behavior_NKOptionsOverlay.prototype.readTriggerBox = function (btnNode) {
    return {
        x: ccbGetSceneNodeProperty(btnNode, 'Pos X (percent)'),
        y: ccbGetSceneNodeProperty(btnNode, 'Pos Y (percent)'),
        width: ccbGetSceneNodeProperty(btnNode, 'Width (percent)'),
        height: ccbGetSceneNodeProperty(btnNode, 'Height (percent)')
    };
}

behavior_NKOptionsOverlay.prototype.isPointInRectangle = function (px, py, rectX, rectY, rectWidth, rectHeight) {
    return px >= rectX && px <= rectX + rectWidth &&
        py >= rectY && py <= rectY + rectHeight;
}

behavior_NKOptionsOverlay.prototype.lerp = function (prev, next, delta) {
    return prev + delta * (next - prev);
}
