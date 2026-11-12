/*:
 * @plugindesc Modifies a skill's hit rate using a note tag.
 * @author DeltaDunked
 *
 * @help
 * ============================================================================
 * Custom Hit Rates
 * ============================================================================
 * 
 * Allows you to manually adjust individual skill accuracy values directly 
 * through a skill's note box.
 * 
 * ============================================================================
 * How To Use It:
 * ============================================================================
 * Go to your Database -> Skills tab. Choose a skill and in the Note box 
 * type the following tag, replacing X with a decimal value:
 *   <hit_mod: X>
 * 
 * Examples:
 *   <hit_mod: 0.20>   Increases accuracy by +20%
 *   <hit_mod: -0.15>  Decreases accuracy by -15%
 * 
 * NOTE: Ensure the skill's native "Success Rate" slider is set to 100% 
 * for accurate calculations. 
 * 
 * Also, if you are using YEP_BattleEngineCore, make sure that this plugin 
 * is placed under YEP_BattleEngineCore.
 */
// Detect if Yanfly's Battle Engine Core is present in the game engine

var _Game_Action_itemHit = Game_Action.prototype.itemHit;
Game_Action.prototype.itemHit = function(target) {
    // Check if the item exists and contains your custom hit modifier notetag
    if (this.item() && this.item().meta.hit_mod) {
        
        // 1. Let the active engine run completely (Yanfly or Default) to get the base float
        var baseHit = _Game_Action_itemHit.call(this, target);
        
        // 2. Parse your custom modifier value
        var modifier = Number(this.item().meta.hit_mod);
        
        // 3. Add the modifier to the calculated baseline and force negative floor boundaries
        return Math.max(-1.0, baseHit + modifier);
    }
    
    // Fallback if no custom notetag is specified on the skill or item
    return _Game_Action_itemHit.call(this, target);
};


