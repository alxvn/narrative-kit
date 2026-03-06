// The following embedded xml is for the editor and describes how the behavior can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <behavior jsname="behavior_NKFlowPuzzle" description="NK - Flow Puzzle v2.0">
        <property name="successCombination" type="string" default="" />
        <property name="combinationDelimeter" type="string" default="" />
        <property name="errorOnIncorrectCombination" type="bool" default="true" />
        <property name="delayAfterPinCheck" type="int" default="800" />
        <property name="registerButtons" type="action" default="" />
        <property name="actionOnCombinationCheck" type="action" default="" />
        <property name="actionOnSuccess" type="action" default="" />
        <property name="actionOnSuccessAfterCheck" type="action" default="" />
        <property name="actionOnError" type="action" default="" />
        <property name="actionOnKeyPress" type="action" default="" />
        <property name="clearButton" type="scenenode" default="" />
        <property name="submitButton" type="scenenode" default="" />
        <property name="inputFieldNode" type="scenenode" default="" />
        <property name="targetAspect" type="string" default="16:9" />
        <property name="widthFixFolder" type="string" default="width_fix" />
    </behavior>
*/

/**
 * @typedef OkeokeKeyNode
 * @property { ccbNode } node
 * @property { string } value
 * @property { boolean } isClearBtn
 * @property { boolean } isSubmitBtn
 */

/**
 * @typedef TriggerBox
 * @property { number } x
 * @property { number } y
 * @property { number } width
 * @property { number } height
 * @property { string } value
 * @property { boolean } isClearBtn
 * @property { boolean } isSubmitBtn
 */

// global variable to share with actions
/**
 * @type { OkeokeKeyNode[] }
 */
var okeokeKeyLockButtons;

var behavior_NKFlowPuzzle = function () {
    this.registeredStateId = -1;
    this.lastWidth = null;
    this.lastHeight = null;
    this.mouseEventNextFrame = false;
    this.inputFieldCurrentValues = [];

    this.enabled = true;
};

behavior_NKFlowPuzzle.prototype.onAnimate = function (node, timeMs) {
    this.lastWidth = ccbGetScreenWidth();
    this.lastHeight = ccbGetScreenHeight();

    /**
     * @type { TriggerBox[] }
     */
    this.triggerBoxes = [];
    this.expectedCombination = this.successCombination.split(this.combinationDelimeter);
    this.isSubmitButtonPresented = ccbGetSceneNodeProperty(this.submitButton, 'Type') !== 'unknown';

    this.scaleSceneToWideScreenView();

    this.onAnimate = this.main;
    return true;
}

behavior_NKFlowPuzzle.prototype.main = function (node, timeMs) {
    if (interactablesManager.stateId !== this.registeredStateId) {
        this.registeredStateId = interactablesManager.stateId;
        this.resetBehavior();
        this.registerAllActions(node);
        this.mapTriggerZones();
    }

    ccbSetCursorVisible(true);

    if (!this.enabled) return false;

    var mousePos = new vector3d(ccbGetMousePosX() * 100 / ccbGetScreenWidth(), ccbGetMousePosY() * 100 / ccbGetScreenHeight(), 0);

    var curBtnHovered = null;

    for (var i = 0; i < this.triggerBoxes.length; i++) {
        var triggerBox = this.triggerBoxes[i];
        if (this.isPointInRectangle(mousePos.x, mousePos.y, triggerBox.x, triggerBox.y, triggerBox.width, triggerBox.height)) {
            curBtnHovered = triggerBox;
            break;
        }
    }

    if (this.mouseEventNextFrame && curBtnHovered && curBtnHovered.value !== null) {
        ccbInvokeAction(this.actionOnKeyPress, node);
        this.inputFieldCurrentValues.push(curBtnHovered.value);

        // Not sure
        if (this.inputFieldCurrentValues.length > this.expectedCombination.length) {
            this.inputFieldCurrentValues.shift();
        }

        if (!this.isSubmitButtonPresented && this.errorOnIncorrectCombination && this.expectedCombination.length === this.inputFieldCurrentValues.length) {
            this.checkResult(node);
        }

        if (ccbGetSceneNodeProperty(this.inputFieldNode, 'Type') !== 'unknown') {
            ccbSetSceneNodeProperty(this.inputFieldNode, 'Text', this.inputFieldCurrentValues.join(''));
        }
        this.mouseEventNextFrame = false;
    }

    if (this.clearButton && curBtnHovered && curBtnHovered.isClearBtn && this.mouseEventNextFrame) {
        // also invoke action for clear button
        ccbInvokeAction(this.actionOnKeyPress, node);
        if (this.inputFieldCurrentValues.length > 0) {
            this.inputFieldCurrentValues.pop();
        }
        if (ccbGetSceneNodeProperty(this.inputFieldNode, 'Type') !== 'unknown') {
            ccbSetSceneNodeProperty(this.inputFieldNode, 'Text', this.inputFieldCurrentValues.join(''));
        }
        this.mouseEventNextFrame = false;
    }

    
    if (this.isSubmitButtonPresented && curBtnHovered && curBtnHovered.isSubmitBtn && this.mouseEventNextFrame) {
        ccbInvokeAction(this.actionOnCombinationCheck, node);
        this.checkResult(node);
        this.mouseEventNextFrame = false;
    }

    // reset event
    this.mouseEventNextFrame = false;
}

