/*:
 * @plugindesc Adds Deltarune-style grazing rewards and gauges to SRD's Undertale Battle System.
 * @author DeltaDunked
 *
 * @param TP Per Graze
 * @desc Native RPG Maker TP awarded when a bullet is grazed. Each bullet awards TP once.
 * @default 1 
 *
 * @param HP Per Graze
 * @desc HP restored when a bullet is grazed. Each bullet awards HP once.
 * @default 0
 *
 * @param MP Per Graze
 * @desc MP restored when a bullet is grazed. Each bullet awards MP once.
 * @default 0
 *
 * @param Graze Distance
 * @desc Extra pixel distance around the player's hitbox that counts as grazing.
 * @default 16
 *
 * @param Graze SE
 * @text Graze SE
 * @desc Sound effect played when grazing a bullet. Place the sound file in the audio/se/ folder.
 * @type file
 * @dir audio/se/
 * @default
 *
 * @param Outline Color
 * @desc CSS color for the graze outline (for example #FFFFFF or rgba(255,255,255,0.8)).
 * @default rgba(255, 255, 255, 0.8)
 *
 * @param Outline Shape
 * @desc Shape used for both the graze hitbox and its outline.
 * @type select
 * @option Follow Player
 * @value player
 * @option Circle
 * @value circle
 * @option Rectangle
 * @value rect
 * @option Heart
 * @value heart
 * @default player
 *
 * @param Outline Image
 * @desc Optional image to use instead of drawing the outline. Place it in img/SumRndmDde/utb/.
 * @type file
 * @dir img/SumRndmDde/utb/
 * @default
 *
 * @help
 * Install it below SRD_UndertaleBattleSystem in Plugin Manager.
 *
 * This is an addon plugin for SRD's Undertale Battle System. It adds Deltarune
 * -style grazing rewards to the battle system. When you get near a bullet
 * without touching it, you gain the configured TP, HP, and/or MP.
 *
 * Adds configured MP and TP gauges beneath HP during enemy attacks.
 * 
 * ------------------------------Params-------------------------------------
 * 
 * TP Per Graze: How much TP is awarded when a bullet is grazed.
 * The TP gauge is shown only when this is greater than 0.
 *
 * HP Per Graze: How much HP is restored when a bullet is grazed.
 *
 * MP Per Graze: How much MP is restored when a bullet is grazed.
 * The MP gauge is shown only when this is greater than 0.
 * 
 * You can set the amount of TP/HP/MP per graze for a specific
 * attack using these tags in the notes of the UTB skill.
 *
 * <UTB Attack 1>
 * ...
 * TP Per Graze: 2
 * HP Per Graze: 5
 * MP Per Graze: 1
 * </UTB Attack 1>
 *
 * Graze Distance: Pixel distance around the player's hitbox that counts as grazing.
 * 
 * Graze SE: Select a sound effect to playwhen a bullet is grazed. 
 * 
 * Outline Color: Color for the graze outline 
 * (for example #FFFFFF or rgba(255,255,255,0.8)).
 * 
 * Outline Shape: selects the graze hitbox
 * Follow Player uses the player's UTB hitbox. 
 * Circle, Rectangle, and Heart use that shape for both grazing and the outline. 
 * Follow Player means the shape configured for the actor in UTB, 
 * not the player's sprite artwork.  
 * 
 * Outline Image: Replaces the drawing but does not alter the selected graze hitbox.
 */

