// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKRegisterInteractablesManager" description="NK - Register Interactables Manager v2.0">
        <property name="playerNodeName" type="string" default="player" />
        <property name="staticCameraNodeName" type="string" default="player__static" />
        <property name="crosshairNodeName" type="string" default="crosshair" />
        <property name="interactActionTextNodeName" type="string" default="interactable_message" />
        <property name="detectorDistance" type="float" default="26.0" />
        <property name="interactKey" type="int" default="69" />
        <property name="startWithGameplayScene" type="bool" default="true" />
    </action>
*/

var DEGREE_TO_RAD = Math.PI / 180;
var JUST_PRESSED_STATE_ABOUT_TO_SWITCH = -1;

// ooh
var globalCurrentFrame;

if (!globalCurrentFrame) {
    globalCurrentFrame = 0;
}

vector3d.prototype.getLengthSq = function () {
    return this.x * this.x + this.y * this.y + this.z * this.z;
};

vector3d.prototype.getLengthSqXZ = function () {
    return this.x * this.x + this.y * this.y + this.z * this.z;
};

vector3d.prototype.multiplyByScalar = function (num) {
    this.x *= num;
    this.y *= num;
    this.z *= num;
};

var timers;

if (!timers) {
    print('setTimeout is initialized');
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

Object.keys = (function () {
    var hasOwnProperty = Object.prototype.hasOwnProperty, hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'), dontEnums = [
        'toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor'
    ], dontEnumsLength = dontEnums.length;
    return function (obj) {
        if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null)
            throw new TypeError('  called on non-object');
        var result = [];
        for (var prop in obj) {
            if (hasOwnProperty.call(obj, prop))
                result.push(prop);
        }
        if (hasDontEnumBug) {
            for (var i = 0; i < dontEnumsLength; i++) {
                if (hasOwnProperty.call(obj, dontEnums[i]))
                    result.push(dontEnums[i]);
            }
        }
        return result;
    };
})();

/**
 * @typedef Interactable
 * @property { vector3d } position
 * @property { ccbNode } node
 * @property { string } messageText
 * @property { any } action
 * @property { string } id
 * @property { string } conditionalVarName
 * @property { string } conditionalVarValue
 * @property { boolean } isInactive
 * @property { string } nodeName
 * @property { ccbNode | null } nodeToShow
 * @property { number | null } alternativeInteractKey
 * @property { number } overwriteDetectionDistanceSquared
 */

/**
 * @typedef GlobalKeyManager
 * @property { Object.<number, boolean> } pressed
 * @property { Object.<number, number> } justPressedFrame
 * @property { Object.<number, boolean> } pendingJustPressed
 */

var InteractablesManagerMode = {
    DISABLED: 0,
    GAMEPLAY: 1
}

var InteractablesManager = function (playerName, interactActionTextNodeName, detectorDistance, interactKey, crosshairNodeName, startWithGameplayScene) {
    this.mode = startWithGameplayScene ? InteractablesManagerMode.GAMEPLAY : InteractablesManagerMode.DISABLED;
    this.playerNodeName = playerName;
    this.interactActionTextNodeName = interactActionTextNodeName;
    this.detectDistance = detectorDistance + 3.0;
    this.detectDistanceSquared = detectorDistance * detectorDistance;
    this.interactKey = interactKey;
    this.crosshairNodeName = crosshairNodeName;

    this.stateId = 0;
    /**
     * @type { Interactable[] }
    */
    this.interactableHandlers = [];
    /**
     * @type {vector3d}
    */
    this.playerPos = new vector3d(0, 0, 0);
    /**
     * @type {vector3d}
    */
    this.detectorPos = new vector3d(0, 0, 0);
    /**
     * Squared distance to raycast
     * @type {number}
     */
    this.sceneToSwitchName = null;
    /**
     * @type {function[]}
     */
    this.interactableActionsEventQueue = [];
    /**
     * @type { string }
     */
    this.pointerNodeNameOnTheNextScene = '';

    this.lastTxt = '';
    this.isTurnOnScheduled = false;
    // this is alternative to test
    this.lastAlternativeNodeToShow = {
        name: '',
        node: null
    };


    if (this.mode === InteractablesManagerMode.GAMEPLAY) {
        /**
         * @type {ccbNode}
        */
        this.playerNode = ccbGetSceneNodeFromName(this.playerNodeName);
        /**
         * @type {ccbNode}
        */
        this.interactActionTextNode = ccbGetSceneNodeFromName(this.interactActionTextNodeName);
        /**
         * @type {ccbNode}
        */
        this.crosshairNode = ccbGetSceneNodeFromName(crosshairNodeName);
        ccbSetSceneNodeProperty(this.crosshairNode, 'Visible', true);
        this.isPaused = false;
    } else {
        this.playerNode = null;
        this.interactActionTextNode = null;
        this.crosshairNode = null;
        this.isPaused = true;
    }
}

