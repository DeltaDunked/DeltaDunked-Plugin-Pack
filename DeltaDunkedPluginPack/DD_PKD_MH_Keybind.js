/*:
 * @plugindesc Custom key and gamepad buttons to open/close Text log with PKD_MessageHistory seamlessly.
 *
 * @author DeltaDunked
 * @help For use with Pheonix KageDesu Message History.
 * https://kdworkshop.net/message-history/
 * 
 * Adds a button to open the text log instead of just an on screen icon.
 *
 *
 * Choose your preferred Keyboard Key and Gamepad Button independently in the
 * parameters.
 * 
 * @param Log Key
 * @desc Keyboard key (A-Z, pageup, shift etc.) to open the message history.
 * @default T
 * 
 * @param Controller Button
 * @desc Choose the gamepad button to open/close the history log.
 * @type select
 * @option Select / Back / Minus
 * @value select
 * @option L1 / LB (Left Bumper)
 * @value l1
 * @option R1 / RB (Right Bumper)
 * @value r1
 * @option L2 / LT (Left Trigger)
 * @value l2
 * @option R2 / RT (Right Trigger)
 * @value r2
 * @option X / Square
 * @value x
 * @option Y / Triangle
 * @value y
 * @default select
 */
(function() {
    var scriptName = 'DD_PKD_MH_Keybind';
    if (document.currentScript) {
        var match = document.currentScript.src.match(/([^\/]+)\.js$/);
        if (match) scriptName = match[1];
    }
    
    var parameters = PluginManager.parameters(scriptName);
    var rawKey = (parameters['Log Key'] || 'T').trim().toLowerCase();
    var padChoice = (parameters['Controller Button'] || 'select').trim().toLowerCase();

    var finalKeyName = 'custom_message_log_key';

    // 1. Map Keyboard Input Engine Safely
    var keyCodes = {
        'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70, 'g': 71, 'h': 72,
        'i': 73, 'j': 74, 'k': 75, 'l': 76, 'm': 77, 'n': 78, 'o': 79, 'p': 80,
        'q': 81, 'r': 82, 's': 83, 't': 84, 'u': 85, 'v': 86, 'w': 87, 'x': 88,
        'y': 89, 'z': 90
    };
    if (keyCodes[rawKey]) {
        Input.keyMapper[keyCodes[rawKey]] = finalKeyName;
    } else {
        finalKeyName = rawKey; 
    }

    // 2. Register Gamepad Button natively into RPG Maker's Input Engine
    // 0=A, 1=B, 2=X, 3=Y, 4=L1, 5=R1, 6=L2, 7=R2, 8=Select
    var padButtonIndex = 8; 
    if (padChoice === 'l1') padButtonIndex = 4;
    if (padChoice === 'r1') padButtonIndex = 5;
    if (padChoice === 'l2') padButtonIndex = 6;
    if (padChoice === 'r2') padButtonIndex = 7;
    if (padChoice === 'x') padButtonIndex = 2;
    if (padChoice === 'y') padButtonIndex = 3;

    Input.gamepadMapper[padButtonIndex] = finalKeyName;

    // 3. Handle OPENING from the Map Screen
    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        
        if (Input.isTriggered(finalKeyName)) {
            if (SceneManager._scene instanceof Scene_Map) {
                if (typeof OpenMessageHistoryScene === 'function') {
                    SoundManager.playOk();
                    OpenMessageHistoryScene();
                }
            }
        }
    };

    // 4. Handle CLOSING from the Message History Screen
    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        
        var targetSceneClass = null;
        if (typeof Scene_PKD_MessageHistory !== 'undefined') targetSceneClass = Scene_PKD_MessageHistory;
        else if (typeof Scene_MessageHistory !== 'undefined') targetSceneClass = Scene_MessageHistory;
        
        if (targetSceneClass) {
            var _custom_Scene_MH_update = targetSceneClass.prototype.update;
            targetSceneClass.prototype.update = function() {
                _custom_Scene_MH_update.call(this);
                
                if (Input.isTriggered(finalKeyName)) {
                    SoundManager.playCancel();
                    SceneManager.pop();
                }
            };
        }
    };
})();

