// The following embedded xml is for the editor and describes how the behavior can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <behavior jsname="behavior_NKRegisterInteractable" description="NK - Register Interactable v2.0">
        <property name="message" type="string" default="Interact [E]" />
        <property name="nodeToShow" type="scenenode" default="false" />
        <property name="actionOnInteract" type="action" default="" />
        <property name="alternativeInteractKey" type="string" default="" />
        <property name="overwriteDetectionDistance" type="string" default="" />
        <property name="conditionalVarName" type="string" default="" />
        <property name="conditionalVarValue" type="string" default="" />
    </behavior>
*/

var behavior_NKRegisterInteractable = function () {
    this.registeredStateId = -1;
};

behavior_NKRegisterInteractable.prototype.onAnimate = function (node, timeMs) {
    if (interactablesManager.stateId !== this.registeredStateId) {
        this.registeredStateId = interactablesManager.stateId;
        var newId = this.generateGUID();
        interactablesManager.registerInteractable({
            action: this.actionOnInteract,
            nodeToShow: ccbGetSceneNodeProperty(this.nodeToShow, 'Type') !== 'unknown' ? this.nodeToShow : null,
            messageText: this.message,
            position: ccbGetSceneNodeProperty(node, 'PositionAbs'),
            nodeName: ccbGetSceneNodeProperty(node, 'Name'),
            node: node,
            id: newId,
            conditionalVarName: this.conditionalVarName,
            conditionalVarValue: this.conditionalVarValue,
            isInactive: false,
            alternativeInteractKey: this.alternativeInteractKey !== '' ? parseInt(this.alternativeInteractKey) : null,
            overwriteDetectionDistanceSquared: parseFloat(this.overwriteDetectionDistance) * parseFloat(this.overwriteDetectionDistance)
        });
    }
}

behavior_NKRegisterInteractable.prototype.generateGUID = function () {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).substr(2, 9)
    );
}