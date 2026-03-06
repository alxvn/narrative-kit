// The following embedded xml is for the editor and describes how the behavior can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <behavior jsname="behavior_NKStaticSmoothUpVectorToUp" description="NK - Static smooth vector to UP v2.0">
    </behavior>
*/

var behavior_NKStaticSmoothUpVectorToUp = function () {
    this.isInit = false;
};

behavior_NKStaticSmoothUpVectorToUp.prototype.onAnimate = function (node, timeMs) {
    if (!this.isInit) {
        this.nodeName = ccbGetSceneNodeProperty(node, 'Name');
        this.isInit = true;
        return false;
    }

    // check if camera is active
    if (ccbGetSceneNodeProperty(ccbGetActiveCamera(), 'Name') === this.nodeName) {
        var currentUpVector = ccbGetSceneNodeProperty(node, 'UpVector');
        currentUpVector.x = this.lerp(currentUpVector.x, 0, 0.033),
        currentUpVector.y = this.lerp(currentUpVector.y, 1, 0.033),
        currentUpVector.z = this.lerp(currentUpVector.z, 0, 0.033)
        ccbSetSceneNodeProperty(node, 'UpVector', currentUpVector);
        return true;
    }

    return false;
}

behavior_NKStaticSmoothUpVectorToUp.prototype.lerp = function (prev, next, delta) {
    return prev + delta * (next - prev);
}