// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKSwitchToScene" description="NK - Switch to scene v2.0">
        <property name="sceneName" type="string" default="" />
        <property name="pointerNodeName" type="string" default="" />
        <property name="isGameplayScene" type="bool" default="true" />
    </action>
*/

action_NKSwitchToScene = function () {}

action_NKSwitchToScene.prototype.execute = function (node) {
    // whoops
    interactablesManager.scheduleSwitchToAnotherScene(this.sceneName, this.pointerNodeName, !this.isGameplayScene);
}
