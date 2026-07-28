// The following embedded xml is for the editor and describes how the behavior can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <behavior jsname="behavior_NKGunMode" description="NK - Gun Mode (Survivor aim) v1.1">
        <property name="edgeMarginPercent" type="float" default="12" />
        <property name="panSpeedDegrees" type="float" default="55" />
        <property name="maxPitchDegrees" type="float" default="70" />
        <property name="focusDistance" type="float" default="100" />
        <property name="shootRange" type="float" default="200" />
        <property name="fireCooldownMs" type="int" default="320" />
        <property name="crosshairHalfWidthPercent" type="float" default="2" />
        <property name="crosshairHalfHeightPercent" type="float" default="2" />
        <property name="bulletHoleNodeName" type="string" default="bullet_hole" />
        <property name="magSize" type="int" default="10" />
        <property name="shakeAmplitudePercent" type="float" default="0.55" />
        <property name="shakeSpeed" type="float" default="9" />
        <property name="recoilUpMinPercent" type="float" default="1.2" />
        <property name="recoilUpMaxPercent" type="float" default="2.8" />
        <property name="recoilSideMinPercent" type="float" default="0.4" />
        <property name="recoilSideMaxPercent" type="float" default="1.6" />
        <property name="recoilRecoveryPerSec" type="float" default="6" />
    </behavior>
*/

/**
 * Magazine / loaded ammo (persists across scenes; stock lives in nkInventory bullets).
 * @type {{ ammoLoaded: number, magSize: number }}
 */
var nkGunAmmo;

if (!nkGunAmmo) {
    nkGunAmmo = {
        ammoLoaded: 10,
        magSize: 10
    };
}

/**
 * @returns { number }
 */
function nkGunGetAmmoLoaded() {
    return nkGunAmmo ? nkGunAmmo.ammoLoaded : 0;
}

/**
 * @returns { number }
 */
function nkGunGetMagSize() {
    return nkGunAmmo ? nkGunAmmo.magSize : 10;
}

/**
 * @returns { number } free slots in the magazine
 */
function nkGunGetMagFreeSlots() {
    var free = nkGunGetMagSize() - nkGunGetAmmoLoaded();
    return free > 0 ? free : 0;
}

/**
 * @param { number } amount
 * @returns { number } amount actually loaded
 */
function nkGunAddAmmoLoaded(amount) {
    var add = parseInt(amount, 10);
    if (!add || add < 0) {
        return 0;
    }
    var free = nkGunGetMagFreeSlots();
    if (add > free) {
        add = free;
    }
    nkGunAmmo.ammoLoaded += add;
    return add;
}

/**
 * @param { number } amount
 * @returns { number } amount actually consumed
 */
function nkGunConsumeAmmoLoaded(amount) {
    var take = parseInt(amount, 10);
    if (!take || take < 0) {
        return 0;
    }
    if (take > nkGunAmmo.ammoLoaded) {
        take = nkGunAmmo.ammoLoaded;
    }
    nkGunAmmo.ammoLoaded -= take;
    return take;
}

/**
 * Enemy / damageable registry for gun raycasts.
 * @type {{ node: scenenode, onHit: function, active: boolean }[]}
 */
var nkGunTargets;

if (!nkGunTargets) {
    nkGunTargets = [];
}

/**
 * @param { scenenode } node
 * @param { function } onHit
 * @returns { number } registry index id
 */
function nkGunRegisterTarget(node, onHit) {
    nkGunTargets.push({
        node: node,
        onHit: onHit,
        active: true
    });
    return nkGunTargets.length - 1;
}

/**
 * @param { scenenode } node
 */
function nkGunUnregisterTarget(node) {
    for (var i = 0; i < nkGunTargets.length; i++) {
        if (nkGunTargets[i].node === node) {
            nkGunTargets[i].active = false;
        }
    }
}

/**
 * Cross product into out vector (ES1-safe, no allocation if out provided).
 */
function nkGunCross(ax, ay, az, bx, by, bz, out) {
    out.x = ay * bz - az * by;
    out.y = az * bx - ax * bz;
    out.z = ax * by - ay * bx;
    return out;
}

/**
 * Rotate look vector by yaw (around world up) and pitch (around right). Mutates look.
 * @param { vector3d } look normalized
 * @param { number } yawRad
 * @param { number } pitchRad
 * @param { number } maxPitchRad
 */
