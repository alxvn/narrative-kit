// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKShowAndHideNodes" description="NK - Shown and Hide nodes v2.0">
        <property name="nodeToHide0" type="scenenode" default="" />
        <property name="nodeToHide1" type="scenenode" default="" />
        <property name="nodeToHide2" type="scenenode" default="" />
        <property name="nodeToHide3" type="scenenode" default="" />
        <property name="nodeToShow0" type="scenenode" default="" />
        <property name="nodeToShow1" type="scenenode" default="" />
        <property name="nodeToShow2" type="scenenode" default="" />
        <property name="nodeToShow3" type="scenenode" default="" />
    </action>
*/

// setTimeout polyfill also should be here in case it is used without manager extension
var timers;

if (!timers) {
    print('setTimeout is initialized')
    timers = [];
    function setTimeout(fn, ms, args) {
        var executeAt = Date.now() + ms;
        timers.push({
            fn: function () {
                return fn.apply(this, args);
            },
            executeAt: executeAt
        });
    }

    ccbRegisterOnFrameEvent(function () {
        var now = Date.now();
        for (var i = 0; i < timers.length; i++) {
            if (timers[i].executeAt <= now) {
                timers[i].fn();
                // This array remove method is slow for small arrays
                // but I guess you can get OutOfMemory otherwise
                timers.splice(i, 1);
            }
        }
    });
}

action_NKShowAndHideNodes = function () { }

// Meh but I think it make sense to update this only if it works
action_NKShowAndHideNodes.prototype.execute = function (node) {
    var toHide = [];
    var toShow = [];

    for (var i = 0; i < 3; i++) {
        if (ccbGetSceneNodeProperty(this['nodeToHide' + i], 'Type') !== 'unknown') {
            toHide.push(this['nodeToHide' + i]);
        }
        if (ccbGetSceneNodeProperty(this['nodeToShow' + i], 'Type') !== 'unknown') {
            toShow.push(this['nodeToShow' + i]);
        }
    }

    setTimeout(function (toHide, toShow) {
        for (var i = 0; i < toHide.length; i++) {
            ccbSetSceneNodeProperty(toHide[i], 'Visible', false);
        }
        for (var i = 0; i < toShow.length; i++) {
            ccbSetSceneNodeProperty(toShow[i], 'Visible', true);
        }
    }, 0, [toHide, toShow]);
}
