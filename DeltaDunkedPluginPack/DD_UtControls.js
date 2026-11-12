/*:
 * @target MV MZ
 * @plugindesc Mimics UNDERTALE's controls.
 * @author DeltaDunked
 * @help Remaps controls to be the same as UNDERTALE. 
 *
 * So on keyboard: Z is confirm,Shift/X are Run/Cancel, and C is Menu/Fast Text.
 * On Xbox gamepad: A is confirm, B is Run/Cancel, and Y is Menu/Fast Text.
 * Controllers have both left joystick and d-pad functionality.
 * (Not sure about Switch or Playstation controllers; I can't test it.)
 */

(function() {
    // Determine if the engine is RPG Maker MZ
    const isMZ = typeof Utils !== 'undefined' && Utils.RPGMAKER_NAME === 'MZ';

    // =========================================================================
    // 1. KEYBOARD REMAPPING (Deltarune Standard)
    // =========================================================================
    Input.keyMapper[16] = 'escape';    // Shift = Cancel & Run
    Input.keyMapper[88] = 'escape';    // X = Cancel & Run
    Input.keyMapper[67] = 'menuOnly';  // C = Menu & Instant Skip

    // =========================================================================
    // 2. DYNAMIC GAMEPAD MAPPER
    // =========================================================================
    const _Input_updateGamepadState = Input._updateGamepadState;
    let lastControllerType = null;
    const gamepadDpadStates = {};

    Input._updateGamepadState = function(gamepad) {
        if (gamepad) {
            const id = gamepad.id ? gamepad.id.toLowerCase() : "";
            const isNintendo = id.includes("nintendo") || id.includes("switch") || id.includes("joy-con") || id.includes("wii");
            const currentType = isNintendo ? "nintendo" : "standard";

            // Changes global map only when a new controller type is detected
            if (lastControllerType !== currentType) {
                lastControllerType = currentType;
                if (isNintendo) {
                    // NINTENDO SWITCH LAYOUT (B = Cancel, A = Confirm, X = Menu)
                    Input.gamepadMapper[0] = 'escape';   // 0 = Bottom Button (B) -> Cancel/Run
                    Input.gamepadMapper[1] = 'ok';       // 1 = Right Button  (A) -> Confirm
                    Input.gamepadMapper[2] = 'none';     // 2 = Left Button   (Y)
                    Input.gamepadMapper[3] = 'menuOnly'; // 3 = Top Button    (X) -> Menu/Skip
                } else {
                    // XBOX / STANDARD PC LAYOUT (A = Confirm, B = Cancel, Y = Menu)
                    Input.gamepadMapper[0] = 'ok';       // 0 = Bottom Button (A) -> Confirm
                    Input.gamepadMapper[1] = 'escape';   // 1 = Right Button  (B) -> Cancel/Run
                    Input.gamepadMapper[2] = 'none';     // 2 = Left Button   (X)
                    Input.gamepadMapper[3] = 'menuOnly'; // 3 = Top Button    (Y) -> Menu/Skip
                }
            }
            Input.gamepadMapper[12] = 'up';    // D-pad up
            Input.gamepadMapper[13] = 'down';  // D-pad down
            Input.gamepadMapper[14] = 'left';  // D-pad left
            Input.gamepadMapper[15] = 'right'; // D-pad right
        }
        _Input_updateGamepadState.call(this, gamepad);

        if (gamepad && gamepad.buttons) {
            const dpadDirections = ['up', 'down', 'left', 'right'];
            const previousDpadState = gamepadDpadStates[gamepad.index] || [];
            const currentDpadState = [];
            const axes = gamepad.axes || [];
            // Unmapped controllers can expose the D-pad as a hat on axes 6 and 7.
            const hasHatAxes = gamepad.mapping !== 'standard' && axes.length >= 8;
            for (let i = 0; i < dpadDirections.length; i++) {
                const button = gamepad.buttons[i + 12];
                const buttonPressed = !!button && (button.pressed || button.value > 0.5);
                const axisPressed = hasHatAxes && (
                    (i === 0 && axes[7] < -0.5) ||
                    (i === 1 && axes[7] > 0.5) ||
                    (i === 2 && axes[6] < -0.5) ||
                    (i === 3 && axes[6] > 0.5)
                );
                const isPressed = buttonPressed || axisPressed;
                currentDpadState[i] = isPressed;
                if (isPressed || isPressed !== !!previousDpadState[i]) {
                    this._currentState[dpadDirections[i]] = isPressed;
                }
            }
            gamepadDpadStates[gamepad.index] = currentDpadState;
        }
    };

    // =========================================================================
    // 3. DASH LINKING (Keeps Shift/X running)
    // =========================================================================
    const _Input_isPressed = Input.isPressed;
    Input.isPressed = function(keyName) {
        // Deltarune allows dashing by holding the Cancel button ('escape')
        if (keyName === 'shift') {
            return _Input_isPressed.call(this, 'shift') || _Input_isPressed.call(this, 'escape');
        }
        return _Input_isPressed.call(this, keyName);
    };

    // =========================================================================
    // 4. SEVER ESCAPE FROM MENU
    // =========================================================================
    if (isMZ) {
        // MZ Menu Call Modification
        const _Scene_Map_updateScene = Scene_Map.prototype.updateScene;
        Scene_Map.prototype.updateScene = function() {
            _Scene_Map_updateScene.call(this);
            if (!SceneManager.isSceneChanging() && this.isMenuEnabled() && Input.isTriggered('menuOnly')) {
                this.callMenu();
            }
        };
    } else {
        // MV Menu Call Modification
        Scene_Map.prototype.isMenuCalled = function() {
            return Input.isTriggered('menuOnly');
        };

        Scene_Map.prototype.updateCallMenu = function() {
            if (this.isMenuEnabled()) {
                if (this.isMenuCalled()) {
                    this.menuCalling = true;
                }
                if (this.menuCalling && !$gamePlayer.isMoving()) {
                    this.callMenu();
                }
            } else {
                this.menuCalling = false;
            }
        };
    }

    // =========================================================================
    // 5. INSTANT TEXT BOX SKIP (C / Top Gamepad Button)
    // =========================================================================
    const _Window_Message_update = Window_Message.prototype.update;
    Window_Message.prototype.update = function() {
        _Window_Message_update.call(this);
        
        if (this.isOpen() && this.active && Input.isPressed('menuOnly')) {
            if (isMZ) {
                // Safe MZ Message Clear
                this._textState = null;
                this._showFast = true;
                this.pause = false;
                this.terminateMessage();
                if (this._textRect) this._textRect = null; 
            } else {
                // Safe MV Message Clear
                this._textState = null; 
                this._showFast = true;  
                this.pause = false;     
                this.terminateMessage(); 
            }
        }
    };
})();
