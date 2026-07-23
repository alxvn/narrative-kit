// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKSwitchToScene" description="NK - Switch to scene v2.1">
        <property name="sceneName" type="string" default="" />
        <property name="pointerNodeName" type="string" default="" />
        <property name="isGameplayScene" type="bool" default="true" />
    </action>
*/

var okeEventHandler,OkeEventHandler=function(){this.eventHandlers=[],this.lastTime=null,this.currentTime=null,this.dt=null,this.nullCount=0};OkeEventHandler.prototype.updateDt=function(){return this.currentTime=Date.now(),this.dt=this.currentTime-this.lastTime,this.dt>200&&(this.dt=200),this.lastTime=this.currentTime,this},OkeEventHandler.prototype.registerEvent=function(e){this.eventHandlers.push(e)},OkeEventHandler.prototype.unregisterEvent=function(e){for(var t=0;t<this.eventHandlers.length;t++)if(this.eventHandlers[t]===e)return this.eventHandlers[t]=null,void(this.nullCount+=1)},OkeEventHandler.prototype.clearAllEvents=function(){this.eventHandlers.length=0,this.nullCount=0},OkeEventHandler.prototype.cleanUpDoneEvents=function(){if(this.nullCount>15){this.nullCount=0;for(var e=[],t=0;t<this.eventHandlers.length;t++)null!==this.eventHandlers[t]&&e.push(this.eventHandlers[t]);this.eventHandlers=e}},OkeEventHandler.prototype.executeEvents=function(){for(var e=0;e<this.eventHandlers.length;e++)null!==this.eventHandlers[e]&&this.eventHandlers[e](this.dt);return this},okeEventHandler||(print("Global event manager initialized!"),(okeEventHandler=new OkeEventHandler).lastTime=Date.now(),ccbRegisterOnFrameEvent((function(){okeEventHandler.updateDt().executeEvents().cleanUpDoneEvents()})));

var FADE_COLOR = 0xff000000;
var FADE_TIME_MS = 500;

action_NKSwitchToScene = function () {}

action_NKSwitchToScene.prototype.execute = function (node) {
    if (!this.sceneName || !interactablesManager) {
        return;
    }

    interactablesManager.turnOff();

    var fadeFunc = this.generateFadeSequenceFunction(
        this.sceneName,
        this.pointerNodeName,
        !this.isGameplayScene
    );
    if (fadeFunc) {
        okeEventHandler.registerEvent(fadeFunc);
    }
}

action_NKSwitchToScene.prototype.generateFadeSequenceFunction = function (sceneName, pointerNodeName, isNotGameplayScene) {
    var phase = 0;
    var elapsed = 0;

    return function inner(dt) {
        elapsed += dt;

        if (phase === 0) {
            var fadeOutAlpha = (elapsed / FADE_TIME_MS) * 255;
            if (fadeOutAlpha > 255) {
                fadeOutAlpha = 255;
            }

            var fadeOutColor = (Math.floor(fadeOutAlpha) << 24) | (FADE_COLOR & 0x00ffffff);
            ccbDrawColoredRectangle(fadeOutColor, 0, 0, ccbGetScreenWidth(), ccbGetScreenHeight());

            if (elapsed >= FADE_TIME_MS) {
                interactablesManager.scheduleSwitchToAnotherScene(sceneName, pointerNodeName, isNotGameplayScene);
                phase = 1;
                elapsed = 0;
            }
        } else if (phase === 1) {
            var fadeInAlpha = (1 - elapsed / FADE_TIME_MS) * 255;
            if (fadeInAlpha < 0) {
                fadeInAlpha = 0;
            }

            var fadeInColor = (Math.floor(fadeInAlpha) << 24) | (FADE_COLOR & 0x00ffffff);
            ccbDrawColoredRectangle(fadeInColor, 0, 0, ccbGetScreenWidth(), ccbGetScreenHeight());

            if (elapsed >= FADE_TIME_MS) {
                okeEventHandler.unregisterEvent(inner);
            }
        }
    };
}