function nkGunApplyYawPitchToLook(look, yawRad, pitchRad, maxPitchRad) {
    var up = new vector3d(0, 1, 0);
    var right = new vector3d(0, 0, 0);
    nkGunCross(look.x, look.y, look.z, up.x, up.y, up.z, right);
    var rightLen = right.getLength();
    if (rightLen < 0.0001) {
        right.x = 1;
        right.y = 0;
        right.z = 0;
    } else {
        right.normalize();
    }

    // Yaw around world Y
    if (yawRad !== 0) {
        var cosY = Math.cos(yawRad);
        var sinY = Math.sin(yawRad);
        var lx = look.x * cosY + look.z * sinY;
        var lz = -look.x * sinY + look.z * cosY;
        look.x = lx;
        look.z = lz;
        look.normalize();
        nkGunCross(look.x, look.y, look.z, up.x, up.y, up.z, right);
        rightLen = right.getLength();
        if (rightLen > 0.0001) {
            right.normalize();
        }
    }

    // Pitch around right
    if (pitchRad !== 0) {
        var cosP = Math.cos(pitchRad);
        var sinP = Math.sin(pitchRad);
        // Rodrigues: look' = look*cos + (right x look)*sin + right*(right·look)*(1-cos)
        // right · look ~= 0
        var cx = right.y * look.z - right.z * look.y;
        var cy = right.z * look.x - right.x * look.z;
        var cz = right.x * look.y - right.y * look.x;
        look.x = look.x * cosP + cx * sinP;
        look.y = look.y * cosP + cy * sinP;
        look.z = look.z * cosP + cz * sinP;
        look.normalize();
    }

    // Clamp pitch: limit look.y
    var maxY = Math.sin(maxPitchRad);
    if (look.y > maxY) {
        look.y = maxY;
        look.normalize();
    } else if (look.y < -maxY) {
        look.y = -maxY;
        look.normalize();
    }
}

var behavior_NKGunMode = function () {
    this.nodesCached = false;
    this.lastTimeMs = null;
    this.mouseEventNextFrame = false;
    /** Wall-clock cooldown end (Date.now), more reliable than onAnimate timeMs. */
    this.nextFireTimeMs = 0;
    this.lastFireFrame = -1;
    this.lastAmmoDrawn = -1;
    this.hudForcedOn = false;
    this.bulletNodes = [];
    /** Persistent recoil kick in screen percent (decays toward 0). */
    this.recoilOffsetX = 0;
    this.recoilOffsetY = 0;
    /** Last computed aim point (crosshair center) in screen percent 0-100. */
    this.aimCenterXPercent = 50;
    this.aimCenterYPercent = 50;
};

behavior_NKGunMode.prototype.onAnimate = function (node, timeMs) {
    // Mag size from editor property on first run
    if (nkGunAmmo && this.magSize && nkGunAmmo.magSize !== this.magSize) {
        nkGunAmmo.magSize = this.magSize;
        if (nkGunAmmo.ammoLoaded > nkGunAmmo.magSize) {
            nkGunAmmo.ammoLoaded = nkGunAmmo.magSize;
        }
    }

    if (!this.nodesCached) {
        this.cacheNodes();
        this.nodesCached = true;
    }

    if (!interactablesManager || !interactablesManager.isInGunMode() || interactablesManager.isPaused) {
        if (this.hudForcedOn) {
            this.showHud(false);
            this.hudForcedOn = false;
        }
        // Drop queued clicks so they cannot fire after resume
        this.mouseEventNextFrame = false;
        this.lastTimeMs = timeMs;
        return true;
    }

    if (!this.hudForcedOn) {
        this.showHud(true);
        this.redrawAmmo();
        this.hudForcedOn = true;
        this.recoilOffsetX = 0;
        this.recoilOffsetY = 0;
    }

    var delta = 16;
    if (this.lastTimeMs !== null) {
        delta = timeMs - this.lastTimeMs;
        if (delta > 200) {
            delta = 200;
        }
        if (delta < 0) {
            delta = 16;
        }
    }
    this.lastTimeMs = timeMs;
    var dtSec = delta / 1000.0;

    if (isJustPressed(NK_KEY_SPACE)) {
        interactablesManager.exitGunMode();
        this.showHud(false);
        this.hudForcedOn = false;
        this.recoilOffsetX = 0;
        this.recoilOffsetY = 0;
        return true;
    }

    this.updateRecoilDecay(dtSec);
    this.updateCrosshair(timeMs);
    this.updateEdgePan(dtSec);

    if (this.mouseEventNextFrame) {
        this.mouseEventNextFrame = false;
        this.tryFire(node, timeMs);
    }

    if (this.lastAmmoDrawn !== nkGunGetAmmoLoaded()) {
        this.redrawAmmo();
    }

    return true;
};