/**
 * @param { Interactable } interactable 
 */
InteractablesManager.prototype.registerInteractable = function (interactable) {
    this.interactableHandlers.push(interactable);
}

/**
 * @param { number } id 
 */
InteractablesManager.prototype.unregisterInteractable = function (id) {
    for (var i = 0; i < this.interactableHandlers.length; i++) {
        if (this.interactableHandlers[i].id === id) {
            this.interactableHandlers[i].active = false;
            return;
        }
    }
};

/**
 * @param { string } name 
 */
InteractablesManager.prototype.unregisterInteractableRelatedToNodeName = function (nodeName) {
    for (var i = 0; i < this.interactableHandlers.length; i++) {
        if (this.interactableHandlers[i].nodeName === nodeName) {
            this.interactableHandlers[i].active = false;
        }
    }
}

InteractablesManager.prototype.clearInteractables = function () {
    this.interactableHandlers.length = 0;
}

InteractablesManager.prototype.checkInteractables = function () {
    // do not do anything in case disabled
    if (this.mode === InteractablesManagerMode.DISABLED) {
        return this;
    }

    // could show both text and node
    var msgTxt = '';
    var alternativeNodeToShowName = '';
    var alternativeNodeToShow = null;

    if (!this.isPaused) {
        var collisionPointWithWorld = ccbGetCollisionPointOfWorldWithLine(
            this.playerPos.x,
            this.playerPos.y,
            this.playerPos.z,
            this.detectorPos.x,
            this.detectorPos.y,
            this.detectorPos.z
        );
        var debugRaycastCount = 0;
        for (var i = 0; i < this.interactableHandlers.length; i++) {
            var interactable = this.interactableHandlers[i];
            if (!interactable || interactable.isInactive) {
                continue;
            }
            // check if close to interactable
            // Check without height, because it causes issues with big meshes
            // And meshes that are too high
            var distToCheck = interactable.overwriteDetectionDistanceSquared ? interactable.overwriteDetectionDistanceSquared : this.detectDistanceSquared; 
            if (interactable !== null && interactable.position.substract(this.playerPos).getLengthSqXZ() <= distToCheck) {
                // fix for nodes with colliders
                if (collisionPointWithWorld) {
                    var additionalVector = collisionPointWithWorld.substract(this.playerPos);
                    additionalVector.normalize();
                    additionalVector.multiplyByScalar(0.1);
                    collisionPointWithWorld = collisionPointWithWorld.add(additionalVector);
                }
                // raycast to check if interacts
                var isDetected = !!ccbDoesLineCollideWithBoundingBoxOfSceneNode(
                    interactable.node,
                    this.playerPos.x,
                    this.playerPos.y,
                    this.playerPos.z,
                    collisionPointWithWorld ? collisionPointWithWorld.x : this.detectorPos.x,
                    collisionPointWithWorld ? collisionPointWithWorld.y : this.detectorPos.y,
                    collisionPointWithWorld ? collisionPointWithWorld.z : this.detectorPos.z
                );
                debugRaycastCount += 1;
                if (isDetected) {
                    // do not even show the message in case interactable variable is set and you don't expect it
                    if (interactable.conditionalVarName && interactable.conditionalVarValue) {
                        if (ccbGetCopperCubeVariable(interactable.conditionalVarName) !== interactable.conditionalVarValue) {
                            continue;
                        }
                    }

                    // also don't do anything in case node is not visible
                    if (!ccbGetSceneNodeProperty(interactable.node, 'Visible')) {
                        continue;
                    }

                    if (interactable.nodeToShow) {
                        alternativeNodeToShowName = ccbGetSceneNodeProperty(interactable.nodeToShow, 'Name');
                        alternativeNodeToShow = interactable.nodeToShow;
                    }
                    msgTxt = interactable.messageText;

                    if (interactable.alternativeInteractKey === null ? isJustPressed(this.interactKey) : isJustPressed(interactable.alternativeInteractKey)) {
                        ccbInvokeAction(interactable.action, interactable.node);
                        this.turnOff();
                        break;
                    }
                }
                // this is commented out for or a reason 
                // otherwise multiple interactables on on node will not work
                // break;
            }
        }
        // TODO: maybe add debug function?
        // print('Raycasts: ' + debugRaycastCount);
    }
    
    if (this.lastTxt !== msgTxt) {
        this.lastTxt = msgTxt;
        ccbSetSceneNodeProperty(this.interactActionTextNode, 'Visible', msgTxt !== '');
        ccbSetSceneNodeProperty(this.interactActionTextNode, 'Text', msgTxt);
        // do not ever show it if everything is paused
        ccbSetSceneNodeProperty(this.crosshairNode, 'Visible', msgTxt === '' && !this.isPaused);
    }

    if (this.lastAlternativeNodeToShow.name !== alternativeNodeToShowName) {
        this.lastAlternativeNodeToShow.name = alternativeNodeToShowName;
        ccbSetSceneNodeProperty(alternativeNodeToShow || this.lastAlternativeNodeToShow.node, 'Visible', this.lastAlternativeNodeToShow.name !== '');
        this.lastAlternativeNodeToShow.node = alternativeNodeToShow;
        // do not ever show it if everything is paused
        ccbSetSceneNodeProperty(this.crosshairNode, 'Visible', msgTxt === '' && !this.isPaused);
    }

    return this;
}

