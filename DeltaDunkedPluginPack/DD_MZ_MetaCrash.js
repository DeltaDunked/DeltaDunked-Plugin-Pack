/*:
 * @target MZ
 * @plugindesc Autosaves, instantly crashes/closes the game, and skips the title screen on next boot if a specific switch is on.
 * @author DeltaDunked
 * 
 * @param Trigger Switch ID
 * @type switch
 * @desc The ID of the switch inside the save file that triggers the title screen bypass.
 * @default 10
 * 
 * @command metacrash
 * @text Meta Crash & Save
 * @desc Saves the game to the last used slot and immediately closes the window.
 *
 * @help This is if you want to do something very specific. 
 * Use the plugin command   MetaCrash   When it is used, the game autosaves 
 * (to the save file that was last saved in), then closes the game. If the selected 
 * switch is on, the title screen will be skipped.
 *
 * NOTE: This only works for MZ. If you are using MV, use the MV version of the
 * plugin that is in the same folder as the one this one is in.
 */

(function() {
    const pluginName = 'BypassTitleToCrashSave';
    const parameters = PluginManager.parameters(pluginName);
    const targetSwitchId = Number(parameters['Trigger Switch ID'] || 10);
    
    // =========================================================================
    // 1. EXECUTE AUTOSAVE & CLOSE (MZ Plugin Command)
    // =========================================================================
    PluginManager.registerCommand(pluginName, 'metacrash', args => {
        executeMetaCrash();
    });

    // Fallback: Legacy MV-style string command check just in case
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command.toLowerCase() === 'metacrash') {
            executeMetaCrash();
        }
    };

    function executeMetaCrash() {
        let currentSlot = DataManager.lastAccessedSavefileId();
        if (currentSlot === 0) currentSlot = 1; // Fallback if brand new game

        $gameSystem.onBeforeSave();
        
        // MZ uses Promises for saving. We must wait for the physical file write 
        // to complete BEFORE killing the game application process.
        DataManager.saveGame(currentSlot).then(() => {
            if (Utils.isNwjs()) {
                nw.Window.get().close(true);
            } else {
                SceneManager.exit();
                window.close();
            }
        }).catch(err => {
            console.error("MetaCrash auto-save failed:", err);
        });
    }

    // =========================================================================
    // 2. BOOT INTERCEPTION (MZ Architecture)
    // =========================================================================
    // In MZ, Scene_Boot.prototype.start handles the transition out of loading.
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        const lastSlot = DataManager.lastAccessedSavefileId();
        
        // Verify a save file exists first to prevent file-not-found errors
        if (lastSlot > 0 && DataManager.fileExists(lastSlot)) {
            const saveName = DataManager.makeSavename(lastSlot);
            
            // Read the file asynchronously without loading it into the live game state
            StorageManager.loadObject(saveName).then(contents => {
                if (contents && contents.switches && contents.switches._data[targetSwitchId] === true) {
                    
                    // The switch is ON! Fire MZ's official async load sequence.
                    DataManager.loadGame(lastSlot).then(() => {
                        SoundManager.playLoad();
                        this.fadeOutAll();    
                        
                        // Turn off the switch so they aren't trapped in an infinite boot loop
                        $gameSwitches.setValue(targetSwitchId, false);
                        
                        // Critical MZ scene and map reload pipeline
                        $gameSystem.onAfterLoad();
                        $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
                        $gamePlayer.requestMapReload();
                        
                        SceneManager.goto(Scene_Map);
                    }).catch(loadError => {
                        console.error("Failed executing DataManager.loadGame:", loadError);
                        _Scene_Boot_start.call(this);
                    });
                    
                } else {
                    // Switch is off, go to title normally
                    _Scene_Boot_start.call(this);
                }
            }).catch(error => {
                // If file reading fails entirely, fall back safely to title screen
                console.error("Error reading save file during boot check:", error);
                _Scene_Boot_start.call(this);
            });
        } else {
            // No save file found, proceed normally
            _Scene_Boot_start.call(this);
        }
    };
})();