behavior_NKGunMode.prototype.onMouseEvent = function (event) {
    // Left mouse down (same as other NK behaviors)
    if (event === 3) {
        this.mouseEventNextFrame = true;
    }
};

behavior_NKGunMode.prototype.onKeyEvent = function (key, pressed) {
    // Space exit is handled in onAnimate via isJustPressed for consistency with manager
};

behavior_NKGunMode.prototype.cacheNodes = function () {
    this.nodeHudGun = ccbGetSceneNodeFromName('hud__gun');
    this.nodeCrosshair = ccbGetSceneNodeFromName('hud__gun_crosshair');
    this.nodeWeaponIcon = ccbGetSceneNodeFromName('hud__gun_weapon');
    this.nodeHealth = ccbGetSceneNodeFromName('hud__gun_health');
    this.nodeBulletsFolder = ccbGetSceneNodeFromName('hud__bullets');
    this.nodeBulletHole = ccbGetSceneNodeFromName(this.bulletHoleNodeName || 'bullet_hole');
    this.nodeSfxShot = ccbGetSceneNodeFromName('player__sfx_gun_shot');
    this.nodeSfxDry = ccbGetSceneNodeFromName('player__sfx_gun_shot_dry');

    this.bulletNodes = [];
    var i;
    for (i = 0; i < 10; i++) {
        var bn = ccbGetSceneNodeFromName('hud__bullets__' + i);
        if (!bn) {
            break;
        }
        this.bulletNodes.push(bn);
    }
};

behavior_NKGunMode.prototype.showHud = function (visible) {
    if (this.nodeHudGun) {
        ccbSetSceneNodeProperty(this.nodeHudGun, 'Visible', visible);
    }
    if (this.nodeCrosshair) {
        ccbSetSceneNodeProperty(this.nodeCrosshair, 'Visible', visible);
    }
    if (this.nodeBulletsFolder) {
        ccbSetSceneNodeProperty(this.nodeBulletsFolder, 'Visible', visible);
    }
};

/**
 * @param { number } minV
 * @param { number } maxV
 * @returns { number }
 */
behavior_NKGunMode.prototype.randomRange = function (minV, maxV) {
    return minV + Math.random() * (maxV - minV);
};

/**
 * @param { number } dtSec
 */
behavior_NKGunMode.prototype.updateRecoilDecay = function (dtSec) {
    var recovery = this.recoilRecoveryPerSec || 6;
    var k = recovery * dtSec;
    if (k > 1) {
        k = 1;
    }
    this.recoilOffsetX = this.recoilOffsetX * (1 - k);
    this.recoilOffsetY = this.recoilOffsetY * (1 - k);
    if (this.recoilOffsetX < 0.01 && this.recoilOffsetX > -0.01) {
        this.recoilOffsetX = 0;
    }
    if (this.recoilOffsetY < 0.01 && this.recoilOffsetY > -0.01) {
        this.recoilOffsetY = 0;
    }
};

/**
 * Hands shake + recoil around mouse. Updates aimCenter* for shooting.
 * @param { number } timeMs
 */
behavior_NKGunMode.prototype.updateCrosshair = function (timeMs) {
    if (!this.nodeCrosshair) {
        return;
    }
    var screenW = ccbGetScreenWidth();
    var screenH = ccbGetScreenHeight();
    if (screenW <= 0 || screenH <= 0) {
        return;
    }

    var mxPercent = (ccbGetMousePosX() / screenW) * 100;
    var myPercent = (ccbGetMousePosY() / screenH) * 100;

    var amp = this.shakeAmplitudePercent;
    if (amp === undefined || amp === null) {
        amp = 0.55;
    }
    var speed = this.shakeSpeed;
    if (speed === undefined || speed === null) {
        speed = 9;
    }
    var t = timeMs * 0.001 * speed;
    // Two incommensurate frequencies → less obvious looping
    var shakeX = Math.sin(t * 1.0) * amp + Math.sin(t * 2.37) * (amp * 0.35);
    var shakeY = Math.cos(t * 1.13) * amp + Math.sin(t * 1.91) * (amp * 0.4);

    var aimX = mxPercent + shakeX + this.recoilOffsetX;
    var aimY = myPercent + shakeY + this.recoilOffsetY;

    // Keep aim roughly on screen
    if (aimX < 2) {
        aimX = 2;
    } else if (aimX > 98) {
        aimX = 98;
    }
    if (aimY < 2) {
        aimY = 2;
    } else if (aimY > 98) {
        aimY = 98;
    }

    this.aimCenterXPercent = aimX;
    this.aimCenterYPercent = aimY;

    var halfW = this.crosshairHalfWidthPercent || 2;
    var halfH = this.crosshairHalfHeightPercent || 2;
    ccbSetSceneNodeProperty(this.nodeCrosshair, 'Pos X (percent)', aimX - halfW);
    ccbSetSceneNodeProperty(this.nodeCrosshair, 'Pos Y (percent)', aimY - halfH);
};