/**
 * @returns { InteractablesManager }
 */
InteractablesManager.prototype.updatePlayerAndDetectorPositions = function () {
    // do not do anything in case it is disabled
    // otherwise errors
    if (this.mode === InteractablesManagerMode.DISABLED) {
        return this;
    }

    this.playerPos = ccbGetSceneNodeProperty(this.playerNode, 'Position');
    /**
     * @type { vector3d }
     */
    var playerTar = ccbGetSceneNodeProperty(this.playerNode, 'Target');

    var lookVector = playerTar.substract(this.playerPos);
    lookVector.normalize();

    lookVector.x *= this.detectDistance;
    lookVector.y *= this.detectDistance;
    lookVector.z *= this.detectDistance;

    this.detectorPos = this.playerPos.add(lookVector);
    return this;
}

InteractablesManager.prototype.scheduleSwitchToAnotherScene = function (sceneName, pointerNodeName, isNotGameplayScene) {
    this.sceneToSwitchName = sceneName;
    this.pointerNodeNameOnTheNextScene = pointerNodeName;
    this.nextSceneIsNotGameplayScene = isNotGameplayScene;
}

/**
 * @param {string} sceneName 
 * @returns { interactablesManager }
 */
InteractablesManager.prototype.switchToAnotherSceneIfScheduled = function () {
    if (this.sceneToSwitchName !== null) {
        this.clearInteractables();

        ccbSwitchToScene(this.sceneToSwitchName);
        this.stateId += 1;

        this.mode = this.nextSceneIsNotGameplayScene ? InteractablesManagerMode.DISABLED : InteractablesManagerMode.GAMEPLAY;

        if (this.mode === InteractablesManagerMode.GAMEPLAY) {
            // Update all nodes so the ones from new scene are used
            this.playerNode = ccbGetSceneNodeFromName(this.playerNodeName);
            this.interactActionTextNode = ccbGetSceneNodeFromName(this.interactActionTextNodeName);
            this.crosshairNode = ccbGetSceneNodeFromName(this.crosshairNodeName);
    
            if (this.pointerNodeNameOnTheNextScene) {
                var pointerNode = ccbGetSceneNodeFromName(this.pointerNodeNameOnTheNextScene);
                var pointerPos = ccbGetSceneNodeProperty(pointerNode, 'Position');
                var pointerRot = ccbGetSceneNodeProperty(pointerNode, 'Rotation');
                var playerPos = ccbGetSceneNodeProperty(this.playerNode, 'Position');
    
                setTimeout(function(playerNode, playerPos, pointerPos, pointerRot) {
                    var newPos = new vector3d(pointerPos.x, playerPos.y, pointerPos.z);
                    ccbSetSceneNodeProperty(playerNode, 'Position', newPos);
                    ccbSetSceneNodeProperty(playerNode, 'Rotation', pointerRot);
                    
                    const rad = (pointerRot.y) * DEGREE_TO_RAD;
                    const tarX = Math.sin(rad) * 10;
                    const tarZ = Math.cos(rad) * 10;
                    ccbSetSceneNodeProperty(playerNode, 'Target', tarX + newPos.x, newPos.y, tarZ + newPos.z);
    
                }, 10, [this.playerNode, playerPos, pointerPos, pointerRot])
    
                this.pointerNodeNameOnTheNextScene = '';
            }
    
            globalCameraManager.resetCameraNodes(this.playerNode);
    
            this.sceneToSwitchName = null;
            this.turnOn();
        } else {
            this.sceneToSwitchName = null;
            // it's not required to turnOff since cameras do not exist
            // use turn off only for static/dynamic camera
            this.isPaused = false;
        }
    }
    return this;
}

