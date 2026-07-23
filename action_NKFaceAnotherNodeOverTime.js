// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKFaceAnotherNodeOverTime" description="NK - Face another node over time (Y-axis only) v2.0">
        <property name="rotatingNode" type="scenenode" default="" />
        <property name="targetNode" type="scenenode" default="" />
        <property name="rotationTime" type="int" default="1000" />
        <property name="actionOnComplete" type="action" default="" />
    </action>
*/
var okeEventHandler,OkeEventHandler=function(){this.eventHandlers=[],this.lastTime=null,this.currentTime=null,this.dt=null,this.nullCount=0};OkeEventHandler.prototype.updateDt=function(){return this.currentTime=Date.now(),this.dt=this.currentTime-this.lastTime,this.dt>200&&(this.dt=200),this.lastTime=this.currentTime,this},OkeEventHandler.prototype.registerEvent=function(e){this.eventHandlers.push(e)},OkeEventHandler.prototype.unregisterEvent=function(e){for(var t=0;t<this.eventHandlers.length;t++)if(this.eventHandlers[t]===e)return this.eventHandlers[t]=null,void(this.nullCount+=1)},OkeEventHandler.prototype.clearAllEvents=function(){this.eventHandlers.length=0,this.nullCount=0},OkeEventHandler.prototype.cleanUpDoneEvents=function(){if(this.nullCount>15){this.nullCount=0;for(var e=[],t=0;t<this.eventHandlers.length;t++)null!==this.eventHandlers[t]&&e.push(this.eventHandlers[t]);this.eventHandlers=e}},OkeEventHandler.prototype.executeEvents=function(){for(var e=0;e<this.eventHandlers.length;e++)null!==this.eventHandlers[e]&&this.eventHandlers[e](this.dt);return this},okeEventHandler||(print("Global event manager initialized!"),(okeEventHandler=new OkeEventHandler).lastTime=Date.now(),ccbRegisterOnFrameEvent((function(){okeEventHandler.updateDt().executeEvents().cleanUpDoneEvents()})));

/**
 * @typedef NodeFaceLink
 * @property {boolean} isActive
 * @property {function} onFrameEvent
 */

/**
 * @type {Object.<string, NodeFaceLink>} 
 */
var allFacingNodes;

if (!allFacingNodes) {
    allFacingNodes = {};
}

action_NKFaceAnotherNodeOverTime = function () {}

action_NKFaceAnotherNodeOverTime.prototype.execute = function (node) {
    var func = this.generateOnFrameEvent(this.targetNode, this.rotatingNode, this.rotationTime, this.actionOnComplete);
    if (func) {
        okeEventHandler.registerEvent(func);
    }
}

action_NKFaceAnotherNodeOverTime.prototype.generateOnFrameEvent = function (targetNode, rotatingNode, rotationTime, actionOnComplete) {
    var nodePos = ccbGetSceneNodeProperty(rotatingNode, 'Position');
    var nodeRot = ccbGetSceneNodeProperty(rotatingNode, 'Rotation');
    var targetPos = ccbGetSceneNodeProperty(targetNode, 'Position');

    var startY = nodeRot.y;
    var targetY = (Math.atan2(targetPos.x - nodePos.x, targetPos.z - nodePos.z)) * 180 / Math.PI;

    if (rotationTime <= 0) {
        ccbSetSceneNodeProperty(rotatingNode, 'Rotation', new vector3d(nodeRot.x, targetY, nodeRot.z));
        ccbInvokeAction(actionOnComplete, rotatingNode);
        return null;
    } else {
        var lerpDegrees = this.lerpDegrees;
        var deltaAcc = 0;
    
        return function inner(dt) {
            deltaAcc += dt;
            if (deltaAcc > rotationTime) {
                ccbInvokeAction(actionOnComplete, rotatingNode);
                okeEventHandler.unregisterEvent(inner);
                return;
            }
            var k = deltaAcc / rotationTime;
            var curVal = lerpDegrees(startY, targetY, k);
            var newRot = new vector3d(nodeRot.x, curVal, nodeRot.z);
            ccbSetSceneNodeProperty(rotatingNode, 'Rotation', newRot);
        }
    }

}

action_NKFaceAnotherNodeOverTime.prototype.lerpDegrees = function (prev, next, delta) {
    var shortestAngle = ((((next - prev) % 360) + 540) % 360) - 180;
    return prev + shortestAngle * delta;
}