/**
 * Kick crosshair up and randomly left/right after a successful shot.
 */
behavior_NKGunMode.prototype.applyRecoil = function () {
    var upMin = this.recoilUpMinPercent;
    var upMax = this.recoilUpMaxPercent;
    var sideMin = this.recoilSideMinPercent;
    var sideMax = this.recoilSideMaxPercent;
    if (upMin === undefined || upMin === null) {
        upMin = 1.2;
    }
    if (upMax === undefined || upMax === null) {
        upMax = 2.8;
    }
    if (sideMin === undefined || sideMin === null) {
        sideMin = 0.4;
    }
    if (sideMax === undefined || sideMax === null) {
        sideMax = 1.6;
    }

    // Screen Y grows downward — kick "up" by decreasing Y
    this.recoilOffsetY -= this.randomRange(upMin, upMax);
    var side = this.randomRange(sideMin, sideMax);
    if (Math.random() < 0.5) {
        side = -side;
    }
    this.recoilOffsetX += side;
};

/**
 * @param { number } dtSec
 */
behavior_NKGunMode.prototype.updateEdgePan = function (dtSec) {
    var cam = globalCameraManager && globalCameraManager.gunCameraNode
        ? globalCameraManager.gunCameraNode
        : null;
    if (!cam) {
        return;
    }

    // Pan from where the crosshair is aiming, not raw mouse
    var nx = this.aimCenterXPercent / 100;
    var ny = this.aimCenterYPercent / 100;
    var margin = (this.edgeMarginPercent || 12) / 100.0;

    var yaw = 0;
    var pitch = 0;
    if (nx < margin) {
        yaw = -((margin - nx) / margin);
    } else if (nx > 1 - margin) {
        yaw = ((nx - (1 - margin)) / margin);
    }
    if (ny < margin) {
        pitch = ((margin - ny) / margin);
    } else if (ny > 1 - margin) {
        pitch = -((ny - (1 - margin)) / margin);
    }

    if (yaw === 0 && pitch === 0) {
        return;
    }

    var speed = (this.panSpeedDegrees || 55) * DEGREE_TO_RAD * dtSec;
    var yawRad = yaw * speed;
    var pitchRad = pitch * speed;
    var maxPitch = (this.maxPitchDegrees || 70) * DEGREE_TO_RAD;

    var pos = ccbGetSceneNodeProperty(cam, 'Position');
    var tar = ccbGetSceneNodeProperty(cam, 'Target');
    var look = tar.substract(pos);
    var focus = this.focusDistance || look.getLength();
    if (focus < 1) {
        focus = 100;
    }
    look.normalize();

    nkGunApplyYawPitchToLook(look, yawRad, pitchRad, maxPitch);

    var newTar = new vector3d(
        pos.x + look.x * focus,
        pos.y + look.y * focus,
        pos.z + look.z * focus
    );
    ccbSetSceneNodeProperty(cam, 'Target', newTar);
};

behavior_NKGunMode.prototype.tryFire = function (node, timeMs) {
    var now = Date.now();
    var cooldown = this.fireCooldownMs || 320;

    // Hard locks: wall-clock cooldown + at most one shot per engine frame
    if (now < this.nextFireTimeMs) {
        return;
    }
    if (typeof globalCurrentFrame !== 'undefined' && this.lastFireFrame === globalCurrentFrame) {
        return;
    }

    if (nkGunGetAmmoLoaded() <= 0) {
        this.nextFireTimeMs = now + cooldown;
        this.lastFireFrame = typeof globalCurrentFrame !== 'undefined' ? globalCurrentFrame : this.lastFireFrame;
        this.playSoundFromNode(this.nodeSfxDry);
        return;
    }

    var taken = nkGunConsumeAmmoLoaded(1);
    if (taken < 1) {
        return;
    }

    // Only after a real consume: arm cooldown and play shot feedback
    this.nextFireTimeMs = now + cooldown;
    this.lastFireFrame = typeof globalCurrentFrame !== 'undefined' ? globalCurrentFrame : -1;

    this.redrawAmmo();
    this.playSoundFromNode(this.nodeSfxShot);
    this.performRaycast();
    this.applyRecoil();
};