(function() {
	"use strict";

	var pluginName = "SRD_UTB_TPGraze";
	var params = PluginManager.parameters(pluginName);
	var renamedParams = PluginManager.parameters("DD_UTB_TPGraze");
	Object.keys(renamedParams).forEach(function(key) {
		params[key] = renamedParams[key];
	});
	var tpPerGraze = Number(params["TP Per Graze"]);
	var hpPerGraze = Number(params["HP Per Graze"] || 0);
	var mpPerGraze = Number(params["MP Per Graze"] || 0);
	var grazeDistance = Number(params["Graze Distance"]);
	var grazeSoundEffect = String(params["Graze Sound Effect"] || "");
	var grazeOutlineColor = String(
		params["Outline Color"] || "rgba(255, 255, 255, 0.8)"
	);
	var grazeOutlineShape = String(params["Outline Shape"] || "player").toLowerCase();
	var grazeOutlineImage = String(params["Outline Image"] || "");
	var grazeOutlineThickness = 2;
	var grazeOutlineFadeSpeed = 20;

	if (!isFinite(tpPerGraze) || tpPerGraze < 0) {
		throw new Error(pluginName + ": TP Per Graze must be a non-negative number.");
	}
	if (!isFinite(hpPerGraze) || hpPerGraze < 0) {
		throw new Error(pluginName + ": HP Per Graze must be a non-negative number.");
	}
	if (!isFinite(mpPerGraze) || mpPerGraze < 0) {
		throw new Error(pluginName + ": MP Per Graze must be a non-negative number.");
	}
	if (!isFinite(grazeDistance) || grazeDistance < 0) {
		throw new Error(pluginName + ": Graze Distance must be a non-negative number.");
	}

	function attackGrazeAmount(note, name, skill, attackNumber) {
		var expression = new RegExp(
			"^[ \\t]*" + name + "[ \\t]*:[ \\t]*([^\\r\\n]*)",
			"im"
		);
		var match = note.match(expression);
		if (!match) return undefined;

		var value = match[1].trim();
		var amount = Number(value);
		if (!value || !isFinite(amount) || amount < 0) {
			throw new Error(
				pluginName + ": Skill " + skill.id + " (" + skill.name +
				"), UTB Attack " + attackNumber + " " + name +
				" must be a non-negative number."
			);
		}
		return amount;
	}

	var grazeNotetagsLoaded = false;
	var _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
	DataManager.isDatabaseLoaded = function() {
		if (!_DataManager_isDatabaseLoaded.call(this)) return false;
		if (!grazeNotetagsLoaded) {
			for (var skillIndex = 1; skillIndex < $dataSkills.length; skillIndex++) {
				var skill = $dataSkills[skillIndex];
				if (!skill || !skill.note || !skill.utb_attack) continue;

				for (var attackIndex = 0; attackIndex < 9; attackIndex++) {
					var attack = skill.utb_attack[attackIndex];
					if (!attack) continue;
					var attackNumber = attackIndex + 1;
					var attackTag = new RegExp(
						"<UTB Attack\\s+" + attackNumber + "\\s*>" +
						"([\\s\\S]*?)" +
						"<\\/UTB Attack\\s+" + attackNumber + "\\s*>",
						"i"
					).exec(skill.note);
					if (!attackTag) continue;

					attack.tpPerGraze = attackGrazeAmount(
						attackTag[1], "TP Per Graze", skill, attackNumber
					);
					attack.hpPerGraze = attackGrazeAmount(
						attackTag[1], "HP Per Graze", skill, attackNumber
					);
					attack.mpPerGraze = attackGrazeAmount(
						attackTag[1], "MP Per Graze", skill, attackNumber
					);
				}
			}
			grazeNotetagsLoaded = true;
		}
		return true;
	};

	if (typeof Imported === "undefined" ||
		!Imported["SumRndmDde Undertale Battle System"] ||
		typeof UndertaleBattleSystem === "undefined" ||
		typeof Undertale_Enemy === "undefined" ||
		!Undertale_Enemy.prototype.checkCollisionPlayer ||
		typeof Window_SingleActorHP === "undefined") {
		throw new Error(pluginName + " requires SRD_UndertaleBattleSystem.js to be loaded first.");
	}

	var _Undertale_Enemy_initialize = Undertale_Enemy.prototype.initialize;
	Undertale_Enemy.prototype.initialize = function(utb, window, player) {
		_Undertale_Enemy_initialize.call(this, utb, window, player);
		this._tpGrazeAmount = utb.tpPerGraze;
		this._hpGrazeAmount = utb.hpPerGraze;
		this._mpGrazeAmount = utb.mpPerGraze;
	};

	function heartPolygon(x, y, width, height) {
		var vertices = [
			[0.50, 0.16],
			[0.43, 0.04],
			[0.35, 0.00],
			[0.25, 0.00],
			[0.10, 0.09],
			[0.02, 0.24],
			[0.02, 0.54],
			[0.08, 0.63],
			[0.37, 0.88],
			[0.50, 1.00],
			[0.63, 0.88],
			[0.92, 0.63],
			[0.98, 0.54],
			[0.98, 0.24],
			[0.90, 0.09],
			[0.75, 0.00],
			[0.65, 0.00],
			[0.57, 0.04]
		];
		var points = [];
		for (var i = 0; i < vertices.length; i++) {
			points.push({
				x: x + (vertices[i][0] - 0.5) * width,
				y: y + (vertices[i][1] - 0.5) * height
			});
		}
		return points;
	}

	function circlePolygon(x, y, radius) {
		var points = [];
		var count = 48;
		for (var i = 0; i < count; i++) {
			var angle = (i / count) * Math.PI * 2;
			points.push({
				x: x + Math.cos(angle) * radius,
				y: y + Math.sin(angle) * radius
			});
		}
		return points;
	}

	function grazePolygon(player) {
		var width = player.getWidth();
		var height = player.getHeight();
		var shape = grazeOutlineShape;
		if (shape === "player") shape = player.shape();

		if (shape === "circle") {
			var radius = grazeOutlineShape === "player" && player.shape() === "circle"
				? player.radius()
				: Math.max(width, height) / 2;
			return circlePolygon(player.x, player.y, radius);
		}
		if (shape === "heart") {
			return heartPolygon(player.x, player.y, width, height);
		}

		return [
			{x: player.x - width / 2, y: player.y - height / 2},
			{x: player.x + width / 2, y: player.y - height / 2},
			{x: player.x + width / 2, y: player.y + height / 2},
			{x: player.x - width / 2, y: player.y + height / 2}
		];
	}

	function pointInPolygon(x, y, polygon) {
		var inside = false;
		for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			var a = polygon[i];
			var b = polygon[j];
			if ((a.y > y) !== (b.y > y) &&
				x < ((b.x - a.x) * (y - a.y) / (b.y - a.y)) + a.x) {
				inside = !inside;
			}
		}
		return inside;
	}

	function pointSegmentDistanceSquared(point, start, end) {
		var dx = end.x - start.x;
		var dy = end.y - start.y;
		var lengthSquared = dx * dx + dy * dy;
		var t = lengthSquared === 0 ? 0 :
			((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
		t = Math.max(0, Math.min(1, t));
		var nearestX = start.x + t * dx;
		var nearestY = start.y + t * dy;
		dx = point.x - nearestX;
		dy = point.y - nearestY;
		return dx * dx + dy * dy;
	}

	function segmentsIntersect(a, b, c, d) {
		function orientation(p, q, r) {
			var value = (q.y - p.y) * (r.x - q.x) -
				(q.x - p.x) * (r.y - q.y);
			if (Math.abs(value) < 0.000001) return 0;
			return value > 0 ? 1 : 2;
		}
		function onSegment(p, q, r) {
			return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
				q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
		}
		var o1 = orientation(a, b, c);
		var o2 = orientation(a, b, d);
		var o3 = orientation(c, d, a);
		var o4 = orientation(c, d, b);
		if (o1 !== o2 && o3 !== o4) return true;
		if (o1 === 0 && onSegment(a, c, b)) return true;
		if (o2 === 0 && onSegment(a, d, b)) return true;
		if (o3 === 0 && onSegment(c, a, d)) return true;
		return o4 === 0 && onSegment(c, b, d);
	}

	function segmentDistanceSquared(a, b, c, d) {
		if (segmentsIntersect(a, b, c, d)) return 0;
		return Math.min(
			pointSegmentDistanceSquared(a, c, d),
			pointSegmentDistanceSquared(b, c, d),
			pointSegmentDistanceSquared(c, a, b),
			pointSegmentDistanceSquared(d, a, b)
		);
	}

	function polygonRectDistanceSquared(polygon, x, y, width, height) {
		var left = x - width / 2;
		var right = x + width / 2;
		var top = y - height / 2;
		var bottom = y + height / 2;
		var corners = [
			{x: left, y: top},
			{x: right, y: top},
			{x: right, y: bottom},
			{x: left, y: bottom}
		];

		for (var i = 0; i < corners.length; i++) {
			if (pointInPolygon(corners[i].x, corners[i].y, polygon)) return 0;
		}
		for (var p = 0; p < polygon.length; p++) {
			var point = polygon[p];
			if (point.x >= left && point.x <= right &&
				point.y >= top && point.y <= bottom) return 0;
		}

		var minimum = Infinity;
		for (var edge = 0; edge < polygon.length; edge++) {
			var start = polygon[edge];
			var end = polygon[(edge + 1) % polygon.length];
			for (var side = 0; side < corners.length; side++) {
				minimum = Math.min(minimum, segmentDistanceSquared(
					start,
					end,
					corners[side],
					corners[(side + 1) % corners.length]
				));
			}
		}
		return minimum;
	}

	function overlapsGrazeArea(enemy, player) {
		var polygon = grazePolygon(player);
		var distance = grazeDistance;
		if (enemy.isCircle()) {
			if (pointInPolygon(enemy.x, enemy.y, polygon)) return true;
			var minimum = Infinity;
			for (var i = 0; i < polygon.length; i++) {
				minimum = Math.min(minimum, pointSegmentDistanceSquared(
					{x: enemy.x, y: enemy.y},
					polygon[i],
					polygon[(i + 1) % polygon.length]
				));
			}
			var radius = enemy.radius + distance;
			return minimum <= radius * radius;
		}
		return polygonRectDistanceSquared(
			polygon,
			enemy.x,
			enemy.y,
			enemy.getWidth(),
			enemy.getHeight()
		) <= distance * distance;
	}

	var _Undertale_Enemy_checkCollisionPlayer =
		Undertale_Enemy.prototype.checkCollisionPlayer;
	Undertale_Enemy.prototype.checkCollisionPlayer = function(player) {
		var hit = _Undertale_Enemy_checkCollisionPlayer.call(this, player);
		if (hit || this.destroyAnimation) {
			return hit;
		}
		if ((this.type.match(/stop/i) && !player.isMoving()) ||
			(this.type.match(/move/i) && player.isMoving())) {
			return false;
		}
		if (!overlapsGrazeArea(this, player)) {
			return false;
		}

		player._tpGrazeNearby = true;
		if (this._srdTpGrazeAwarded) {
			return false;
		}

		var actor = player.actor;
		var tpAmount = this._tpGrazeAmount !== undefined
			? this._tpGrazeAmount
			: tpPerGraze;
		var hpAmount = this._hpGrazeAmount !== undefined
			? this._hpGrazeAmount
			: hpPerGraze;
		var mpAmount = this._mpGrazeAmount !== undefined
			? this._mpGrazeAmount
			: mpPerGraze;
		if (actor && typeof actor.gainTp === "function" && tpAmount > 0) {
			actor.gainTp(tpAmount);
		}
		if (actor && typeof actor.gainHp === "function" && hpAmount > 0) {
			actor.gainHp(hpAmount);
		}
		if (actor && typeof actor.gainMp === "function" && mpAmount > 0) {
			actor.gainMp(mpAmount);
		}
		this._srdTpGrazeAwarded = true;
		if (grazeSoundEffect) {
			AudioManager.playSe({
				name: grazeSoundEffect,
				volume: 90,
				pitch: 100,
				pan: 0
			});
		}
		return false;
	};

	var _UndertaleBattleSystem_initialize =
		UndertaleBattleSystem.prototype.initialize;
	UndertaleBattleSystem.prototype.initialize = function() {
		_UndertaleBattleSystem_initialize.apply(this, arguments);
		this._tpGrazeOutline = new Sprite();
		this._tpGrazeOutline.opacity = 0;
		this._tpGrazeOutline.visible = false;
		this._tpGrazeOutline._grazeTargetOpacity = 0;
		this._tpGrazeOutline.anchor.x = 0.5;
		this._tpGrazeOutline.anchor.y = 0.5;
		if (grazeOutlineImage) {
			this._tpGrazeOutline.bitmap = ImageManager.loadBitmap(
				"img/SumRndmDde/utb/",
				grazeOutlineImage,
				0,
				true
			);
		}
		var _tpGrazeOutline_update = this._tpGrazeOutline.update;
		this._tpGrazeOutline.update = function() {
			_tpGrazeOutline_update.call(this);
			if (this.opacity < this._grazeTargetOpacity) {
				this.opacity = Math.min(
					this.opacity + grazeOutlineFadeSpeed,
					this._grazeTargetOpacity
				);
			} else if (this.opacity > this._grazeTargetOpacity) {
				this.opacity = Math.max(
					this.opacity - grazeOutlineFadeSpeed,
					this._grazeTargetOpacity
				);
			}
			this.visible = this.opacity > 0;
		};
		this.addChild(this._tpGrazeOutline);
	};

	UndertaleBattleSystem.prototype.updateTpGrazeOutline = function() {
		var player = this._player;
		if (!player || !player.actor || !player._tpGrazeNearby) {
			this._tpGrazeOutline._grazeTargetOpacity = 0;
			return;
		}

		var isHeart = grazeOutlineShape === "heart";
		var isCircle = grazeOutlineShape === "circle" ||
			(grazeOutlineShape === "player" && player.shape() === "circle");
		var shape = isCircle ? "circle" : "rect";
		var baseWidth = player.getWidth();
		var baseHeight = player.getHeight();
		var width = baseWidth + grazeDistance * 2;
		var height = baseHeight + grazeDistance * 2;
		var radius = isCircle
			? (grazeOutlineShape === "circle"
				? Math.max(width, height) / 2
				: player.radius() + grazeDistance)
			: 0;
		var outlineWidth = isCircle ? radius * 2 : width;
		var outlineHeight = isCircle ? radius * 2 : height;
		if (isHeart) shape = "heart";
		var key = [
			shape,
			width,
			height,
			radius,
			grazeOutlineColor,
			grazeOutlineThickness,
			isHeart ? grazeDistance : 0
		].join(":");

		if (!grazeOutlineImage && this._tpGrazeOutline._grazeShapeKey !== key) {
			var bitmapWidth = Math.ceil(
				(isCircle ? radius : width / 2) * 2 +
				grazeOutlineThickness * 2
			);
			var bitmapHeight = Math.ceil(
				(isCircle ? radius : height / 2) * 2 +
				grazeOutlineThickness * 2
			);
			var bitmap = new Bitmap(bitmapWidth, bitmapHeight);
			var context = bitmap._context;
			var centerX = bitmapWidth / 2;
			var centerY = bitmapHeight / 2;

			context.beginPath();
			context.strokeStyle = grazeOutlineColor;
			context.lineWidth = grazeOutlineThickness;
			if (isCircle) {
				context.arc(centerX, centerY, radius, 0, Math.PI * 2);
			} else if (isHeart) {
				var heart = heartPolygon(centerX, centerY, width, height);
				context.moveTo(heart[0].x, heart[0].y);
				for (var pointIndex = 1; pointIndex < heart.length; pointIndex++) {
					context.lineTo(heart[pointIndex].x, heart[pointIndex].y);
				}
				context.closePath();
			} else {
				context.rect(
					centerX - width / 2,
					centerY - height / 2,
					width,
					height
				);
			}
			context.stroke();
			bitmap._setDirty();
			this._tpGrazeOutline.bitmap = bitmap;
			this._tpGrazeOutline._grazeShapeKey = key;
		}

		if (grazeOutlineImage) {
			var imageWidth = this._tpGrazeOutline.bitmap.width;
			var imageHeight = this._tpGrazeOutline.bitmap.height;
			if (imageWidth > 0 && imageHeight > 0) {
				this._tpGrazeOutline.scale.x = outlineWidth / imageWidth;
				this._tpGrazeOutline.scale.y = outlineHeight / imageHeight;
			}
		}
		this._tpGrazeOutline.x = player.x;
		this._tpGrazeOutline.y = player.y;
		this._tpGrazeOutline._grazeTargetOpacity = 255;
	};

	var _UndertaleBattleSystem_deactivate =
		UndertaleBattleSystem.prototype.deactivate;
	UndertaleBattleSystem.prototype.deactivate = function() {
		_UndertaleBattleSystem_deactivate.apply(this, arguments);
		this._tpGrazeOutline._grazeTargetOpacity = 0;
	};

	var _UndertaleBattleSystem_masterRefresh =
		UndertaleBattleSystem.prototype.masterRefresh;
	UndertaleBattleSystem.prototype.masterRefresh = function() {
		this._player._tpGrazeNearby = false;
		_UndertaleBattleSystem_masterRefresh.apply(this, arguments);
		if (!this.isActivated() || !BattleManager.isUTBActive() ||
			this._isPlayerDying) {
			this._tpGrazeOutline._grazeTargetOpacity = 0;
		} else {
			this.updateTpGrazeOutline();
		}
	};

	var _Window_SingleActorHP_windowHeight =
		Window_SingleActorHP.prototype.windowHeight;
	Window_SingleActorHP.prototype.windowHeight = function() {
		var gaugeRows = 1 + (mpPerGraze > 0 ? 1 : 0) +
			(tpPerGraze > 0 ? 1 : 0);
		return Math.max(
			_Window_SingleActorHP_windowHeight.call(this),
			this.fittingHeight(gaugeRows)
		);
	};

	var _Window_SingleActorHP_refresh = Window_SingleActorHP.prototype.refresh;
	Window_SingleActorHP.prototype.refresh = function() {
		if (this._mp !== this.actor().mp || this._tp !== this.actor().tp) {
			this.forceRefresh();
		} else {
			_Window_SingleActorHP_refresh.call(this);
		}
	};

	var _Window_SingleActorHP_forceRefresh =
		Window_SingleActorHP.prototype.forceRefresh;
	Window_SingleActorHP.prototype.forceRefresh = function() {
		_Window_SingleActorHP_forceRefresh.call(this);
		this._mp = this.actor().mp;
		this._tp = this.actor().tp;

		var x = this.textPadding();
		var width = this.contents.width - this.textPadding() * 2;
		var gaugeX = x + this.textWidth(this.actor().name()) + 30;
		var gaugeY = this.lineHeight();
		if (mpPerGraze > 0) {
			this.drawActorMp(this.actor(), gaugeX, gaugeY, width / 2);
			gaugeY += this.lineHeight();
		}
		if (tpPerGraze > 0) {
			this.drawActorTp(this.actor(), gaugeX, gaugeY, width / 2);
		}
	};
})();
