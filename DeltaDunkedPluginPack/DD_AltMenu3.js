/*:
 * @target MV MZ
 * @plugindesc OMORI/deltarune-inspired menu layout with a top command bar and bottom party images.
 * @author DeltaDunked
 *
 * @param Maximum Columns
 * @type number
 * @min 1
 * @default 8
 * @desc Maximum number of commands shown in each row.
 *
 * @param Command Rows
 * @type number
 * @min 1
 * @default 2
 * @desc Target number of command rows; rows with no commands are not shown.
 *
 * @param Portrait Size
 * @type number
 * @min 32
 * @default 144
 * @desc Maximum width and height of each actor portrait.
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
 * @param Full Portrait Above Name/Level
 * @type boolean
 * @default true
 * @desc Put a portrait (up to Portrait Size) above one row with the name and level.
 *
 * @help
 *
 * Mimics Omori's menu layout.
 * Displays menu commands in a compact bar at the top, leaves the game
 * background visible in the middle, and shows party portraits and status
 * along the bottom.
 *
 * Command Rows sets the target number of rows; Maximum Columns can add
 * rows when needed to keep the number of columns within its limit.
 *
 * Enable Full Portrait Above Name/Level to place each portrait above a
 * single row containing the actor's name and level.
 *
 * Choose between Face Sprite, Overworld Sprite, Battler, or Custom Portrait.
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

    var parameters = PluginManager.parameters("DD_AltMenu3");
    var legacyParameters = PluginManager.parameters("RpgRevampMenu");
    Object.keys(legacyParameters).forEach(function(key) {
        if (parameters[key] === undefined || parameters[key] === "") {
            parameters[key] = legacyParameters[key];
        }
    });
    var requestedColumns = Number(parameters["Maximum Columns"] || 8);
    var requestedCommandRows = Number(parameters["Command Rows"] || 2);
    var requestedPortraitSize = Number(parameters["Portrait Size"] || 64);
    var maxColumns = isFinite(requestedColumns) ? Math.max(1, requestedColumns) : 8;
    var commandRows = isFinite(requestedCommandRows) ?
        Math.max(1, Math.floor(requestedCommandRows)) : 2;
    var portraitSize = isFinite(requestedPortraitSize) ?
        Math.max(32, requestedPortraitSize) : 64;
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
        console.error("DD_AltMenu3: Could not parse custom portrait parameters.", error);
        portraitActors = [];
        portraitPictures = [];
    }
    if (!Array.isArray(portraitActors) || !Array.isArray(portraitPictures)) {
        console.error("DD_AltMenu3: Custom portrait parameters must be arrays.");
    } else {
        if (portraitActors.length !== portraitPictures.length) {
            console.error(
                "DD_AltMenu3: Custom Portrait Actors and Custom Portrait Pictures " +
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
    var fullPortraitAboveNameLevel =
        parameters["Full Portrait Above Name/Level"] === "true";
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
    Window_MenuCommand.prototype.maxCols = function() {
        var count = this._list ? this._list.length : 0;
        if (count <= 0) {
            return maxColumns;
        }
        return Math.max(1, Math.min(maxColumns, Math.ceil(count / commandRows)));
    };

    Window_MenuCommand.prototype.numVisibleRows = function() {
        return this._rrVisibleRows || 1;
    };

    Window_MenuCommand.prototype.itemTextAlign = function() {
        return "center";
    };

    var originalMenuCommandStandardFontSize =
        Window_MenuCommand.prototype.standardFontSize;
    Window_MenuCommand.prototype.standardFontSize = function() {
        return this._rrCommandFontSize || originalMenuCommandStandardFontSize.call(this);
    };

    var originalMenuCommandDrawItem = Window_MenuCommand.prototype.drawItem;
    Window_MenuCommand.prototype.drawItem = function(index) {
        var originalFontFace = this.contents.fontFace;
        var originalFontSize = this.contents.fontSize;
        this.contents.fontFace = this.standardFontFace();
        this.contents.fontSize = this.standardFontSize();
        originalMenuCommandDrawItem.call(this, index);
        this.contents.fontFace = originalFontFace;
        this.contents.fontSize = originalFontSize;
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

    function commandFontSize(window, windowWidth) {
        var baseSize = originalMenuCommandStandardFontSize.call(window);
        var originalFontFace = window.contents.fontFace;
        var originalFontSize = window.contents.fontSize;
        var maxLabelWidth = 0;
        window.contents.fontFace = window.standardFontFace();
        window.contents.fontSize = baseSize;
        for (var i = 0; i < window.maxItems(); i++) {
            maxLabelWidth = Math.max(
                maxLabelWidth,
                window.contents.measureTextWidth(window.commandName(i))
            );
        }
        window.contents.fontFace = originalFontFace;
        window.contents.fontSize = originalFontSize;
        var spacing = window.spacing();
        var itemWidth = Math.floor(
            (windowWidth - window.padding * 2 + spacing) / window.maxCols() -
            spacing
        );
        var availableWidth = itemWidth - window.textPadding() * 2;
        return maxLabelWidth > availableWidth ?
            Math.max(12, Math.floor(baseSize * availableWidth / maxLabelWidth)) :
            baseSize;
    }

    function drawScaledActorFace(window, actor, x, y, size) {
        var bitmap = ImageManager.loadFace(actor.faceName());
        var faceWidth = ImageManager.faceWidth || Window_Base._faceWidth || 144;
        var faceHeight = ImageManager.faceHeight || Window_Base._faceHeight || 144;
        var sourceX = (actor.faceIndex() % 4) * faceWidth;
        var sourceY = Math.floor(actor.faceIndex() / 4) * faceHeight;
        var draw = function() {
            if (window.contents) {
                window.contents.blt(
                    bitmap,
                    sourceX,
                    sourceY,
                    faceWidth,
                    faceHeight,
                    x,
                    y,
                    size,
                    size
                );
            }
        };
        if (bitmap.isReady()) {
            draw();
        } else {
            bitmap.addLoadListener(draw);
        }
    }

    function drawScaledActorBitmap(window, bitmap, sourceX, sourceY,
            sourceWidth, sourceHeight, x, y, size) {
        if (!window.contents || sourceWidth <= 0 || sourceHeight <= 0) {
            return;
        }
        var scale = Math.min(size / sourceWidth, size / sourceHeight);
        var width = sourceWidth * scale;
        var height = sourceHeight * scale;
        window.contents.blt(
            bitmap,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            x + (size - width) / 2,
            y + (size - height) / 2,
            width,
            height
        );
    }

    function drawScaledActorCharacter(window, actor, x, y, size) {
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
                size
            );
        };
        if (bitmap.isReady()) {
            draw();
        } else {
            bitmap.addLoadListener(draw);
        }
    }

    function drawScaledActorBattler(window, actor, x, y, size) {
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
                size
            );
        };
        if (bitmap.isReady()) {
            draw();
        } else {
            bitmap.addLoadListener(draw);
        }
    }

    function drawScaledActorPicture(window, actor, x, y, size) {
        var pictureName = customPortraits[actor.actorId()];
        if (!pictureName) {
            drawScaledActorFace(window, actor, x, y, size);
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
                size
            );
        };
        if (bitmap.isReady()) {
            draw();
        } else {
            bitmap.addLoadListener(draw);
        }
    }

    function drawActorPortrait(window, actor, x, y, size) {
        if (portraitGraphic === "character") {
            drawScaledActorCharacter(window, actor, x, y, size);
        } else if (portraitGraphic === "battler") {
            drawScaledActorBattler(window, actor, x, y, size);
        } else if (portraitGraphic === "picture") {
            drawScaledActorPicture(window, actor, x, y, size);
        } else {
            drawScaledActorFace(window, actor, x, y, size);
        }
    }

    function drawMenuActorLevel(window, actor, x, y, width) {
        var label = TextManager.levelA;
        var labelWidth = Math.min(width, window.textWidth(label));
        var originalFontBold = window.contents.fontBold;
        window.contents.fontBold = true;
        window.changeTextColor(window.systemColor());
        window.drawText(label, x, y, labelWidth);
        window.resetTextColor();
        window.drawText(
            String(actor.level),
            x + labelWidth,
            y,
            Math.max(1, width - labelWidth),
            "right"
        );
        window.contents.fontBold = originalFontBold;
    }

    var originalCreateCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        originalCreateCommandWindow.call(this);

        var commandCount = this._commandWindow.maxItems();
        var columns = this._commandWindow.maxCols();
        this._commandWindow._rrCommandFontSize = commandFontSize(
            this._commandWindow,
            Graphics.boxWidth
        );
        var wantedRows = Math.max(1, Math.ceil(commandCount / columns));
        var lineHeight = this._commandWindow.lineHeight();
        var padding = this._commandWindow.padding;
        var statusHeight = menuStatusHeight(lineHeight, padding);
        this._rrMenuStatusHeight = statusHeight;
        var maxHeight = Math.max(
            lineHeight + padding * 2,
            Graphics.boxHeight - statusHeight - lineHeight
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
        var height = this._rrMenuStatusHeight || Math.min(
            260,
            Math.max(230, Math.floor(Graphics.boxHeight * 0.38))
        );
        var y = Graphics.boxHeight - height;
        var rect = {
            x: 0,
            y: y,
            width: Graphics.boxWidth,
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

    function menuStatusHeight(lineHeight, padding) {
        var defaultHeight = Math.min(
            260,
            Math.max(230, Math.floor(Graphics.boxHeight * 0.38))
        );
        if (!fullPortraitAboveNameLevel) {
            return defaultHeight;
        }
        var wantedHeight = padding * 2 + lineHeight * 4 + portraitSize + 10;
        var maxHeight = Graphics.boxHeight - lineHeight * 2 - padding * 2;
        return Math.min(maxHeight, Math.max(defaultHeight, wantedHeight));
    }

    Window_RpgRevampMenuStatus.prototype = Object.create(Window_MenuStatus.prototype);
    Window_RpgRevampMenuStatus.prototype.constructor = Window_RpgRevampMenuStatus;

    hideDefaultCursorForImageCursor(Window_RpgRevampMenuStatus);

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
        var inset = 8;
        var contentX = rect.x + inset;
        var contentWidth = Math.max(1, rect.width - inset * 2);
        var lineHeight = this.lineHeight();
        var faceY = rect.y + lineHeight + 6;
        var availableFaceHeight = innerHeight(this) - faceY - lineHeight * 2 - 4;
        var faceHeight = Math.min(
            portraitSize,
            contentWidth * 0.4,
            contentWidth,
            Math.max(32, availableFaceHeight)
        );
        var faceX = contentX;
        var detailsX = faceX + faceHeight + 8;
        var detailsWidth = Math.max(1, contentWidth - faceHeight - 8);
        var gaugeY = Math.max(
            faceY + faceHeight + 4,
            faceY + lineHeight * 2 + 4
        );

        if (!actor) {
            return;
        }

        if (fullPortraitAboveNameLevel) {
            var fullFaceHeight = Math.min(
                portraitSize,
                contentWidth,
                Math.max(
                    32,
                        innerHeight(this) - faceY - lineHeight * 3 - 4
                )
            );
            var fullFaceX = contentX + Math.floor(
                (contentWidth - fullFaceHeight) / 2
            );
            var detailsY = faceY + fullFaceHeight + 4;
            var levelWidth = Math.min(
                contentWidth - 1,
                this.textWidth(TextManager.levelA) +
                    this.textWidth(String(actor.level)) +
                    this.textPadding()
            );
            var nameWidth = Math.max(1, contentWidth - levelWidth);

            drawActorPortrait(this, actor, fullFaceX, faceY, fullFaceHeight);
            this.drawActorName(actor, contentX, detailsY, nameWidth);
            drawMenuActorLevel(
                this,
                actor,
                contentX + nameWidth,
                detailsY,
                levelWidth
            );
            this.drawActorHp(actor, contentX, detailsY + lineHeight, contentWidth);
            this.drawActorMp(
                actor,
                contentX,
                detailsY + lineHeight * 2,
                contentWidth
            );
            return;
        }

        drawActorPortrait(this, actor, faceX, faceY, faceHeight);
        this.drawActorName(actor, detailsX, faceY, detailsWidth);
        drawMenuActorLevel(
            this,
            actor,
            detailsX,
            faceY + this.lineHeight(),
            detailsWidth
        );
        this.drawActorHp(actor, contentX, gaugeY, contentWidth);
        this.drawActorMp(actor, contentX, gaugeY + this.lineHeight(), contentWidth);
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
