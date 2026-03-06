// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKRegisterFlowPuzzleKey" description="NK - Register Puzzle Flow Key v2.0">
        <property name="sceneNode" type="scenenode" default="" />
        <property name="valueToInput" type="string" default="" />
    </action>
*/

action_NKRegisterFlowPuzzleKey = function () {}

action_NKRegisterFlowPuzzleKey.prototype.execute = function (node) {
    try {
        if (Object.prototype.toString.call(okeokeKeyLockButtons) !== '[object Array]') {
            throw new Error('okeokeKeyLockButtons should be an array.');
        } else {
            okeokeKeyLockButtons.push({
                node: this.sceneNode,
                value: this.valueToInput,
                isClearBtn: false,
                isSubmitBtn: false
            })   
        }
    } catch (e){
        print('"Register Keylock Button" should be only used with Keylock scene behavior.');
        if (e) {
            print(e.message);
        }
    }
    // okeokeKeyLockButtons.push()
}
