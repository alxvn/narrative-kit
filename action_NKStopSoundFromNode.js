// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKStopSoundFromNode" description="NK - Stop sound from node v2.0">
        <property name="soundNode" type="scenenode" default="" />
    </action>
*/

action_NKStopSoundFromNode = function () {}

action_NKStopSoundFromNode.prototype.execute = function (node) {
    ccbSetSceneNodeProperty(this.soundNode, 'PlayMode', 'nothing');
}
