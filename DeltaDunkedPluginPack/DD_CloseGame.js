/*:
 * @target MV MZ
 * @plugindesc Adds a Close Game command to the Options or Quit Game menu.
 * @author DeltaDunked
 *
 * @param Command Location
 * @type select
 * @option Options Menu
 * @value options
 * @option Quit Game Menu
 * @value gameEnd
 * @default gameEnd
 *
 * @help
 * Use the Command Location parameter to place Close Game in the Options menu
 * or in the Quit Game menu (alongside Return to Title and Cancel).
 *
 * If using the option version and SRD_OptionsUpgrade:
 * 1. Place this plugin below SRD_OptionsUpgrade in your plugin manager.
 * 2. In the OptionsUpgrade parameters, set the Symbol exactly to: closeGameCommand
 * 3. (Remember to also fill out the category and description parameters.) 
 * 
 */

(function() {
    var commandSymbol = "closeGameCommand";
    var pluginParameters = PluginManager.parameters("DD_CloseGame");
    var commandInGameEnd = pluginParameters["Command Location"] === "gameEnd";

    // Detect if the engine running is RPG Maker MZ
    var isMZ = (typeof Utils !== 'undefined' && Utils.RPGMAKER_NAME === "MZ");

    // 1. DUAL-ENGINE STANDALONE NATIVE INJECTION
    var _Window_Options_makeCommandList = Window_Options.prototype.makeCommandList;
    Window_Options.prototype.makeCommandList = function() {
        _Window_Options_makeCommandList.call(this);
        if (commandInGameEnd) {
            for (var i = this._list.length - 1; i >= 0; i--) {
                if (this._list[i].symbol === commandSymbol) {
                    this._list.splice(i, 1);
                }
            }
        } else if (typeof Imported === 'undefined' || (!Imported.SRD_OptionsUpgrade && !Imported.MZ_OptionsCore)) {
            // Skip injection if SRD_OptionsUpgrade or common layout managers are detected
            this.addCommand("Close Game", commandSymbol);
        }
    };

    if (commandInGameEnd) {
        var _Window_GameEnd_makeCommandList = Window_GameEnd.prototype.makeCommandList;
        Window_GameEnd.prototype.makeCommandList = function() {
            _Window_GameEnd_makeCommandList.call(this);
            this.addCommand("Close Game", commandSymbol);
            var closeGameCommand = this._list.pop();
            var cancelIndex = this._list.length;
            for (var i = 0; i < this._list.length; i++) {
                if (this._list[i].symbol === "cancel") {
                    cancelIndex = i;
                    break;
                }
            }
            this._list.splice(cancelIndex, 0, closeGameCommand);
        };
    }

    // 2. TREATMENT FOR TOGGLE VS BUTTON BEHAVIOR
    var _Window_Options_statusText = Window_Options.prototype.statusText;
    Window_Options.prototype.statusText = function(index) {
        var symbol = this.commandSymbol(index);
        if (symbol === commandSymbol) {
            return ""; 
        }
        return _Window_Options_statusText.call(this, index);
    };

    var _Window_Options_processOk = Window_Options.prototype.processOk;
    Window_Options.prototype.processOk = function() {
        var symbol = this.commandSymbol(this.index());
        if (symbol === commandSymbol) {
            this.callHandler(commandSymbol);
            return;
        }
        _Window_Options_processOk.call(this);
    };

    // 3. UNIVERSAL SCENE HANDLER & WINDOW CREATION
    var _Scene_Options_createOptionsWindow = Scene_Options.prototype.createOptionsWindow;
    Scene_Options.prototype.createOptionsWindow = function() {
        _Scene_Options_createOptionsWindow.call(this);
        if (!commandInGameEnd) {
            setupExitConfirmation(this, this._optionsWindow);
        }
    };

    if (commandInGameEnd) {
        var _Scene_GameEnd_createCommandWindow = Scene_GameEnd.prototype.createCommandWindow;
        Scene_GameEnd.prototype.createCommandWindow = function() {
            _Scene_GameEnd_createCommandWindow.call(this);
            setupExitConfirmation(this, this._commandWindow);
        };
    }

    function setupExitConfirmation(scene, sourceWindow) {
        var width = 400;
        var height = isMZ ? 144 : 124; // Accounts for engine-specific default line heights
        var x = (Graphics.boxWidth - width) / 2;
        var y = (Graphics.boxHeight - height) / 2;

        if (isMZ) {
            // RPG Maker MZ Rectangle-based structure
            var rect = new Rectangle(x, y, width, height);
            scene._exitConfirmWindow = new Window_ExitConfirm(rect);
        } else {
            // RPG Maker MV older coordinate structure
            scene._exitConfirmWindow = new Window_ExitConfirm(x, y, width, height);
        }

        scene._exitConfirmWindow.setHandler('yes', function() { SceneManager.exit(); });
        var returnToSourceWindow = function() {
            scene._exitConfirmWindow.close();
            sourceWindow.activate();
        };
        scene._exitConfirmWindow.setHandler('no', returnToSourceWindow);
        scene._exitConfirmWindow.setHandler('cancel', returnToSourceWindow);
        sourceWindow.setHandler(commandSymbol, function() {
            sourceWindow.deactivate();
            scene._exitConfirmWindow.open();
            scene._exitConfirmWindow.activate();
            scene._exitConfirmWindow.select(1); // Auto-focuses "No" for safety
        });
        scene.addWindow(scene._exitConfirmWindow);
    }

    // --- 4. NEW CROSS-ENGINE CUSTOM CONFIRMATION WINDOW ---
    function Window_ExitConfirm() {
        this.initialize.apply(this, arguments);
    }

    Window_ExitConfirm.prototype = Object.create(Window_Command.prototype);
    Window_ExitConfirm.prototype.constructor = Window_ExitConfirm;

    Window_ExitConfirm.prototype.initialize = function(xOrRect, y, width, height) {
        if (isMZ) {
            // MZ expects a single Rectangle object
            Window_Command.prototype.initialize.call(this, xOrRect);
        } else {
            // MV expects separate x, y, width, height parameters
            Window_Command.prototype.initialize.call(this, xOrRect, y);
            this.width = width;
            this.height = height;
            this.refresh();
        }
        this.openness = 0; 
    };

    // Keep column layout uniform across both systems
    Window_ExitConfirm.prototype.maxCols = function() {
        return 2;
    };

    // Safe fallback dimensions for MV's dynamic system sizing loops
    Window_ExitConfirm.prototype.windowWidth = function() { return 400; };
    Window_ExitConfirm.prototype.windowHeight = function() { return 124; };

    Window_ExitConfirm.prototype.makeCommandList = function() {
        this.addCommand("Yes", 'yes');
        this.addCommand("No", 'no');
    };

    Window_ExitConfirm.prototype.refresh = function() {
        Window_Command.prototype.refresh.call(this);
        this.changeTextColor(this.systemColor());
        this.drawText("Close Game?", 0, -4, this.contentsWidth(), 'center');
    };

    Window_ExitConfirm.prototype.itemRect = function(index) {
        var rect = Window_Command.prototype.itemRect.call(this, index);
        rect.y += this.lineHeight() + (isMZ ? 10 : 12); 
        return rect;
    };

    Window_ExitConfirm.prototype.drawItem = function(index) {
        // Use engine-safe dynamic coordinate trackers
        var rect = isMZ ? this.itemLineRect(index) : this.itemRectForText(index);
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawText(this.commandName(index), rect.x, rect.y, rect.width, 'center');
    };
})();
