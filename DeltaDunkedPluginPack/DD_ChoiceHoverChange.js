/*:
 * @target MV MZ
 * @plugindesc Changes the text of an option of a choice while being hovered over.
 * @author DeltaDunked
 * 
 * @param MorphPairs
 * @text Text Morph Pairs
 * @type struct<MorphPair>[]
 * @desc List of target words and what they should change into on hover.
 * @default []
 * 
 * @help
 * ===========================================================================
 * How To Use It:
 * ===========================================================================
 *
 * 1. Set up your text pairs in the Plugin Parameters.
 *
 * 2. When a choice text matches your "Target Text", it will change to the
 *    "Morphed Text" when hovered and route to the configured branch.
 *
 * 3. Set "Target Branch" for each pair to the event choice branch number
 *    (starting at 1). The default is branch 1.
 *
 * Basically type the text you want to change, then type the text you want
 * it to be changed to in its counterpart. Then select which branch of the
 * event you want it to follow.
 */

/*~struct~MorphPair:
 * @param TargetText
 * @text Target Choice Text
 * @type string
 * @desc The original text in the choice window (e.g., NO!).
 *
 * @param NewText
 * @text Morphed Choice Text
 * @type string
 * @desc The text it turns into on hover (e.g., YeS!?).
 *
 * @param TargetBranch
 * @text Target Branch
 * @type number
 * @min 1
 * @default 1
 * @desc The event choice branch to follow after selecting the morphed text (starting at 1).
 */

(function() {
    var pluginName = "DD_ChoiceHoverChange";
    var parameters = PluginManager.parameters(pluginName);
    var rawPairs = parameters['MorphPairs'] ? JSON.parse(parameters['MorphPairs']) : [];
    
    var morphMap = {};
    rawPairs.forEach(function(item) {
        var pair = JSON.parse(item);
        if (pair.TargetText && pair.NewText) {
            var targetBranch = Number(pair.TargetBranch || 1);
            morphMap[pair.TargetText] = {
                text: pair.NewText,
                branchIndex: Number.isInteger(targetBranch) && targetBranch > 0
                    ? targetBranch - 1
                    : 0
            };
        }
    });

    function getMorphPair(originalText) {
        return morphMap[originalText] || null;
    }

    // BLOCK 1: VISUAL MORPH
    var _Window_ChoiceList_commandName = Window_ChoiceList.prototype.commandName;
    Window_ChoiceList.prototype.commandName = function(index) {
        var originalText = _Window_ChoiceList_commandName.call(this, index);
        if (this._index === index) {
            var morphPair = getMorphPair(originalText);
            if (morphPair !== null) return morphPair.text;
        }
        return originalText;
    };

    // BLOCK 2: INPUT HIJACK
    var _Window_ChoiceList_callOkHandler = Window_ChoiceList.prototype.callOkHandler;
    Window_ChoiceList.prototype.callOkHandler = function() {
        if (this._index >= 0) {
            // Check the true original text array stored in the game's message data
            var choiceTextArray = $gameMessage.choices();
            var trueOriginalText = choiceTextArray[this._index];
            var morphPair = getMorphPair(trueOriginalText);
            
            // Apply the configured branch only when it exists in this choice list.
            if (morphPair !== null && morphPair.branchIndex < choiceTextArray.length) {
                this._index = morphPair.branchIndex;
            }
        }
        // Let the native handler process the selected branch and clear windows
        _Window_ChoiceList_callOkHandler.call(this);
    };

    // BLOCK 3: REFRESH ENGINE
    var _Window_ChoiceList_select = Window_ChoiceList.prototype.select;
    Window_ChoiceList.prototype.select = function(index) {
        var lastIndex = this._index;
        _Window_ChoiceList_select.call(this, index);
        if (lastIndex !== index && this.active) {
            this.refresh(); 
        }
    };
})();
