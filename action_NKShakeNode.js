// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKShakeNode" description="NK - Shake node v2.0">
        <property name="nodeToShake" type="scenenode" default="" />
        <property name="axis" type="string" default="z" />
        <property name="amplitude" type="float" default="3.0" />
        <property name="times" type="int" default="3" />
        <property name="speed" type="float" default="0.01" />
    </action>
*/

var okeEventHandler,OkeEventHandler=function(){this.eventHandlers=[],this.lastTime=null,this.currentTime=null,this.dt=null,this.nullCount=0};OkeEventHandler.prototype.updateDt=function(){return this.currentTime=Date.now(),this.dt=this.currentTime-this.lastTime,this.dt>200&&(this.dt=200),this.lastTime=this.currentTime,this},OkeEventHandler.prototype.registerEvent=function(e){this.eventHandlers.push(e)},OkeEventHandler.prototype.unregisterEvent=function(e){for(var t=0;t<this.eventHandlers.length;t++)if(this.eventHandlers[t]===e)return this.eventHandlers[t]=null,void(this.nullCount+=1)},OkeEventHandler.prototype.clearAllEvents=function(){this.eventHandlers.length=0,this.nullCount=0},OkeEventHandler.prototype.cleanUpDoneEvents=function(){if(this.nullCount>15){this.nullCount=0;for(var e=[],t=0;t<this.eventHandlers.length;t++)null!==this.eventHandlers[t]&&e.push(this.eventHandlers[t]);this.eventHandlers=e}},OkeEventHandler.prototype.executeEvents=function(){for(var e=0;e<this.eventHandlers.length;e++)null!==this.eventHandlers[e]&&this.eventHandlers[e](this.dt);return this},okeEventHandler||(print("Global event manager initialized!"),(okeEventHandler=new OkeEventHandler).lastTime=Date.now(),ccbRegisterOnFrameEvent((function(){okeEventHandler.updateDt().executeEvents().cleanUpDoneEvents()})));

action_NKShakeNode = function () { }

action_NKShakeNode.prototype.execute = function (node) {
    if (this.nodeToShake) {
        var func = this.generateShakeFunction(this.nodeToShake, this.axis, this.amplitude, this.times, this.speed);
        okeEventHandler.registerEvent(func);
    }
};

action_NKShakeNode.prototype.generateShakeFunction = function (nodeToShake, axis, amplitude, times, speed) {
    if (!nodeToShake) {
        print('Node not found');
    }

    axis = axis.toLowerCase();

    var initialNodePos = ccbGetSceneNodeProperty(nodeToShake, 'Position');

    var maxAgrVal = Math.PI * 2 * times;
    var agrVal = 0;

    return function innerFunc(dt) {
        agrVal += dt * speed;
        if (agrVal >= maxAgrVal) {
            if (nodeToShake) {
                ccbSetSceneNodeProperty(nodeToShake, 'Position', initialNodePos);
            }
            okeEventHandler.unregisterEvent(innerFunc);
            return;
        }

        var newPos = new vector3d(initialNodePos.x, initialNodePos.y, initialNodePos.z);
        newPos[axis] += Math.sin(agrVal) * amplitude;
        ccbSetSceneNodeProperty(nodeToShake, 'Position', newPos);
    }
}
