/*:
 * @target MV MZ
 * @plugindesc Reworks the main menu into a top command bar with party portraits to the midleft.
 * @author DeltaDunked
 *
 * @param Command Rows
 * @type number
 * @min 1
 * @default 2
 * @desc Number of command rows; the final row may contain fewer commands.
 *
 * @param Portrait Size
 * @type number
 * @min 48
 * @default 144
 * @desc Maximum width and height of each actor's portrait.
 *
 * @param Portrait Graphic
 * @type select
 * @option Face Sprite
 * @value face
 * @option Overworld Sprite
 * @value character
 * @option Battler
 * @value battler
 * @option Custom Picture
 * @value picture
 * @default face
 * @desc Graphic used for each actor's portrait.
 *
 * @param Custom Portrait Actors
 * @type actor[]
 * @default []
 * @desc Select actors that use custom pictures. Match each index to Custom Portrait Pictures.
 *
 * @param Custom Portrait Pictures
 * @type file[]
 * @dir img/pictures
 * @default []
 * @desc Select pictures in the same order as Custom Portrait Actors.
 *
 * @param Unblur Background
 * @type boolean
 * @default false
 * @desc Show a sharp snapshot behind the menu instead of RPG Maker's blurred background.
 *
 * @help
 *
 * Repositions menu to have commands at the top, and horizontal status on the 
 * mid-left.
 *
 * Choose between Face Sprite, Overworld Sprite, Battler, or custom Portrait.
 * 
 * ------------------------------Custom Portraits------------------------------
 *
 * If using custom portrait, match the ids of the list of actors to the image.
 * (Actor1 in the first list will use the image set to id1 in the second list.)
 *
 * Place your custom portraits in img/pictures.
 *
 * Actors without configured pictures use their face graphic.
 */

