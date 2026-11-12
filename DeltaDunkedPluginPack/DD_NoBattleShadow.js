/*:
 * @plugindesc Removes the shadow under your party members during battle.
 * @author DeltaDunked
 *
 * @param Always On
 * @type boolean
 * @default false
 * @desc Remove every party member's battle shadow in every troop.
 *
 * @param Troop IDs
 * @type number[]
 * @min 1
 * @default ["3"]
 * @desc Remove shadows when battling any of these troops (unless Always On is enabled).
 *
 * @param Actor IDs
 * @type actor[]
 * @default ["1"]
 * @desc Remove shadows from any of these actors.
 *
 * @help
 * Removes the shadow under the party members during side-view battles. 
 * Choose to remove shadows for specific actors and specific troops (in the parameters).
 * 
 * If Always On is true, then all party member shadows will be removed in every battle.
 * If it's off, shadows will only be removed for the selected actors in the selected battles.
 */

(function() {
    var parameters = PluginManager.parameters('DD_NoBattleShadow');
    var alwaysOn = String(parameters['Always On']).toLowerCase() === 'true';
    var parseIdList = function(value, defaultValue) {
        var values;
        try {
            values = JSON.parse(value || '[]');
        } catch (error) {
            values = String(value || '').split(',');
        }
        if (!Array.isArray(values)) {
            values = [values];
        }
        values = values.map(Number).filter(function(id) {
            return id > 0;
        });
        return values.length > 0 ? values : defaultValue;
    };
    var troopIds = parseIdList(parameters['Troop IDs'], [3]);
    var actorIds = parseIdList(parameters['Actor IDs'], [1]);
    var _Sprite_Actor_updateShadow = Sprite_Actor.prototype.updateShadow;
    Sprite_Actor.prototype.updateShadow = function() {
        _Sprite_Actor_updateShadow.call(this);

        var troopMatches = troopIds.indexOf($gameTroop._troopId) !== -1;
        var actorMatches = this._actor && actorIds.indexOf(this._actor.actorId()) !== -1;
        if (alwaysOn || (troopMatches && actorMatches)) {
            this._shadowSprite.visible = false;
        }
    };
})();

