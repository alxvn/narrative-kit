// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKShowDialogMessage" description="NK - Show dialog message v2.0">
        <property name="dialogText" type="string" default="" />
        <property name="nodeToShow" type="scenenode" default="" />
        <property name="interactionKey" type="string" default="69" />
        <property name="actionOnComplete" type="action" default="" />
        <property name="doNotGiveBackControl" type="bool" default="false" />
    </action>
*/

var action_NKShowDialogMessage = function () {}

action_NKShowDialogMessage.prototype.execute = function (node) {
    var dialogArray = this.dialogText.split('|');

    ccbSetSceneNodeProperty(this.nodeToShow, 'Visible', true);
    if (dialogArray[0]) {
        ccbSetSceneNodeProperty(this.nodeToShow, 'Text', dialogArray[0]);
    }

    ccbRegisterOnFrameEvent(this.buildDialogFunction(this.nodeToShow, dialogArray, this.interactionKey, node, this.actionOnComplete, this.doNotGiveBackControl));
}

/**
 * @param {ccbNode} nodeToShow 
 * @param {string[]} dialogArray 
 * @param {number} interactionKey 
 */
action_NKShowDialogMessage.prototype.buildDialogFunction = function (nodeToShow, dialogArray, interactionKey, node, actionOnComplete, doNotGiveBackControl) {
    var stateCounter = 1;
    return function inner() {
        if (isJustPressed(interactionKey)) {
            if (stateCounter >= dialogArray.length) {
                if (!doNotGiveBackControl) {
                    interactablesManager.scheduleTurnOn();
                }
                ccbSetSceneNodeProperty(nodeToShow, 'Visible', false);
                ccbUnregisterOnFrameEvent(inner);
                if (actionOnComplete) {
                    ccbInvokeAction(actionOnComplete, node);
                }
            } else {
                ccbSetSceneNodeProperty(nodeToShow, 'Text', dialogArray[stateCounter]);
            }
            stateCounter += 1;
        }
    }
}
