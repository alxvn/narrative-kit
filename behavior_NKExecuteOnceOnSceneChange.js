// The following embedded xml is for the editor and describes how the behavior can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <behavior jsname="behavior_NKExecuteOnceOnSceneChange" description="NK - Execute once on scene switch v2.0">
        <property name="variableName" type="string" default="" />
        <property name="variableValue" type="string" default="" />
        <property name="actionToExecute" type="action" default="" />
    </behavior>
*/

var behavior_NKExecuteOnceOnSceneChange = function () {
    this.registeredStateId = -1;
};

behavior_NKExecuteOnceOnSceneChange.prototype.onAnimate = function (node, timeMs) {
    if (interactablesManager.stateId !== this.registeredStateId) {
        this.registeredStateId = interactablesManager.stateId;
        if (ccbGetCopperCubeVariable(this.variableName) == this.variableValue) {
            ccbInvokeAction(this.actionToExecute, node);
        }
    }
}
