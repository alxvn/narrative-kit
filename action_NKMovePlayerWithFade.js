// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKMovePlayerWithFade" description="NK - Move player with fade v2.0">
        <property name="endpointNode1" type="scenenode" default="" />
        <property name="endpointNode2" type="scenenode" default="" />
        <property name="fadeOutTimeMs" type="int" default="500" />
        <property name="fadeInTimeMs" type="int" default="500" />
        <property name="actionOnComplete" type="action" default="" />
    </action>
*/

var okeEventHandler,OkeEventHandler=function(){this.eventHandlers=[],this.lastTime=null,this.currentTime=null,this.dt=null,this.nullCount=0};OkeEventHandler.prototype.updateDt=function(){return this.currentTime=Date.now(),this.dt=this.currentTime-this.lastTime,this.dt>200&&(this.dt=200),this.lastTime=this.currentTime,this},OkeEventHandler.prototype.registerEvent=function(e){this.eventHandlers.push(e)},OkeEventHandler.prototype.unregisterEvent=function(e){for(var t=0;t<this.eventHandlers.length;t++)if(this.eventHandlers[t]===e)return this.eventHandlers[t]=null,void(this.nullCount+=1)},OkeEventHandler.prototype.clearAllEvents=function(){this.eventHandlers.length=0,this.nullCount=0},OkeEventHandler.prototype.cleanUpDoneEvents=function(){if(this.nullCount>15){this.nullCount=0;for(var e=[],t=0;t<this.eventHandlers.length;t++)null!==this.eventHandlers[t]&&e.push(this.eventHandlers[t]);this.eventHandlers=e}},OkeEventHandler.prototype.executeEvents=function(){for(var e=0;e<this.eventHandlers.length;e++)null!==this.eventHandlers[e]&&this.eventHandlers[e](this.dt);return this},okeEventHandler||(print("Global event manager initialized!"),(okeEventHandler=new OkeEventHandler).lastTime=Date.now(),ccbRegisterOnFrameEvent((function(){okeEventHandler.updateDt().executeEvents().cleanUpDoneEvents()})));

var DEGREE_TO_RAD = Math.PI / 180;
var FADE_COLOR = 0xff000000;

action_NKMovePlayerWithFade = function () { };

action_NKMovePlayerWithFade.prototype.execute = function (node) {
    if ((!this.endpointNode1 && !this.endpointNode2) || !interactablesManager || !globalCameraManager) {
        return;
    }

    var endpointNode = this.pickFurthestEndpoint(
        interactablesManager.playerNode,
        this.endpointNode1,
        this.endpointNode2
    );
    if (!endpointNode) {
        return;
    }

    interactablesManager.turnOff();

    var fadeFunc = this.generateFadeSequenceFunction(
        endpointNode,
        this.fadeOutTimeMs,
        this.fadeInTimeMs,
        this.actionOnComplete,
        node
    );
    if (fadeFunc) {
        okeEventHandler.registerEvent(fadeFunc);
    }
};

action_NKMovePlayerWithFade.prototype.getDistanceSq = function (fromPos, toPos) {
    var dx = toPos.x - fromPos.x;
    var dy = toPos.y - fromPos.y;
    var dz = toPos.z - fromPos.z;
    return dx * dx + dy * dy + dz * dz;
};

action_NKMovePlayerWithFade.prototype.pickFurthestEndpoint = function (playerNode, endpointNode1, endpointNode2) {
    if (endpointNode1 && !endpointNode2) {
        return endpointNode1;
    }
    if (endpointNode2 && !endpointNode1) {
        return endpointNode2;
    }
    if (!endpointNode1 || !endpointNode2) {
        return null;
    }

    var playerPos = ccbGetSceneNodeProperty(playerNode, 'Position');
    var endpointPos1 = ccbGetSceneNodeProperty(endpointNode1, 'Position');
    var endpointPos2 = ccbGetSceneNodeProperty(endpointNode2, 'Position');

    if (this.getDistanceSq(playerPos, endpointPos1) >= this.getDistanceSq(playerPos, endpointPos2)) {
        return endpointNode1;
    }
    return endpointNode2;
};

action_NKMovePlayerWithFade.prototype.movePlayerToEndpoint = function (playerNode, endpointNode) {
    var pointerPos = ccbGetSceneNodeProperty(endpointNode, 'Position');
    var pointerRot = ccbGetSceneNodeProperty(endpointNode, 'Rotation');
    var playerPos = ccbGetSceneNodeProperty(playerNode, 'Position');

    var newPos = new vector3d(pointerPos.x, playerPos.y, pointerPos.z);
    ccbSetSceneNodePositionWithoutCollision(playerNode, newPos.x, newPos.y, newPos.z);
    ccbSetSceneNodeProperty(playerNode, 'Rotation', pointerRot);

    var rad = pointerRot.y * DEGREE_TO_RAD;
    var tarX = Math.sin(rad) * 10;
    var tarZ = Math.cos(rad) * 10;
    ccbSetSceneNodeProperty(playerNode, 'Target', tarX + newPos.x, newPos.y, tarZ + newPos.z);

    globalCameraManager.switchToStaticCamera();
};

action_NKMovePlayerWithFade.prototype.generateFadeSequenceFunction = function (endpointNode, fadeOutTimeMs, fadeInTimeMs, actionOnComplete, node) {
    var movePlayerToEndpoint = this.movePlayerToEndpoint;
    var phase = 0;
    var elapsed = 0;

    if (fadeOutTimeMs <= 0) {
        movePlayerToEndpoint(interactablesManager.playerNode, endpointNode);
        phase = 1;
        if (fadeInTimeMs <= 0) {
            interactablesManager.scheduleTurnOn();
            if (actionOnComplete) {
                ccbInvokeAction(actionOnComplete, node);
            }
            return null;
        }
    }

    return function inner(dt) {
        elapsed += dt;

        if (phase === 0) {
            var fadeOutAlpha = (elapsed / fadeOutTimeMs) * 255;
            if (fadeOutAlpha > 255) {
                fadeOutAlpha = 255;
            }

            var fadeOutColor = (Math.floor(fadeOutAlpha) << 24) | (FADE_COLOR & 0x00ffffff);
            ccbDrawColoredRectangle(fadeOutColor, 0, 0, ccbGetScreenWidth(), ccbGetScreenHeight());

            if (elapsed >= fadeOutTimeMs) {
                movePlayerToEndpoint(interactablesManager.playerNode, endpointNode);
                phase = 1;
                elapsed = 0;

                if (fadeInTimeMs <= 0) {
                    okeEventHandler.unregisterEvent(inner);
                    interactablesManager.scheduleTurnOn();
                    if (actionOnComplete) {
                        ccbInvokeAction(actionOnComplete, node);
                    }
                }
            }
        } else if (phase === 1) {
            var fadeInAlpha = (1 - elapsed / fadeInTimeMs) * 255;
            if (fadeInAlpha < 0) {
                fadeInAlpha = 0;
            }

            var fadeInColor = (Math.floor(fadeInAlpha) << 24) | (FADE_COLOR & 0x00ffffff);
            ccbDrawColoredRectangle(fadeInColor, 0, 0, ccbGetScreenWidth(), ccbGetScreenHeight());

            if (elapsed >= fadeInTimeMs) {
                okeEventHandler.unregisterEvent(inner);
                interactablesManager.scheduleTurnOn();
                if (actionOnComplete) {
                    ccbInvokeAction(actionOnComplete, node);
                }
            }
        }
    };
};
