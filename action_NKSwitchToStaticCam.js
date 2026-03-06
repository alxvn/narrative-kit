// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKSwitchToStaticCam" description="NK - Switch to static camera v2.0">
    </action>
*/

action_NKSwitchToStaticCam = function () {}

action_NKSwitchToStaticCam.prototype.execute = function (node) {
    interactablesManager.turnOff();
}