InteractablesManager.prototype.scheduleInteractableEvent = function (func) {
    this.interactableActionsEventQueue.push(func);
}

InteractablesManager.prototype.turnOn = function () {
    this.isPaused = false;
    globalCameraManager.switchToPlayerCamera();
    ccbSetSceneNodeProperty(this.crosshairNode, 'Visible', true);
}

InteractablesManager.prototype.turnOff = function () {
    this.isPaused = true;
    globalCameraManager.switchToStaticCamera();
    ccbSetSceneNodeProperty(this.crosshairNode, 'Visible', false);
}

InteractablesManager.prototype.scheduleTurnOn = function () {
    this.isTurnOnScheduled = true;
}

InteractablesManager.prototype.turnOnIfScheduled = function () {
    if (this.isTurnOnScheduled) {
        this.isTurnOnScheduled = false;
        if (this.isPaused) {
            this.turnOn();
        }
    }
    return this;
}

function okeMouseDownListener(keyCode) {
    if (!globalKeyState) return;

    if (!globalKeyState.pressed[keyCode]) {
        globalKeyState.pressed[keyCode] = true;
        globalKeyState.pendingJustPressed[keyCode] = true;
    }
}

function okeKeyDownListener(keyCode) {
    if (!globalKeyState) return;

    if (!globalKeyState.pressed[keyCode]) {
        globalKeyState.pressed[keyCode] = true;
        globalKeyState.pendingJustPressed[keyCode] = true;
    }
}

function okeMouseUpListener(keyCode) {
    if (!globalKeyState) return;
    globalKeyState.pressed[keyCode] = false;
}

function okeKeyUpListener(keyCode) {
    if (!globalKeyState) return;
    globalKeyState.pressed[keyCode] = false;
}

/**
 * @param { number } keyCode
 * @returns { boolean } 
 */
function isJustPressed(keyCode) {
    var isJustPressed = globalKeyState.justPressedFrame[keyCode] === globalCurrentFrame;
    if (isJustPressed) globalKeyState.justPressedFrame[keyCode] = -1;
    return isJustPressed;
}

var CameraManager = function (playerCameraNodeName, staticCameraNodeName) {
    this.playerCameraNodeName = playerCameraNodeName;
    this.staticCameraNodeName = staticCameraNodeName;

    this.playerCameraNode = ccbGetSceneNodeFromName(this.playerCameraNodeName);
    this.staticCameraNode = ccbGetSceneNodeFromName(this.staticCameraNodeName);

    this.directionKeys = [87, 65, 83, 68, 38, 37, 40, 39];
}

CameraManager.prototype.resetCameraNodes = function (playerNode) {
    this.playerCameraNode = playerNode;
    this.staticCameraNode = ccbGetSceneNodeFromName(this.staticCameraNodeName);
}

