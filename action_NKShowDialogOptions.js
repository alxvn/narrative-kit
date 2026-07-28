// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKShowDialogOptions" description="NK - Show dialog options v1.0">
        <property name="dialogText" type="string" default="" />
        <property name="nodeToShow" type="scenenode" default="" />
        <property name="optionAText" type="string" default="Option A" />
        <property name="optionBText" type="string" default="Option B" />
        <property name="interactionKey" type="string" default="13" />
        <property name="actionOnOptionA" type="action" default="" />
        <property name="actionOnOptionB" type="action" default="" />
        <property name="doNotGiveBackControl" type="bool" default="false" />
    </action>
*/

var NK_DIALOG_OPTIONS_KEY_A = 65;
var NK_DIALOG_OPTIONS_KEY_D = 68;
var NK_DIALOG_OPTIONS_KEY_ENTER = 13;
var NK_DIALOG_OPTIONS_ROOT = 'player__static_hud_options';
var NK_DIALOG_OPTIONS_NODE_A = 'player__static_hud_options_option_a';
var NK_DIALOG_OPTIONS_NODE_B = 'player__static_hud_options_option_b';
var NK_DIALOG_OPTIONS_NODE_OVERLAY = 'player__static_hud_options_option_overlay';

/**
 * Shared with behavior_NKOptionsOverlay.
 * @type {{ active: boolean, selected: number, pendingConfirm: boolean }}
 */
var nkDialogOptions;

if (!nkDialogOptions) {
    nkDialogOptions = {
        active: false,
        /** 0 = option A, 1 = option B */
        selected: 0,
        pendingConfirm: false
    };
}

var action_NKShowDialogOptions = function () {}

action_NKShowDialogOptions.prototype.execute = function (node) {
    var rootNode = ccbGetSceneNodeFromName(NK_DIALOG_OPTIONS_ROOT);
    var optionANode = ccbGetSceneNodeFromName(NK_DIALOG_OPTIONS_NODE_A);
    var optionBNode = ccbGetSceneNodeFromName(NK_DIALOG_OPTIONS_NODE_B);
    var overlayNode = ccbGetSceneNodeFromName(NK_DIALOG_OPTIONS_NODE_OVERLAY);

    if (!this.nodeToShow || ccbGetSceneNodeProperty(this.nodeToShow, 'Type') === 'unknown') {
        print('NK Dialog Options: nodeToShow is not set or invalid.');
        return;
    }
    if (!rootNode || !optionANode || !optionBNode || !overlayNode) {
        print('NK Dialog Options: missing option HUD nodes (expected player__static_hud_options and children).');
        return;
    }

    ccbSetSceneNodeProperty(this.nodeToShow, 'Visible', true);
    ccbSetSceneNodeProperty(this.nodeToShow, 'Text', this.dialogText || '');

    ccbSetSceneNodeProperty(optionANode, 'Text', this.optionAText || '');
    ccbSetSceneNodeProperty(optionBNode, 'Text', this.optionBText || '');
    ccbSetSceneNodeProperty(rootNode, 'Visible', true);

    // Default selection is A — snap overlay immediately
    nkDialogOptions.selected = 0;
    nkDialogOptions.pendingConfirm = false;
    nkDialogOptions.active = true;
    ccbSetSceneNodeProperty(
        overlayNode,
        'Pos X (percent)',
        ccbGetSceneNodeProperty(optionANode, 'Pos X (percent)')
    );

    ccbSetCursorVisible(true);

    ccbRegisterOnFrameEvent(this.buildOptionsFunction(
        this.nodeToShow,
        rootNode,
        parseInt(this.interactionKey, 10),
        node,
        this.actionOnOptionA,
        this.actionOnOptionB,
        this.doNotGiveBackControl
    ));
}

/**
 * @param { ccbNode } nodeToShow
 * @param { ccbNode } rootNode
 * @param { number } interactionKey
 * @param { ccbNode } node
 * @param { any } actionOnOptionA
 * @param { any } actionOnOptionB
 * @param { boolean } doNotGiveBackControl
 */
action_NKShowDialogOptions.prototype.buildOptionsFunction = function (
    nodeToShow,
    rootNode,
    interactionKey,
    node,
    actionOnOptionA,
    actionOnOptionB,
    doNotGiveBackControl
) {
    return function inner() {
        ccbSetCursorVisible(true);

        if (typeof isJustPressed !== 'function') {
            return;
        }

        if (isJustPressed(NK_DIALOG_OPTIONS_KEY_A)) {
            nkDialogOptions.selected = 0;
        } else if (isJustPressed(NK_DIALOG_OPTIONS_KEY_D)) {
            nkDialogOptions.selected = 1;
        }

        var confirmByKey = isJustPressed(interactionKey) ||
            isJustPressed(NK_DIALOG_OPTIONS_KEY_ENTER);
        var confirmByClick = nkDialogOptions.pendingConfirm;
        nkDialogOptions.pendingConfirm = false;

        if (!confirmByKey && !confirmByClick) {
            return;
        }

        var selectedAction = nkDialogOptions.selected === 0
            ? actionOnOptionA
            : actionOnOptionB;

        nkDialogOptions.active = false;

        ccbSetSceneNodeProperty(nodeToShow, 'Visible', false);
        ccbSetSceneNodeProperty(rootNode, 'Visible', false);

        ccbUnregisterOnFrameEvent(inner);

        if (selectedAction) {
            ccbInvokeAction(selectedAction, node);
        }

        // Short delay so camera doesn't snap while UI is still tearing down
        if (!doNotGiveBackControl && typeof interactablesManager !== 'undefined') {
            setTimeout(function () {
                interactablesManager.scheduleTurnOn();
            }, 150);
        }
    };
}
