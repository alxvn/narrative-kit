// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKOpenInventory" description="NK - Open Inventory v1.0">
        <property name="inventorySceneName" type="string" default="inventory" />
        <property name="returnPointerNodeName" type="string" default="" />
    </action>
*/

var okeEventHandler,OkeEventHandler=function(){this.eventHandlers=[],this.lastTime=null,this.currentTime=null,this.dt=null,this.nullCount=0};OkeEventHandler.prototype.updateDt=function(){return this.currentTime=Date.now(),this.dt=this.currentTime-this.lastTime,this.dt>200&&(this.dt=200),this.lastTime=this.currentTime,this},OkeEventHandler.prototype.registerEvent=function(e){this.eventHandlers.push(e)},OkeEventHandler.prototype.unregisterEvent=function(e){for(var t=0;t<this.eventHandlers.length;t++)if(this.eventHandlers[t]===e)return this.eventHandlers[t]=null,void(this.nullCount+=1)},OkeEventHandler.prototype.clearAllEvents=function(){this.eventHandlers.length=0,this.nullCount=0},OkeEventHandler.prototype.cleanUpDoneEvents=function(){if(this.nullCount>15){this.nullCount=0;for(var e=[],t=0;t<this.eventHandlers.length;t++)null!==this.eventHandlers[t]&&e.push(this.eventHandlers[t]);this.eventHandlers=e}},OkeEventHandler.prototype.executeEvents=function(){for(var e=0;e<this.eventHandlers.length;e++)null!==this.eventHandlers[e]&&this.eventHandlers[e](this.dt);return this},okeEventHandler||(print("Global event manager initialized!"),(okeEventHandler=new OkeEventHandler).lastTime=Date.now(),ccbRegisterOnFrameEvent((function(){okeEventHandler.updateDt().executeEvents().cleanUpDoneEvents()})));

action_NKOpenInventory = function () {};

action_NKOpenInventory.prototype.execute = function (node) {
    if (!this.inventorySceneName || !interactablesManager) {
        print('NK Open Inventory: missing inventorySceneName or interactablesManager');
        return;
    }

    // Capture focus BEFORE turnOff / scene switch clears gameplay raycast state
    var focusedName = '';
    if (typeof interactablesManager.getFocusedInteractableNodeName === 'function') {
        focusedName = interactablesManager.getFocusedInteractableNodeName();
    } else {
        focusedName = interactablesManager.focusedInteractableNodeName || '';
    }

    if (typeof nkInventoryPrepareOpen === 'function') {
        // RETURN_SCENE_NAME is read inside prepareOpen via ccbGetCopperCubeVariable
        nkInventoryPrepareOpen(focusedName, this.returnPointerNodeName || '');
    } else {
        print('NK Open Inventory: behavior_NKInventory is not loaded (nkInventoryPrepareOpen missing)');
        return;
    }

    // Non-gameplay scene: inventory UI
    if (typeof nkInventoryScheduleSwitchToScene === 'function') {
        nkInventoryScheduleSwitchToScene(this.inventorySceneName, '', false);
    } else {
        interactablesManager.turnOff();
        interactablesManager.scheduleSwitchToAnotherScene(this.inventorySceneName, '', true);
    }
};
