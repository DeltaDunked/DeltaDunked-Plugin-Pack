/*:
 * @plugindesc This plugin hides intro and extro text during battle.
 * @author DeltaDunked
 *
 * @param Switch
 * @type switch
 * @default 10
 * @desc The switch that controls whether battle intro and victory text is hidden.
 * @help 
 * Takes away the intro and outro text of battles. ("Enemy Appeared!" and 
 * "Player's party won!") It does not take away the battle commands, or ui like 
 * party members' states, hp, mp, or tp gauges.
 *
 *
 * Will only work when the specified switch is on. Select it in the parameters.
 */


var switchId = Number(PluginManager.parameters("DD_NoBattleText")["Switch"] || 10);

var _old_displayStartMessages = BattleManager.displayStartMessages;
BattleManager.displayStartMessages = function() {
    if ($gameSwitches.value(switchId)) {
        // The configured switch is ON: Do nothing (Silence the intro message)
    } else {
        // The configured switch is OFF: Play normal intro text
        _old_displayStartMessages.call(this);
    }
};

var _old_displayVictoryMessage = BattleManager.displayVictoryMessage;
BattleManager.displayVictoryMessage = function() {
    if ($gameSwitches.value(switchId)) {
        // The configured switch is ON: Do nothing (Silence victory message)
    } else {
        // The configured switch is OFF: Play normal victory text
        _old_displayVictoryMessage.call(this);
    }
};
