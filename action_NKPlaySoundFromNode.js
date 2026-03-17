// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKPlaySoundFromNode" description="NK - Play sound from node v2.0">
        <property name="soundNode" type="scenenode" default="" />
        <property name="looping" type="bool" default="false" />
    </action>
*/

action_NKPlaySoundFromNode = function () {}

action_NKPlaySoundFromNode.prototype.execute = function (node) {
    ccbSetSceneNodeProperty(this.soundNode, 'PlayMode', this.looping ? 'looping' : 'nothing');
    ccbSetSceneNodeProperty(this.soundNode, 'PlayMode', 'play_once');
}
