// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKChangePropertyOverTime" description="NK - Change property over time (Number) v2.0">
        <property name="nodeToUpdate" type="scenenode" default="0" />
        <property name="propertyToUpdate" type="string" default="" />
        <property name="startValue" type="float" default="0" />
        <property name="endValue" type="float" default="1" />
        <property name="duration" type="int" default="300" />
        <property name="easeOnStart" type="bool" default="false" />
        <property name="easeOnEnd" type="bool" default="false" />
        <property name="actionOnComplete" type="action" default="" />
    </action>
*/

var okeEventHandler,OkeEventHandler=function(){this.eventHandlers=[],this.lastTime=null,this.currentTime=null,this.dt=null,this.nullCount=0};OkeEventHandler.prototype.updateDt=function(){return this.currentTime=Date.now(),this.dt=this.currentTime-this.lastTime,this.dt>200&&(this.dt=200),this.lastTime=this.currentTime,this},OkeEventHandler.prototype.registerEvent=function(e){this.eventHandlers.push(e)},OkeEventHandler.prototype.unregisterEvent=function(e){for(var t=0;t<this.eventHandlers.length;t++)if(this.eventHandlers[t]===e)return this.eventHandlers[t]=null,void(this.nullCount+=1)},OkeEventHandler.prototype.clearAllEvents=function(){this.eventHandlers.length=0,this.nullCount=0},OkeEventHandler.prototype.cleanUpDoneEvents=function(){if(this.nullCount>15){this.nullCount=0;for(var e=[],t=0;t<this.eventHandlers.length;t++)null!==this.eventHandlers[t]&&e.push(this.eventHandlers[t]);this.eventHandlers=e}},OkeEventHandler.prototype.executeEvents=function(){for(var e=0;e<this.eventHandlers.length;e++)null!==this.eventHandlers[e]&&this.eventHandlers[e](this.dt);return this},okeEventHandler||(print("Global event manager initialized!"),(okeEventHandler=new OkeEventHandler).lastTime=Date.now(),ccbRegisterOnFrameEvent((function(){okeEventHandler.updateDt().executeEvents().cleanUpDoneEvents()})));

action_NKChangePropertyOverTime = function () { }

action_NKChangePropertyOverTime.prototype.execute = function (node) {
    if (this.nodeToUpdate) {
        var easeFunc = this.getEaseFunction(this.easeOnStart, this.easeOnEnd);
        var func = this.generateUpdateFunc(
            this.nodeToUpdate,
            this.propertyToUpdate,
            this.startValue,
            this.endValue,
            this.duration,
            easeFunc,
            this.actionOnComplete);
        okeEventHandler.registerEvent(func);
    }
};

action_NKChangePropertyOverTime.prototype.getEaseFunction = function (easeOnStart, easeOnEnd) {
    function easeInSine(x) {
        return 1 - Math.cos((x * Math.PI) / 2);
    }

    function easeOutSine(x) {
        return Math.sin((x * Math.PI) / 2);
    }

    function easeInOutSine(x) {
        return -(Math.cos(Math.PI * x) - 1) / 2;
    }

    function linear(x) {
        return x;
    }

    if (easeOnStart && easeOnEnd) return easeInOutSine;
    if (easeOnStart) return easeInSine;
    if (easeOnEnd) return easeOutSine;
    return linear;
};

action_NKChangePropertyOverTime.prototype.generateUpdateFunc = function (nodeToUpdate, propertyToUpdate, startValue, endValue, duration, easeFunc, actionOnComplete) {
    if (!nodeToUpdate) {
        print('Node not found');
    }

    function lerp(prev, next, delta) {
        return prev + delta * (next - prev);
    }

    var deltaAcc = 0;

    return function inner(dt) {
        deltaAcc += dt;
        if (deltaAcc > duration) {
            ccbInvokeAction(actionOnComplete, nodeToUpdate);
            okeEventHandler.unregisterEvent(inner);
            return;
        }
        var k = easeFunc(deltaAcc / duration);
        var curVal = lerp(startValue, endValue, k);
        ccbSetSceneNodeProperty(nodeToUpdate, propertyToUpdate, curVal);
    }
};
