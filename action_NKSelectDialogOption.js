// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKSelectDialogOption" description="NK - Select Dialog Option v2.0">
        <property name="optionNumber" type="int" default="1" />
    </action>
*/

action_NKSelectDialogOption = function () {}

action_NKSelectDialogOption.prototype.execute = function (node) {
    okeBranchingDialogSelection = parseInt(this.optionNumber);
}
