/*:
 * @plugindesc Patch for SRD_UndertaleBattleSystem to enable half-speed movement while holding X or Shift (Also works for the Cancel/Run button for controllers).
 * @author DeltaDunked
 * @help Place this plugin BELOW SRD_UndertaleBattleSystem in your Plugin Manager.
 */

(function() {
    'use strict';

    // Determine if the engine is RPG Maker MZ (Kept for your compatibility check)
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

    Input._updateGamepadState = function(gamepad) {
        if (gamepad) {
            const id = gamepad.id ? gamepad.id.toLowerCase() : "";
            const isNintendo = id.includes("nintendo") || id.includes("switch") || id.includes("joy-con") || id.includes("wii");
            const currentType = isNintendo ? "nintendo" : "standard";

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
        }
        if (_Input_updateGamepadState) _Input_updateGamepadState.call(this, gamepad);
    };

    // =========================================================================
    // 3. ENHANCED INPUT CONTROLLER (Intercepts Movement Commands)
    // =========================================================================
    
    // Internal ticker to measure game frames
    let slowModeFrameFlip = false;

    // Monitor frame rendering updates natively to cycle our boolean flag
    const _Graphics_render = Graphics.render;
    Graphics.render = function() {
        slowModeFrameFlip = !slowModeFrameFlip;
        if (_Graphics_render) _Graphics_render.apply(this, arguments);
    };

    // Low-level raw tracker bypassing mappings to ensure focus triggers securely
    function isFocusTriggered() {
        if (typeof Input === 'undefined') return false;
        
        // 1. Check if raw keys are actively pressed down (Shift: 16, X: 88, Esc: 27)
        if (Input._currentState[16] || Input._currentState[88] || Input._currentState[27]) {
            return true;
        }
        
        // 2. Check if mapped key blocks evaluate to true
        if (Input.isPressed('escape') || Input.isPressed('cancel')) {
            return true;
        }

        // 3. Fallback check for raw gamepad button data (Xbox Button 1 / Nintendo Button 0)
        if (navigator && navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                const gp = gamepads[i];
                if (gp && gp.buttons) {
                    if (gp.buttons[0] && gp.buttons[0].pressed) return true; // Switch B
                    if (gp.buttons[1] && gp.buttons[1].pressed) return true; // Xbox B
                }
            }
        }

        return false;
    }

    // Completely hook into the input engine to scale directional inputs
    const _Input_isPressed = Input.isPressed;
    Input.isPressed = function(keyName) {
        
        // Only modify movement commands when inside a battle sequence
        const isInBattle = (typeof SceneManager !== 'undefined' && SceneManager._scene instanceof Scene_Battle);

        if (isInBattle && ['left', 'right', 'up', 'down'].contains(keyName)) {
            if (isFocusTriggered()) {
                // If it's an odd-numbered frame, skip the input entirely (cutting speed by exactly 50%)
                if (slowModeFrameFlip) {
                    return false;
                }
            }
        }

        // Deltarune Dash Linking (Your original layout requirement)
        if (keyName === 'shift') {
            return _Input_isPressed.call(this, 'shift') || _Input_isPressed.call(this, 'escape');
        }

        return _Input_isPressed.call(this, keyName);
    };

})();