(function() {
    "use strict";

    var pluginName = "DD_AltMenu1";
    var parameters = PluginManager.parameters(pluginName);
    var legacyParameters = PluginManager.parameters("RpgRevampMenu");
    Object.keys(legacyParameters).forEach(function(key) {
        if (parameters[key] === undefined || parameters[key] === "") {
            parameters[key] = legacyParameters[key];
        }
    });
    var requestedCommandRows = Number(parameters["Command Rows"] || 2);
    var requestedPortraitSize = Number(parameters["Portrait Size"] || 144);
    var commandRows = isFinite(requestedCommandRows) ?
        Math.max(1, Math.floor(requestedCommandRows)) : 2;
    var portraitSize = isFinite(requestedPortraitSize) ?
        Math.max(48, requestedPortraitSize) : 144;
    var requestedPortraitGraphic = parameters["Portrait Graphic"] || "face";
    var portraitGraphic = requestedPortraitGraphic === "character" ||
        requestedPortraitGraphic === "Overworld Sprite" ? "character" :
        requestedPortraitGraphic === "battler" ||
        requestedPortraitGraphic === "Battler" ? "battler" :
        requestedPortraitGraphic === "picture" ||
        requestedPortraitGraphic === "Custom Picture" ? "picture" : "face";
    var customPortraits = {};
    var portraitActors;
    var portraitPictures;
    try {
        portraitActors = JSON.parse(parameters["Custom Portrait Actors"] || "[]");
        portraitPictures = JSON.parse(parameters["Custom Portrait Pictures"] || "[]");
    } catch (error) {
        console.error("DD_AltMenu1: Could not parse custom portrait parameters.", error);
        portraitActors = [];
        portraitPictures = [];
    }
    if (!Array.isArray(portraitActors) || !Array.isArray(portraitPictures)) {
        console.error("DD_AltMenu1: Custom portrait parameters must be arrays.");
    } else {
        if (portraitActors.length !== portraitPictures.length) {
            console.error(
                "DD_AltMenu1: Custom Portrait Actors and Custom Portrait Pictures " +
                "must have the same number of entries."
            );
        }
        for (var portraitIndex = 0;
                portraitIndex < Math.min(portraitActors.length, portraitPictures.length);
                portraitIndex++) {
            var actorId = Number(portraitActors[portraitIndex]);
            var pictureName = String(portraitPictures[portraitIndex] || "")
                .replace(/^.*[\\/]/, "")
                .replace(/\.png$/i, "");
            if (actorId > 0 && pictureName) {
                customPortraits[actorId] = pictureName;
            }
        }
    }
    var unblurBackground = parameters["Unblur Background"] === "true";
    var registeredCommands = [];
    var reservedSymbols = [
        "item", "skill", "equip", "status", "formation",
        "options", "save", "gameEnd", "cancel"
    ];

    window.RpgRevampMenu = window.RpgRevampMenu || {};

    window.RpgRevampMenu.registerCommand = function(name, symbol, handler, enabled) {
        if (!name || !symbol || typeof handler !== "function") {
            throw new Error("RpgRevampMenu.registerCommand requires a name, symbol, and handler.");
        }
        if (reservedSymbols.indexOf(symbol) >= 0) {
            throw new Error("The menu command symbol '" + symbol + "' is reserved.");
        }
        if (registeredCommands.some(function(command) {
            return command.symbol === symbol;
        })) {
            throw new Error("A menu command is already registered with symbol '" + symbol + "'.");
        }
        if (enabled !== undefined && typeof enabled !== "function") {
            throw new Error("The enabled argument must be a function when provided.");
        }
        registeredCommands.push({
            name: String(name),
            symbol: String(symbol),
            handler: handler,
            enabled: enabled || function() {
                return true;
            }
        });
    };

    var originalAddOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        originalAddOriginalCommands.call(this);
        registeredCommands.forEach(function(command) {
            this.addCommand(command.name, command.symbol, !!command.enabled());
        }, this);
    };

    Window_MenuCommand.prototype.maxCols = function() {
        var count = this._list ? this._list.length : 0;
        return Math.max(1, Math.ceil(count / commandRows));
    };

    Window_MenuCommand.prototype.numVisibleRows = function() {
        return this._rrVisibleRows || 1;
    };

    function makeWindow(windowClass, rect) {
        if (Utils.RPGMAKER_NAME === "MZ") {
            return new windowClass(rect);
        }
        return new windowClass(rect.x, rect.y, rect.width, rect.height);
    }

    function resizeWindow(window, x, y, width, height) {
        window.move(x, y, width, height);
        window.createContents();
        window.refresh();
    }

    function innerWidth(window) {
        return window.innerWidth !== undefined ? window.innerWidth : window.contentsWidth();
    }

    function innerHeight(window) {
        return window.innerHeight !== undefined ? window.innerHeight : window.contentsHeight();
    }

    function hideDefaultCursorForImageCursor(windowClass) {
        var originalUpdateCursor = windowClass.prototype._updateCursor;
        windowClass.prototype._updateCursor = function() {
            originalUpdateCursor.call(this);
            if (this._galvCursor && this._windowCursorSprite) {
                this._windowCursorSprite.visible = false;
            }
        };
    }

    hideDefaultCursorForImageCursor(Window_MenuCommand);

    function drawScaledActorBitmap(window, bitmap, sourceX, sourceY,
            sourceWidth, sourceHeight, x, y, width, height) {
        if (!window.contents || sourceWidth <= 0 || sourceHeight <= 0) {
            return;
        }
        var scale = Math.min(width / sourceWidth, height / sourceHeight);
        var drawWidth = sourceWidth * scale;
        var drawHeight = sourceHeight * scale;
        window.contents.blt(
            bitmap,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            x + (width - drawWidth) / 2,
            y + (height - drawHeight) / 2,
            drawWidth,
            drawHeight
        );
    }

    function drawScaledActorFace(window, actor, x, y, width, height) {
        var bitmap = ImageManager.loadFace(actor.faceName());
        var faceWidth = ImageManager.faceWidth || Window_Base._faceWidth || 144;
        var faceHeight = ImageManager.faceHeight || Window_Base._faceHeight || 144;
        var sourceX = (actor.faceIndex() % 4) * faceWidth;
        var sourceY = Math.floor(actor.faceIndex() / 4) * faceHeight;
        var draw = function() {
            drawScaledActorBitmap(
                window,
                bitmap,
                sourceX,
                sourceY,
                faceWidth,
                faceHeight,
                x,
                y,
                width,
                height
            );
        };
        if (bitmap.isReady()) {
            draw();
        } else {
            bitmap.addLoadListener(draw);
        }
    }

    function drawScaledActorCharacter(window, actor, x, y, width, height) {
        var characterName = actor.characterName();
        if (!characterName) {
            return;
        }
        var bitmap = ImageManager.loadCharacter(characterName);
        var draw = function() {
            var bigCharacter = ImageManager.isBigCharacter(characterName);
            var patternWidth = bitmap.width / (bigCharacter ? 3 : 12);
            var patternHeight = bitmap.height / (bigCharacter ? 4 : 8);
            var sourceX = bigCharacter ? patternWidth :
                (actor.characterIndex() % 4 * 3 + 1) * patternWidth;
            var sourceY = bigCharacter ? 0 :
                Math.floor(actor.characterIndex() / 4) * 4 * patternHeight;
            drawScaledActorBitmap(
                window,
                bitmap,
                sourceX,
                sourceY,
                patternWidth,
                patternHeight,
                x,
                y,
                width,
                height
            );
        };
        if (bitmap.isReady()) {
            draw();
        } else {
            bitmap.addLoadListener(draw);
        }
    }

    function drawScaledActorBattler(window, actor, x, y, width, height) {
        var battlerName = actor.battlerName();
        if (!battlerName) {
            return;
        }
        var bitmap = ImageManager.loadSvActor(battlerName);
        var draw = function() {
            var frameWidth = bitmap.width / 9;
            var frameHeight = bitmap.height / 6;
            drawScaledActorBitmap(
                window,
                bitmap,
                frameWidth,
                0,
                frameWidth,
                frameHeight,
                x,
                y,
                width,
                height
            );
        };
        if (bitmap.isReady()) {
            draw();
        } else {
            bitmap.addLoadListener(draw);
        }
    }

    function drawScaledActorPicture(window, actor, x, y, width, height) {
        var pictureName = customPortraits[actor.actorId()];
        if (!pictureName) {
            drawScaledActorFace(window, actor, x, y, width, height);
            return;
        }
        var bitmap = ImageManager.loadPicture(pictureName);
        var draw = function() {
            drawScaledActorBitmap(
                window,
                bitmap,
                0,
                0,
                bitmap.width,
                bitmap.height,
                x,
                y,
                width,
                height
            );
        };
        if (bitmap.isReady()) {
            draw();
        } else {
            bitmap.addLoadListener(draw);
        }
    }

    function drawActorPortrait(window, actor, x, y, width, height) {
        if (portraitGraphic === "character") {
            drawScaledActorCharacter(window, actor, x, y, width, height);
        } else if (portraitGraphic === "battler") {
            drawScaledActorBattler(window, actor, x, y, width, height);
        } else if (portraitGraphic === "picture") {
            drawScaledActorPicture(window, actor, x, y, width, height);
        } else {
            drawScaledActorFace(window, actor, x, y, width, height);
        }
    }

    if (unblurBackground && !SceneManager._rrUnblurBackgroundHookInstalled) {
        SceneManager._rrUnblurBackgroundHookInstalled = true;
        var originalSnapForBackground = SceneManager.snapForBackground;
        SceneManager.snapForBackground = function() {
            this._rrUnblurredBackgroundBitmap = this.snap();
            originalSnapForBackground.call(this);
        };
        var originalMenuBaseCreateBackground =
            Scene_MenuBase.prototype.createBackground;
        Scene_MenuBase.prototype.createBackground = function() {
            originalMenuBaseCreateBackground.call(this);
            if (SceneManager._rrUnblurredBackgroundBitmap) {
                this._backgroundSprite.bitmap =
                    SceneManager._rrUnblurredBackgroundBitmap;
            }
        };
    }

    var originalCreateCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        originalCreateCommandWindow.call(this);
        registeredCommands.forEach(function(command) {
            this._commandWindow.setHandler(command.symbol, command.handler.bind(this));
        }, this);

        var commandCount = this._commandWindow.maxItems();
        var columns = this._commandWindow.maxCols();
        var wantedRows = Math.max(1, Math.ceil(commandCount / columns));
        var lineHeight = this._commandWindow.lineHeight();
        var padding = this._commandWindow.padding;
        var memberCount = Math.max(1, $gameParty.members().length);
        var statusWindowWidth = Math.floor(Graphics.boxWidth * 0.7);
        var statusItemWidth = Math.floor(
            (statusWindowWidth - padding * 2 + this._commandWindow.spacing()) /
                memberCount -
            this._commandWindow.spacing()
        );
        var statusPortraitSize = Math.min(
            portraitSize,
            Math.max(1, statusItemWidth - 20)
        );
        var statusHeight = padding * 2 + lineHeight * 5 +
            statusPortraitSize + 56;
        var maxHeight = Math.max(
            lineHeight + padding * 2,
            Graphics.boxHeight - statusHeight
        );
        var visibleRows = Math.min(
            wantedRows,
            Math.max(1, Math.floor((maxHeight - padding * 2) / lineHeight))
        );
        this._commandWindow._rrVisibleRows = visibleRows;
        var commandHeight = visibleRows * lineHeight + padding * 2;
        resizeWindow(
            this._commandWindow,
            0,
            0,
            Graphics.boxWidth,
            commandHeight
        );
        this._commandWindow.setTopRow(0);
        this.addWindow(this._commandWindow);
    };

    Scene_Menu.prototype.createStatusWindow = function() {
        var y = this._commandWindow.height;
        var lineHeight = this._commandWindow.lineHeight();
        var padding = this._commandWindow.padding;
        var memberCount = Math.max(1, $gameParty.members().length);
        var statusWindowWidth = Math.floor(Graphics.boxWidth * 0.7);
        var statusItemWidth = Math.floor(
            (statusWindowWidth - padding * 2 + this._commandWindow.spacing()) /
                memberCount -
            this._commandWindow.spacing()
        );
        var statusPortraitSize = Math.min(
            portraitSize,
            Math.max(1, statusItemWidth - 20)
        );
        var height = padding * 2 + lineHeight * 5 +
            statusPortraitSize + 56;
        height = Math.min(height, Math.max(1, Graphics.boxHeight - y));
        var rect = {
            x: 0,
            y: y,
            width: statusWindowWidth,
            height: height
        };
        this._statusWindow = makeWindow(Window_RpgRevampMenuStatus, rect);
        this._statusWindow.setHandler("ok", this.onPersonalOk.bind(this));
        this._statusWindow.setHandler("cancel", this.onPersonalCancel.bind(this));
        this._statusWindow.deactivate();
        this.addWindow(this._statusWindow);
    };

    var originalCommandPersonal = Scene_Menu.prototype.commandPersonal;
    Scene_Menu.prototype.commandPersonal = function() {
        originalCommandPersonal.call(this);
        this._statusWindow.setHandler("ok", this.onPersonalOk.bind(this));
        this._statusWindow.setHandler("cancel", this.onPersonalCancel.bind(this));
    };

    var originalCommandFormation = Scene_Menu.prototype.commandFormation;
    Scene_Menu.prototype.commandFormation = function() {
        originalCommandFormation.call(this);
        this._statusWindow.setHandler("ok", this.onFormationOk.bind(this));
        this._statusWindow.setHandler("cancel", this.onFormationCancel.bind(this));
    };

    var originalCreateGoldWindow = Scene_Menu.prototype.createGoldWindow;
    Scene_Menu.prototype.createGoldWindow = function() {
        originalCreateGoldWindow.call(this);
        if (this._goldWindow) {
            this._goldWindow.hide();
        }
    };

    function Window_RpgRevampMenuStatus() {
        this.initialize.apply(this, arguments);
    }

    Window_RpgRevampMenuStatus.prototype = Object.create(Window_MenuStatus.prototype);
    Window_RpgRevampMenuStatus.prototype.constructor = Window_RpgRevampMenuStatus;

    Window_RpgRevampMenuStatus.prototype.initialize = function(x, y, width, height) {
        if (Utils.RPGMAKER_NAME === "MZ") {
            Window_Selectable.prototype.initialize.call(this, x);
        } else {
            Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        }
        this._formationMode = false;
        this._pendingIndex = -1;
        this.refresh();
    };

    hideDefaultCursorForImageCursor(Window_RpgRevampMenuStatus);

    Window_RpgRevampMenuStatus.prototype.maxCols = function() {
        return Math.max(1, $gameParty.members().length);
    };

    Window_RpgRevampMenuStatus.prototype.numVisibleRows = function() {
        return 1;
    };

    Window_RpgRevampMenuStatus.prototype.itemHeight = function() {
        return innerHeight(this);
    };

    Window_RpgRevampMenuStatus.prototype.refresh = function() {
        Window_MenuStatus.prototype.refresh.call(this);
        this.drawMenuCurrency();
    };

    Window_RpgRevampMenuStatus.prototype.drawMenuCurrency = function() {
        var width = Math.min(240, innerWidth(this));
        var x = innerWidth(this) - width;
        var y = 0;
        var unit = TextManager.currencyUnit;
        this.drawCurrencyValue($gameParty.gold(), unit, x, y, width);
    };

    Window_RpgRevampMenuStatus.prototype.drawItem = function(index) {
        var actor = $gameParty.members()[index];
        var rect = this.itemRect(index);
        var inset = 10;
        var contentX = rect.x + inset;
        var contentWidth = Math.max(1, rect.width - inset * 2);
        var top = rect.y + this.lineHeight() + 8;
        var faceSize = Math.min(portraitSize, contentWidth);
        var faceX = contentX + Math.floor((contentWidth - faceSize) / 2);
        var gaugeY;

        if (!actor) {
            return;
        }

        drawActorPortrait(this, actor, faceX, top, faceSize, faceSize);
        top += faceSize + 8;
        this.drawActorName(actor, contentX, top, contentWidth);
        top += this.lineHeight();
        this.drawActorLevel(actor, contentX, top, Math.min(90, contentWidth));
        gaugeY = top + this.lineHeight();
        if (gaugeY + this.lineHeight() * 2 <= rect.y + rect.height) {
            this.drawActorHp(actor, contentX, gaugeY, contentWidth);
            this.drawActorMp(actor, contentX, gaugeY + this.lineHeight(), contentWidth);
        }
    };

    Window_RpgRevampMenuStatus.prototype.drawAllItems = function() {
        Window_Selectable.prototype.drawAllItems.call(this);
        if ($gameParty.members().length === 0) {
            this.drawText(
                "No party members",
                0,
                this.lineHeight() + 8,
                innerWidth(this),
                "center"
            );
        }
    };
})();