CameraManager.prototype.switchToStaticCamera = function () {
    var targetPos = ccbGetSceneNodeProperty(this.playerCameraNode, 'Position');
    var targetRot = ccbGetSceneNodeProperty(this.playerCameraNode, 'Rotation');
    var targetTar = ccbGetSceneNodeProperty(this.playerCameraNode, 'Target');
    var targetUpv = ccbGetSceneNodeProperty(this.playerCameraNode, 'UpVector');

    for (var i = 0; i < this.directionKeys.length; i++) {
        ccbEmulateKey(this.directionKeys[i], false);
    }

    ccbSetSceneNodeProperty(this.staticCameraNode, 'Position', targetPos);
    ccbSetSceneNodeProperty(this.staticCameraNode, 'Rotation', targetRot);
    ccbSetSceneNodeProperty(this.staticCameraNode, 'Target', targetTar);
    ccbSetSceneNodeProperty(this.staticCameraNode, 'UpVector', targetUpv);
    ccbSetActiveCamera(this.staticCameraNode);
}

CameraManager.prototype.switchToPlayerCamera = function () {
    var targetPos = ccbGetSceneNodeProperty(this.staticCameraNode, 'Position');
    var targetRot = ccbGetSceneNodeProperty(this.staticCameraNode, 'Rotation');
    var targetTar = ccbGetSceneNodeProperty(this.staticCameraNode, 'Target');
    var targetUpv = ccbGetSceneNodeProperty(this.staticCameraNode, 'UpVector');
    ccbSetSceneNodeProperty(this.playerCameraNode, 'Position', targetPos);
    ccbSetSceneNodeProperty(this.playerCameraNode, 'Rotation', targetRot);
    ccbSetSceneNodeProperty(this.playerCameraNode, 'Target', targetTar);
    ccbSetSceneNodeProperty(this.playerCameraNode, 'UpVector', targetUpv);
    
    // prevent rotation based on mouse pos
    ccbSetMousePos(
        ccbGetScreenWidth() / 2,
        ccbGetScreenHeight() / 2
    )

    ccbSetActiveCamera(this.playerCameraNode);

    // cursor somehow appears if switch scenes
    ccbSetCursorVisible(false);
}

/**
 * @type { InteractablesManager }
 */
var interactablesManager;
/**
 * @type { GlobalKeyManager }
 */
var globalKeyState;
/**
 * @type { CameraManager }
 */
var globalCameraManager;

action_NKRegisterInteractablesManager = function () { }

action_NKRegisterInteractablesManager.prototype.execute = function (node) {
    if (!globalKeyState) {
        globalKeyState = {
            pressed: {},
            justPressedFrame: {},
            pendingJustPressed: {}
        };
    }

    if (!globalCameraManager) {
        globalCameraManager = new CameraManager(
            this.playerNodeName,
            this.staticCameraNodeName
        );
    }

    if (!interactablesManager) {
        // ccbSetCursorVisible(true);
        interactablesManager = new InteractablesManager(
            this.playerNodeName,
            this.interactActionTextNodeName,
            this.detectorDistance,
            this.interactKey,
            this.crosshairNodeName,
            this.startWithGameplayScene
        );
        ccbRegisterOnFrameEvent(function () {
            globalCurrentFrame = (globalCurrentFrame + 1) & 0x3fffffff;
            
            var keys = Object.keys(globalKeyState.pendingJustPressed);
            for (var i = 0; i < keys.length; i++) {
                globalKeyState.justPressedFrame[keys[i]] = globalCurrentFrame;
            }
            globalKeyState.pendingJustPressed = {};

            interactablesManager
                .updatePlayerAndDetectorPositions()
                .checkInteractables()
                .switchToAnotherSceneIfScheduled()
                .turnOnIfScheduled();
        });
        ccbRegisterKeyDownEvent("okeKeyDownListener");
        ccbRegisterMouseDownEvent("okeMouseDownListener");
        ccbRegisterKeyUpEvent("okeKeyUpListener");
        ccbRegisterMouseUpEvent("okeMouseUpListener");
    }
}

// interactablesManager.scheduleTurnOn();
// interactablesManager.scheduleInteractableEvent(function() {
//     interactablesManager.scheduleTurnOn();
// })
