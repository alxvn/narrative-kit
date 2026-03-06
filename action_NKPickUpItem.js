// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKPickUpItem" description="NK - Pick up item v2.0">
        <property name="duration" type="int" default="300" />
        <property name="actionOnComplete" type="action" default="" />
        <property name="pickUpTargetNode" type="scenenode" default="" />
    </action>
*/

var okeEventHandler,OkeEventHandler=function(){this.eventHandlers=[],this.lastTime=null,this.currentTime=null,this.dt=null,this.nullCount=0};OkeEventHandler.prototype.updateDt=function(){return this.currentTime=Date.now(),this.dt=this.currentTime-this.lastTime,this.dt>200&&(this.dt=200),this.lastTime=this.currentTime,this},OkeEventHandler.prototype.registerEvent=function(e){this.eventHandlers.push(e)},OkeEventHandler.prototype.unregisterEvent=function(e){for(var t=0;t<this.eventHandlers.length;t++)if(this.eventHandlers[t]===e)return this.eventHandlers[t]=null,void(this.nullCount+=1)},OkeEventHandler.prototype.clearAllEvents=function(){this.eventHandlers.length=0,this.nullCount=0},OkeEventHandler.prototype.cleanUpDoneEvents=function(){if(this.nullCount>15){this.nullCount=0;for(var e=[],t=0;t<this.eventHandlers.length;t++)null!==this.eventHandlers[t]&&e.push(this.eventHandlers[t]);this.eventHandlers=e}},OkeEventHandler.prototype.executeEvents=function(){for(var e=0;e<this.eventHandlers.length;e++)null!==this.eventHandlers[e]&&this.eventHandlers[e](this.dt);return this},okeEventHandler||(print("Global event manager initialized!"),(okeEventHandler=new OkeEventHandler).lastTime=Date.now(),ccbRegisterOnFrameEvent((function(){okeEventHandler.updateDt().executeEvents().cleanUpDoneEvents()})));

action_NKPickUpItem = function () { }

action_NKPickUpItem.prototype.execute = function (node) {
    if (node) {
        var targetPos;

        if (ccbGetSceneNodeProperty(this.pickUpTargetNode, 'Type') !== 'unknown') {
            targetPos = ccbGetSceneNodeProperty(this.pickUpTargetNode, 'PositionAbs');
        } else {
            targetPos = ccbGetSceneNodeProperty(interactablesManager.playerNode, 'PositionAbs');
        }

        var func = this.generatePickUpFunction(node, this.duration, this.actionOnComplete, targetPos);
        okeEventHandler.registerEvent(func);
    }
};

action_NKPickUpItem.prototype.generatePickUpFunction = function (nodeToPickUp, duration, actionOnComplete, targetPos) {
    if (!nodeToPickUp) {
        print('Node not found');
    }
    
    function easeInExpo(x) {
        return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
    }

    function lerp(prev, next, delta) {
        return prev + delta * (next - prev);
    }

    var initPos = ccbGetSceneNodeProperty(nodeToPickUp, 'PositionAbs');
    var deltaAcc = 0;
    
    return function inner(dt) {
        deltaAcc += dt;
        if (deltaAcc > duration) {
            ccbInvokeAction(actionOnComplete, nodeToPickUp);
            okeEventHandler.unregisterEvent(inner);
            return;
        }
        var k = easeInExpo(deltaAcc / duration);

        var newPos = new vector3d(
            lerp(initPos.x, targetPos.x, k),
            lerp(initPos.y, targetPos.y, k),
            lerp(initPos.z, targetPos.z, k)
        );
        ccbSetSceneNodeProperty(nodeToPickUp, 'Position', newPos);
    }
}
