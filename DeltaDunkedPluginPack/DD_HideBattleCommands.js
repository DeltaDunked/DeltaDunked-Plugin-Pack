/*:
 * @target MV MZ
 * @plugindesc Battle command hiding via structural troop rules and dynamic plugin commands.
 * @author DeltaDunked
 *
 * @command HideAttack
 * @text Hide Attack
 * @desc Dynamically hides the Attack command for the remainder of this battle.
 *
 * @command HideSkill
 * @text Hide Skill
 * @desc Dynamically hides the Skill command for the remainder of this battle.
 *
 * @command HideGuard
 * @text Hide Guard
 * @desc Dynamically hides the Guard command for the remainder of this battle.
 *
 * @command HideItem
 * @text Hide Item
 * @desc Dynamically hides the Item command for the remainder of this battle.
 *
 * @command AddAttack
 * @text Add Attack
 * @desc Dynamically restores the Attack command if it was previously hidden.
 *
 * @command AddSkill
 * @text Add Skill
 * @desc Dynamically restores the Skill command if it was previously hidden.
 *
 * @command AddGuard
 * @text Add Guard
 * @desc Dynamically restores the Guard command if it was previously hidden.
 *
 * @command AddItem
 * @text Add Item
 * @desc Dynamically restores the Item command if it was previously hidden.
 *
 * @command HideAttackActor
 * @text Hide Attack for Actor
 * @desc Hides the Attack command for one actor for the remainder of this battle.
 *
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 1
 *
 * @command HideSkillActor
 * @text Hide Skill for Actor
 * @desc Hides the Skill command for one actor for the remainder of this battle.
 *
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 1
 *
 * @command HideGuardActor
 * @text Hide Guard for Actor
 * @desc Hides the Guard command for one actor for the remainder of this battle.
 *
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 1
 *
 * @command HideItemActor
 * @text Hide Item for Actor
 * @desc Hides the Item command for one actor for the remainder of this battle.
 *
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 1
 *
 * @command AddAttackActor
 * @text Add Attack for Actor
 * @desc Restores the Attack command for one actor during this battle.
 *
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 1
 *
 * @command AddSkillActor
 * @text Add Skill for Actor
 * @desc Restores the Skill command for one actor during this battle.
 *
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 1
 *
 * @command AddGuardActor
 * @text Add Guard for Actor
 * @desc Restores the Guard command for one actor during this battle.
 *
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 1
 *
 * @command AddItemActor
 * @text Add Item for Actor
 * @desc Restores the Item command for one actor during this battle.
 *
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 1
 *
 * @param commandRules
 * @text Command Hiding Rules
 * @desc Set up your customized list of commands to hide per Troop ID and active switches.
 * @type struct<HidingRule>[]
 * @default []
 *
 * @param partyCommandText
 * @text Do Nothing Command Text
 * @desc Text displayed in the actor command window when all combat commands are hidden.
 * @type string
 * @default Do Nothing
 *
 * @help 
 * ============================================================================
 * CONFIGURATION RULES
 * ============================================================================
 * Hide specific battle commands for specific battles. Hide 'attack', 'skill', 
 *'guard', or 'item' for specific Troop IDs. 
 *
 * Choose "Replace All with Do Nothing" to replace the 4 battle commands with
 * Do Nothing, which goes to the next actor's turn.
 *
 * If the switch is on, the commands will be hidden. If no switch is selected 
 * (or set to 0), the specified commands will always be hidden for that battle.
 *
 * Optionally select a target actor in each rule; actor ID 0 applies the rule
 * to every actor. 
 *
 *
 * ============================================================================
 * PLUGIN COMMANDS (MV)
 * ============================================================================
 * Call these via the "Plugin Command" event command in MV:
 *  HideAttack    |   AddAttack
 *  HideSkill     |   AddSkill
 *  HideGuard     |   AddGuard
 *  HideItem      |   AddItem
 *   . 
 * Actor Specific:
 * 
 *  HideAttackActor1   |   AddAttackActor1
 *  HideSkillActor1    |   AddSkillActor1
 *  HideGuardActor1    |   AddGuardActor1
 *  HideItemActor1     |   AddItemActor1
 * 
 *
 * ============================================================================
 * PLUGIN COMMANDS (MZ)
 * ============================================================================
 * Choose this plugin name from the dropdown menu in the modern MZ 
 * Plugin Command interface. Use the "for Actor" commands and choose an actor.
 */