/**
 * @param { scenenode } soundNode
 */
behavior_NKGunMode.prototype.playSoundFromNode = function (soundNode) {
    if (!soundNode) {
        return;
    }
    ccbSetSceneNodeProperty(soundNode, 'PlayMode', 'nothing');
    ccbSetSceneNodeProperty(soundNode, 'PlayMode', 'play_once');
};

behavior_NKGunMode.prototype.performRaycast = function () {
    var cam = globalCameraManager && globalCameraManager.gunCameraNode
        ? globalCameraManager.gunCameraNode
        : null;
    if (!cam) {
        return;
    }

    // Aim through crosshair center (shake + recoil), not raw mouse
    var ndcX = (this.aimCenterXPercent / 100) * 2 - 1;
    var ndcY = 1 - (this.aimCenterYPercent / 100) * 2;
    var fovRad = 70 * DEGREE_TO_RAD;
    var yawOff = ndcX * (fovRad * 0.5);
    var pitchOff = ndcY * (fovRad * 0.5);
    var maxPitch = (this.maxPitchDegrees || 70) * DEGREE_TO_RAD;

    var pos = ccbGetSceneNodeProperty(cam, 'Position');
    var tar = ccbGetSceneNodeProperty(cam, 'Target');
    var look = tar.substract(pos);
    look.normalize();
    nkGunApplyYawPitchToLook(look, yawOff, pitchOff, maxPitch);

    var range = this.shootRange || 200;
    var end = new vector3d(
        pos.x + look.x * range,
        pos.y + look.y * range,
        pos.z + look.z * range
    );

    var hitTarget = this.raycastTargets(pos, end);
    if (hitTarget) {
        if (typeof hitTarget.onHit === 'function') {
            hitTarget.onHit(hitTarget.node, look);
        }
        return;
    }

    var worldHit = ccbGetCollisionPointOfWorldWithLine(
        pos.x, pos.y, pos.z,
        end.x, end.y, end.z
    );
    if (worldHit) {
        this.spawnBulletHole(worldHit, look);
    }
};

/**
 * @param { vector3d } start
 * @param { vector3d } end
 */
behavior_NKGunMode.prototype.raycastTargets = function (start, end) {
    var best = null;
    var bestDistSq = -1;
    var i;
    for (i = 0; i < nkGunTargets.length; i++) {
        var t = nkGunTargets[i];
        if (!t || !t.active || !t.node) {
            continue;
        }
        if (!ccbGetSceneNodeProperty(t.node, 'Visible')) {
            continue;
        }
        var hit = ccbDoesLineCollideWithBoundingBoxOfSceneNode(
            t.node,
            start.x, start.y, start.z,
            end.x, end.y, end.z
        );
        if (!hit) {
            continue;
        }
        var tpos = ccbGetSceneNodeProperty(t.node, 'PositionAbs');
        if (!tpos) {
            tpos = ccbGetSceneNodeProperty(t.node, 'Position');
        }
        var dx = tpos.x - start.x;
        var dy = tpos.y - start.y;
        var dz = tpos.z - start.z;
        var distSq = dx * dx + dy * dy + dz * dz;
        if (best === null || distSq < bestDistSq) {
            best = t;
            bestDistSq = distSq;
        }
    }
    return best;
};

/**
 * @param { vector3d } hitPos
 * @param { vector3d } lookDir
 */
behavior_NKGunMode.prototype.spawnBulletHole = function (hitPos, lookDir) {
    if (!this.nodeBulletHole) {
        return;
    }
    var clone = ccbCloneSceneNode(this.nodeBulletHole);
    if (!clone) {
        return;
    }
    var offset = new vector3d(
        hitPos.x - lookDir.x * 0.02,
        hitPos.y - lookDir.y * 0.02,
        hitPos.z - lookDir.z * 0.02
    );
    ccbSetSceneNodeProperty(clone, 'Position', offset);
    ccbSetSceneNodeProperty(clone, 'Visible', true);
};

behavior_NKGunMode.prototype.redrawAmmo = function () {
    var loaded = nkGunGetAmmoLoaded();
    var i;
    for (i = 0; i < this.bulletNodes.length; i++) {
        ccbSetSceneNodeProperty(this.bulletNodes[i], 'Visible', loaded > i);
    }
    this.lastAmmoDrawn = loaded;
};
