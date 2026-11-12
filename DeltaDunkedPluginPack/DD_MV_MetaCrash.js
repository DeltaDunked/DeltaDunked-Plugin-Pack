/*:
 * @target MV
 * @plugindesc All-in-one Meta-Crash handler. Saves, exits, and conditionally skips title screen.
 * @author DeltaDunked
 * 
 * @param Trigger Switch ID
 * @type switch
 * @desc The game switch that controls whether the title screen is bypassed on boot.
 * @default 10
 *
 * @help This is if you want to do something very specific. 
 * Use the plugin command   MetaCrash   When it is used, the game autosaves 
 * (to the save file that was last saved in), then closes the game. If the selected 
 * switch is on, the title screen will be skipped.
 *
 * NOTE: This only works for MV. If you are using MZ, use the MZ version of the
 * plugin that is in the same folder as the one this one is in.
 */

(function() {
    // 🌟 FIX: Dynamically grabs parameters no matter what you name the .js file!
    var pluginName = document.currentScript.src.match(/\/([^\/]+)\.js/)[1];
    var parameters = PluginManager.parameters(pluginName);
    var targetSwitchId = Number(parameters['Trigger Switch ID'] || 10);

    // =========================================================================
    // 1. The Fixed Meta Crash Execution Command
    // =========================================================================
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        
        if (command.toLowerCase() === 'metacrash') {
            var currentSlot = DataManager.lastAccessedSavefileId();
            if (currentSlot === 0) currentSlot = 1;

            // Instantly clear the interpreter wait state so it doesn't freeze the event on load
            this._index++; 
            
            $gameSystem.onBeforeSave();
            DataManager.saveGame(currentSlot);
            
            // Hard Shut Down
            if (Utils.isNwjs()) {
                nw.Window.get().close(true);
            } else {
                SceneManager.exit();
                window.close();
            }
        }
    };

    // =========================================================================
    // 2. The Bulletproof Native Title Bypass Engine
    // =========================================================================
    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        var lastSlot = DataManager.lastAccessedSavefileId();
        if (lastSlot === 0) lastSlot = 1;

        // Verify the physical file exists before executing memory reading
        if (DataManager.isThisGameFile(lastSlot)) {
            // Load the savefile completely so switches are initialized
            if (DataManager.loadGame(lastSlot)) {
                
                // If your chosen switch is ON in the file data
                if ($gameSwitches.value(targetSwitchId)) {
                    
                    // BREAK THE LOOP: Immediately turn the switch OFF in memory
                    $gameSwitches.setValue(targetSwitchId, false);
                    
                    // Rewrite the file cleanly to the drive right now with the switch OFF
                    $gameSystem.onBeforeSave();
                    DataManager.saveGame(lastSlot);
                    
                    // Native direct map boot routing
                    SoundManager.playLoad();
                    this.fadeOutAll();
                    SceneManager.goto(Scene_Map);
                    return; 
                } else {
                    DataManager.setupNewGame();
                }
            }
        }
        // Normal boot fallback
        _Scene_Boot_start.call(this);
    };
})();

