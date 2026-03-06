// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKGiveBackControl" description="NK - Give back control v2.0">
    </action>
*/

action_NKGiveBackControl = function () {}

action_NKGiveBackControl.prototype.execute = function (node) {
    interactablesManager.scheduleTurnOn();
}
