// The following embedded xml is for the editor and describes how the behavior can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <behavior jsname="behavior_NKGunTarget" description="NK - Gun Target (damageable) v1.0">
        <property name="hitPoints" type="int" default="3" />
        <property name="actionOnHit" type="action" default="" />
        <property name="actionOnDeath" type="action" default="" />
        <property name="removeOnDeath" type="bool" default="false" />
    </behavior>
*/

var behavior_NKGunTarget = function () {
    this.registered = false;
    this.currentHp = null;
    this.dead = false;
};

behavior_NKGunTarget.prototype.onAnimate = function (node, timeMs) {
    if (this.dead) {
        return false;
    }

    if (this.currentHp === null) {
        this.currentHp = this.hitPoints || 3;
    }

    if (!this.registered && typeof nkGunRegisterTarget === 'function') {
        var self = this;
        nkGunRegisterTarget(node, function (hitNode, lookDir) {
            self.handleHit(hitNode, lookDir);
        });
        this.registered = true;
    }

    return true;
};

behavior_NKGunTarget.prototype.handleHit = function (node, lookDir) {
    if (this.dead) {
        return;
    }

    this.currentHp -= 1;
    print('NK GunTarget: hit "' + ccbGetSceneNodeProperty(node, 'Name') + '" hp=' + this.currentHp);

    if (this.actionOnHit) {
        ccbInvokeAction(this.actionOnHit, node);
    }

    if (this.currentHp <= 0) {
        this.dead = true;
        if (typeof nkGunUnregisterTarget === 'function') {
            nkGunUnregisterTarget(node);
        }
        if (this.actionOnDeath) {
            ccbInvokeAction(this.actionOnDeath, node);
        }
        if (this.removeOnDeath) {
            ccbRemoveSceneNode(node);
        }
    }
};