behavior_NKFlowPuzzle.prototype.registerAllActions = function (node) {
    okeokeKeyLockButtons = [];
    ccbInvokeAction(this.registerButtons, node);
    if (ccbGetSceneNodeProperty(this.clearButton, 'Type') !== 'unknown') {
        okeokeKeyLockButtons.push({
            node: this.clearButton,
            value: null,
            isClearBtn: true,
            isSubmitBtn: false
        });
    }
    if (ccbGetSceneNodeProperty(this.submitButton, 'Type') !== 'unknown') {
        okeokeKeyLockButtons.push({
            node: this.submitButton,
            value: null,
            isClearBtn: false,
            isSubmitBtn: true
        });
    }
}

behavior_NKFlowPuzzle.prototype.checkResult = function (node) {
    this.enabled = false;
    ccbInvokeAction(this.actionOnCombinationCheck, node);
    if (this.arraysEqual(this.expectedCombination, this.inputFieldCurrentValues)) {
        ccbInvokeAction(this.actionOnSuccess, node);
        setTimeout(function (that, node) {
            ccbInvokeAction(that.actionOnSuccessAfterCheck, node);
            that.resetBehavior();
        }, this.delayAfterPinCheck, [this], node);
    } else {
        ccbInvokeAction(this.actionOnError, node);
        setTimeout(function (that) {
            that.resetBehavior();
        }, this.delayAfterPinCheck, [this]);
    }
}

behavior_NKFlowPuzzle.prototype.mapTriggerZones = function () {
    for (var i = 0; i < okeokeKeyLockButtons.length; i++) {
        var btn = okeokeKeyLockButtons[i];
        this.triggerBoxes.push({
            x: ccbGetSceneNodeProperty(btn.node, 'Pos X (percent)'),
            y: ccbGetSceneNodeProperty(btn.node, 'Pos Y (percent)'),
            width: ccbGetSceneNodeProperty(btn.node, 'Width (percent)'),
            height: ccbGetSceneNodeProperty(btn.node, 'Height (percent)'),
            value: btn.value,
            isClearBtn: btn.isClearBtn,
            isSubmitBtn: btn.isSubmitBtn
        });
    }
}

// 3, 2
behavior_NKFlowPuzzle.prototype.onMouseEvent = function (event) {
    if (event === 3) {
        this.mouseEventNextFrame = true;
    }
}

behavior_NKFlowPuzzle.prototype.isPointInRectangle = function (px, py, rectX, rectY, rectWidth, rectHeight) {
    return px >= rectX && px <= rectX + rectWidth &&
        py >= rectY && py <= rectY + rectHeight;
}

behavior_NKFlowPuzzle.prototype.scaleSceneToWideScreenView = function () {
    var rootNode = ccbGetSceneNodeFromName(this.widthFixFolder);
    if (!rootNode) return;
    
    var screenW = ccbGetScreenWidth();
    var screenH = ccbGetScreenHeight();

    var [tarWidth, tarHeight] = this.targetAspect.split(':');
    var targetAspect = parseInt(tarWidth) / parseInt(tarHeight);

    var virtualWidthPx = screenH * targetAspect;
    var scaleX = virtualWidthPx / screenW;
    var offsetPercent = (scaleX * 100 - 100) / 2;
    this.fixWidthForNodesRecursively(rootNode, scaleX, offsetPercent);
}

behavior_NKFlowPuzzle.prototype.fixWidthForNodesRecursively = function (node, scaleX, offsetPercent) {
    if (ccbGetSceneNodeProperty(node, 'Type') === '2doverlay') {
        var posX = ccbGetSceneNodeProperty(node, 'Pos X (percent)');
        var width = ccbGetSceneNodeProperty(node, 'Width (percent)');

        var newWidth = width * scaleX;
        var newPosX = posX * scaleX - offsetPercent;
 
        ccbSetSceneNodeProperty(node, 'Width (percent)', newWidth);
        ccbSetSceneNodeProperty(node, 'Pos X (percent)', newPosX);
    }

    var childCount = ccbGetSceneNodeChildCount(node);
    for (var i = 0; i < childCount; i++) {
        this.fixWidthForNodesRecursively(ccbGetChildSceneNode(node, i), scaleX, offsetPercent);
    }
}

behavior_NKFlowPuzzle.prototype.arraysEqual = function(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

behavior_NKFlowPuzzle.prototype.resetBehavior = function () {
    this.enabled = true;
    this.inputFieldCurrentValues.length = 0;
    if (ccbGetSceneNodeProperty(this.inputFieldNode, 'Type') !== 'unknown') {
        ccbSetSceneNodeProperty(this.inputFieldNode, 'Text', '');
    }
}
