/*:
 * @plugindesc Removes the escape sound effect during the Abort Battle command.
 * @author DeltaDunked
 * @help 
 * Doesn't play the escape sound effect when using Abort Battle command.
 */

(function() {
    BattleManager.checkAbort = function() {
        if ($gameParty.isEmpty() || this.isAborting()) {
            this._escaped = true;
            this.processAbort();
        }
        return false;
    };
})();