/*~struct~HidingRule:
 * @param commandType
 * @text Command to Hide
 * @desc Choose a command to hide or replace all commands with Do Nothing.
 * @type select
 * @option attack
 * @option skill
 * @option guard
 * @option item
 * @option Replace All with Do Nothing
 * @default item
 *
 * @param targetTroopId
 * @text Target Troop ID
 * @desc The specific battle Troop ID where this option should be hidden.
 * @type troop
 * @default 1
 *
 * @param targetActorId
 * @text Target Actor
 * @desc The actor whose command is hidden (0 applies to all actors).
 * @type actor
 * @default 0
 *
 * @param conditionSwitchId
 * @text Required Switch ID
 * @desc Optional: The game switch that must be active to hide this (0 for always active during troop).
 * @type switch
 * @default 0
 */

(function() {
    // 1. Dynamic mid-battle state tracking variables
    var runtimeHiddenCommands = {
        attack: false,
        skill: false,
        guard: false,
        item: false
    };
    var runtimeHiddenActorCommands = {};

    var clearRuntimeFlags = function() {
        runtimeHiddenCommands.attack = false;
        runtimeHiddenCommands.skill = false;
        runtimeHiddenCommands.guard = false;
        runtimeHiddenCommands.item = false;
        runtimeHiddenActorCommands = {};
    };

    // Auto-wipe tracking states when transitions happen to ensure flags don't spill between battles
    var _BattleManager_setup = BattleManager.setup;
    BattleManager.setup = function(troopId, canEscape, canLose) {
        clearRuntimeFlags();
        _BattleManager_setup.call(this, troopId, canEscape, canLose);
    };

    // 2. Structural Parsing Fix (Handles double-encoded stringified objects from the Engine)
    var pluginName = 'DD_HideBattleCommands';
    var legacyPluginName = 'JD_HideBattleCommands';
    var getPluginParameters = function(name) {
        var params = PluginManager.parameters(name);
        if (params && Object.keys(params).length > 0) return params;
        return {};
    };
    var resolvePluginName = function() {
        if (PluginManager.parameters(pluginName) && Object.keys(PluginManager.parameters(pluginName)).length > 0) {
            return pluginName;
        }
        if (PluginManager.parameters(legacyPluginName) && Object.keys(PluginManager.parameters(legacyPluginName)).length > 0) {
            return legacyPluginName;
        }
        return pluginName;
    };
    pluginName = resolvePluginName();

    var parsePluginParameters = function() {
        var params = getPluginParameters(pluginName);
        if (!params['commandRules']) {
            params = getPluginParameters(legacyPluginName);
        }
        if (!params['commandRules']) return [];
        try {
            var outerArray = JSON.parse(params['commandRules']);
            return outerArray.map(function(itemStr) {
                var r = JSON.parse(itemStr);
                return {
                    commandType: String(r.commandType || '').trim().toLowerCase(),
                    targetTroopId: Number(r.targetTroopId || 0),
                    targetActorId: Number(r.targetActorId || 0),
                    conditionSwitchId: Number(r.conditionSwitchId || 0)
                };
            });
        } catch (e) {
            console.error(pluginName + ": Parameter parsing failed ->", e);
            return [];
        }
    };

    var hidingRules = parsePluginParameters();
    var parameters = getPluginParameters(pluginName);
    var doNothingText = String(parameters['partyCommandText'] || 'Do Nothing');

    // Evaluates background conditions & mid-battle flags cleanly
    var isCommandHidden = function(commandName, actorId) {
        if (runtimeHiddenCommands[commandName]) return true;
        var actorCommands = runtimeHiddenActorCommands[actorId];
        if (actorCommands && actorCommands[commandName]) return true;
        if (!$gameTroop) return false;

        var currentTroop = $gameTroop._troopId;
        return hidingRules.some(function(rule) {
            if (rule.commandType !== commandName.toLowerCase()) return false;
            if (rule.targetTroopId !== currentTroop) return false;
            if (rule.targetActorId > 0 && rule.targetActorId !== actorId) return false;
            if (rule.conditionSwitchId > 0 && !$gameSwitches.value(rule.conditionSwitchId)) return false;
            return true;
        });
    };

    var replacesAllCommandsWithDoNothing = function(actorId) {
        if (!$gameTroop) return false;
        var currentTroop = $gameTroop._troopId;
        return hidingRules.some(function(rule) {
            if (rule.commandType !== 'replace all with do nothing') return false;
            if (rule.targetTroopId !== currentTroop) return false;
            if (rule.targetActorId > 0 && rule.targetActorId !== actorId) return false;
            if (rule.conditionSwitchId > 0 && !$gameSwitches.value(rule.conditionSwitchId)) return false;
            return true;
        });
    };

    // ============================================================================
    // ■ PLUGIN COMMAND ENGINE REGISTRATION (MV & MZ INTEROP)
    // ============================================================================
    var setCommandHidden = function(commandName, hidden) {
        runtimeHiddenCommands[commandName] = hidden;
    };

    var setActorCommandHidden = function(commandName, hidden, actorId) {
        if (!isFinite(actorId) || actorId < 1 || Math.floor(actorId) !== actorId) {
            console.error(pluginName + ': Actor-specific command requires a valid actor ID.');
            return;
        }
        if (!runtimeHiddenActorCommands[actorId]) runtimeHiddenActorCommands[actorId] = {};
        runtimeHiddenActorCommands[actorId][commandName] = hidden;
    };

    if (Utils.RPGMAKER_NAME === 'MZ') {
        ['attack', 'skill', 'guard', 'item'].forEach(function(commandName) {
            var title = commandName.charAt(0).toUpperCase() + commandName.slice(1);
            PluginManager.registerCommand(pluginName, 'Hide' + title, function() {
                setCommandHidden(commandName, true);
            });
            PluginManager.registerCommand(pluginName, 'Add' + title, function() {
                setCommandHidden(commandName, false);
            });
            PluginManager.registerCommand(pluginName, 'Hide' + title + 'Actor', function(args) {
                setActorCommandHidden(commandName, true, Number(args.actorId));
            });
            PluginManager.registerCommand(pluginName, 'Add' + title + 'Actor', function(args) {
                setActorCommandHidden(commandName, false, Number(args.actorId));
            });
        });
    } else {
        var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
        Game_Interpreter.prototype.pluginCommand = function(command, args) {
            _Game_Interpreter_pluginCommand.call(this, command, args);
            var cmd = command.toLowerCase();
            var match = /^(hide|add)(attack|skill|guard|item)(?:actor(\d+))?$/.exec(cmd);
            if (match) {
                var hidden = match[1] === 'hide';
                if (match[3]) {
                    setActorCommandHidden(match[2], hidden, Number(match[3]));
                } else {
                    setCommandHidden(match[2], hidden);
                }
            }
        };
    }

    // === 1. ACTOR COMMAND WINDOW (Re-built to completely bypass native duplication bugs) ===
    Window_ActorCommand.prototype.makeCommandList = function() {
        this.clearCommandList();
        if (this._actor) {
            var actorId = this._actor.actorId();
            var allCommandsHidden = replacesAllCommandsWithDoNothing(actorId) ||
                (isCommandHidden('attack', actorId) &&
                    isCommandHidden('skill', actorId) &&
                    isCommandHidden('guard', actorId) &&
                    isCommandHidden('item', actorId));
            if (allCommandsHidden) {
                this.addCommand(doNothingText, 'donothing');
            } else {
                if (!isCommandHidden('attack', actorId)) this.addAttackCommand();
                if (!isCommandHidden('skill', actorId)) this.addSkillCommands();
                if (!isCommandHidden('guard', actorId)) this.addGuardCommand();
                if (!isCommandHidden('item', actorId)) this.addItemCommand();
            }
        }
    };

    // === 2. BATTLE SCENE HANDLER ===
    var _Scene_Battle_createActorCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
    Scene_Battle.prototype.createActorCommandWindow = function() {
        _Scene_Battle_createActorCommandWindow.call(this);
        this._actorCommandWindow.setHandler('donothing', this.commandDoNothing.bind(this));
    };

    Scene_Battle.prototype.commandDoNothing = function() {
        var action = BattleManager.inputtingAction();
        if (action) action.clear();
        this.selectNextCommand();
    };
})();
