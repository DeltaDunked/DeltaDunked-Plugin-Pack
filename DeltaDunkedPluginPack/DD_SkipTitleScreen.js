/*:
 * @plugindesc Skips the title screen.
 *
 * @author DeltaDunked
 *
 * @help 
 */




Scene_Boot.prototype.start = function() { Scene_Base.prototype.start.call(this); SoundManager.preloadImportantSounds(); this.checkPlayerLocation(); DataManager.setupNewGame(); SceneManager.goto(Scene_Map); };






