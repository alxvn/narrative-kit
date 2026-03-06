// The following embedded xml is for the editor and describes how the behavior can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <behavior jsname="behavior_NKFootSteps" description="NK - Footsteps v2.0">
        <property name="stepSpeed" type="float" default="1.0" />
        <property name="playFootSteps" type="bool" default="true" />
        <property name="sfxFolder" type="scenenode" default="" />
        <property name="fakeBobFovShift" type="float" default="1.3" />
        <property name="fakeBobStepTilt" type="float" default="0.011" />
        <property name="strafeTiltAngle" type="float" default="0.03" />
        <property name="strafeTiltSmooth" type="float" default="0.01" />
    </behavior>
*/

var behavior_NKFootSteps = function () {
    this.lastTime = null;
    this.moveKeys = {
        37: false,
        38: false,
        39: false,
        40: false,
        65: false,
        68: false,
        83: false,
        87: false
    };
    this.halfPI = Math.PI * 0.5;
    this.twoPI = Math.PI * 2;
    this.threeFourthPI = this.halfPI + Math.PI;
    this.deltaAcc = this.halfPI;
    // will be property to adjust if required
    /**
     * @type {number}
     */
    //this.stepSpeed = 1;
    /**
     * @type {number}
     */
    this.playerSpeed;
    /**
     * @type {string}
     */
    this.nodeName;
    this.prevCos = 0;
    // this.tiltDegree = 0.07;
    /**
     * @type {number}
     */
    this.baseFOV;
    this.degreesToRadian = Math.PI / 180;
    this.targetStopVal = this.halfPI;

    // this.sfxFolder = ccbGetSceneNodeFromName('fs_sfx');
    this.fsSfx = [];
    this.lastSfxIndex = 0;
    this.currentTilt = 0;
    this.strafeTilt = 0;
};

behavior_NKFootSteps.prototype.onAnimate = function (node, timeMs) {
    if (!this.lastTime) {
        this.lastTime = timeMs;
        this.nodeName = ccbGetSceneNodeProperty(node, 'Name');
        this.baseFOV = ccbGetSceneNodeProperty(node, 'FieldOfView_Degrees');
        var sfxCount = ccbGetSceneNodeChildCount(this.sfxFolder);

        if (this.playFootSteps) {
            for (var i = 0; i < sfxCount; i++) {
                this.fsSfx.push(ccbGetChildSceneNode(this.sfxFolder, i));
            }
        }

        this.strafeDegree = this.strafeTiltAngle;
        this.strafeSmooth = this.strafeTiltSmooth;
        return false;
    }

    var delta = timeMs - this.lastTime;
    this.lastTime = timeMs;
    if (delta > 200) delta = 200;

    var isMoving = this.hasAnyTrue(this.moveKeys);
    var curSinValue = Math.sin(this.deltaAcc);
    var curCosValue = Math.cos(this.deltaAcc);

    if (isMoving) {
        // reset target stop val in order to check which way it should stop
        this.targetStopVal = null;
        this.playerSpeed = ccbGetCopperCubeVariable('#' + this.nodeName + '.movementspeed');
        this.deltaAcc += delta * this.playerSpeed * this.stepSpeed * 0.173;
        if (this.deltaAcc > this.twoPI) {
            this.deltaAcc = 0;
        }
        if (
            (this.prevCos <= 0 && curCosValue > 0) ||
            (this.prevCos >= 0 && curCosValue < 0)
        ) {
            if (this.fsSfx.length > 0) {
                this.playStepSfx();
            }
        }
    } else {
        if (this.targetStopVal === null) {
            if (curSinValue < 0) {
                this.targetStopVal = this.threeFourthPI;
            } else {
                this.targetStopVal = this.halfPI;
            }
        }
        this.deltaAcc = this.lerp(this.deltaAcc, this.targetStopVal, 0.33);
        var curSinValue = Math.sin(this.deltaAcc);
    }

    // update FOV
    var curFov = this.baseFOV + Math.abs(curCosValue) * this.fakeBobFovShift;
    ccbSetSceneNodeProperty(node, 'FieldOfView_Degrees', curFov);

    // update upVector
    var side = curCosValue >= 0 ? 1 : -1;
    var phase01 = Math.abs(curCosValue);

    var eased = this.easeInOutCubic(phase01);
    // ----- BOB TILT -----
    var bobTilt = eased * side * this.fakeBobStepTilt;

    // ----- STRAFE TILT -----
    var targetStrafeTilt = 0;

    if (this.moveKeys[65] || this.moveKeys[37]) targetStrafeTilt -= this.strafeDegree;
    if (this.moveKeys[68] || this.moveKeys[39]) targetStrafeTilt += this.strafeDegree;

    this.strafeTilt += (targetStrafeTilt - this.strafeTilt) *
        (1 - Math.exp(-this.strafeSmooth * delta));

    // ----- FINAL TILT -----
    var finalTilt = bobTilt + this.strafeTilt;

    var rot = ccbGetSceneNodeProperty(node, 'Rotation');

    var newUpVector = new vector3d(
        Math.cos(rot.y * this.degreesToRadian) * finalTilt,
        1.0,
        -Math.sin(rot.y * this.degreesToRadian) * finalTilt
    );

    ccbSetSceneNodeProperty(node, 'UpVector', newUpVector);

    // tilt on strafe goes here

    this.prevCos = curCosValue;
}

behavior_NKFootSteps.prototype.onKeyEvent = function (key, pressed) {
    if (this.moveKeys[key] !== undefined) {
        this.moveKeys[key] = pressed;
    }
}

behavior_NKFootSteps.prototype.hasAnyTrue = function (obj) {
    for (var key in obj) {
        if (obj[key]) {
            return true;
        }
    }
    return false;
}

behavior_NKFootSteps.prototype.lerp = function (prev, next, delta) {
    return prev + delta * (next - prev);
}

behavior_NKFootSteps.prototype.playStepSfx = function () {
    // only choose random one in case there is more than 1 node to play sound
    if (this.fsSfx.length > 1) {
        var newIndex;
        do {
            newIndex = Math.floor(Math.random() * this.fsSfx.length)
        } while (newIndex === this.lastSfxIndex);
        this.lastSfxIndex = newIndex;
        this.playSoundFromNode(this.fsSfx[newIndex]);
    } else {
        this.playSoundFromNode(this.fsSfx[0]);
    }
}

behavior_NKFootSteps.prototype.normalizePhase = function (phase) {
    return (phase % this.twoPI) / this.twoPI;
}

behavior_NKFootSteps.prototype.easeInOutCubic = function (t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

behavior_NKFootSteps.prototype.playSoundFromNode = function (node) {
    ccbSetSceneNodeProperty(node, 'PlayMode', 'nothing');
    ccbSetSceneNodeProperty(node, 'PlayMode', 'play_once');
}
