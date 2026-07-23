// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKWaitFor" description="NK - Wait for v2.0">
        <property name="waitTimeMs" type="int" default="1000" />
        <property name="actionOnComplete" type="action" default="" />
    </action>
*/

var okeEventHandler,OkeEventHandler=function(){this.eventHandlers=[],this.lastTime=null,this.currentTime=null,this.dt=null,this.nullCount=0};OkeEventHandler.prototype.updateDt=function(){return this.currentTime=Date.now(),this.dt=this.currentTime-this.lastTime,this.dt>200&&(this.dt=200),this.lastTime=this.currentTime,this},OkeEventHandler.prototype.registerEvent=function(e){this.eventHandlers.push(e)},OkeEventHandler.prototype.unregisterEvent=function(e){for(var t=0;t<this.eventHandlers.length;t++)if(this.eventHandlers[t]===e)return this.eventHandlers[t]=null,void(this.nullCount+=1)},OkeEventHandler.prototype.clearAllEvents=function(){this.eventHandlers.length=0,this.nullCount=0},OkeEventHandler.prototype.cleanUpDoneEvents=function(){if(this.nullCount>15){this.nullCount=0;for(var e=[],t=0;t<this.eventHandlers.length;t++)null!==this.eventHandlers[t]&&e.push(this.eventHandlers[t]);this.eventHandlers=e}},OkeEventHandler.prototype.executeEvents=function(){for(var e=0;e<this.eventHandlers.length;e++)null!==this.eventHandlers[e]&&this.eventHandlers[e](this.dt);return this},okeEventHandler||(print("Global event manager initialized!"),(okeEventHandler=new OkeEventHandler).lastTime=Date.now(),ccbRegisterOnFrameEvent((function(){okeEventHandler.updateDt().executeEvents().cleanUpDoneEvents()})));

action_NKWaitFor = function () { }

action_NKWaitFor.prototype.execute = function (node) {
    var waitFunc = this.generateWaitFunction(this.waitTimeMs, this.actionOnComplete, node);
    if (waitFunc) {
        okeEventHandler.registerEvent(waitFunc);
    }
};

action_NKWaitFor.prototype.generateWaitFunction = function (waitTimeMs, actionOnComplete, node) {
    if (waitTimeMs <= 0) {
        if (actionOnComplete) {
            ccbInvokeAction(actionOnComplete, node);
        }
        return null;
    }

    var elapsed = 0;

    return function inner(dt) {
        elapsed += dt;
        if (elapsed >= waitTimeMs) {
            okeEventHandler.unregisterEvent(inner);
            if (actionOnComplete) {
                ccbInvokeAction(actionOnComplete, node);
            }
        }
    };
};
