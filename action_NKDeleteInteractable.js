// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKDeleteInteractable" description="NK - Delete interactable v2.0">
    </action>
*/

var action_NKDeleteInteractable = function () {}

action_NKDeleteInteractable.prototype.execute = function (node) {
    interactablesManager.unregisterInteractableRelatedToNodeName(ccbGetSceneNodeProperty(node, 'Name'));
    ccbRemoveSceneNode(node);
}
