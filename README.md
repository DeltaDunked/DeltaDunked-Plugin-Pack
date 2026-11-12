16 Rpg Maker plugins. They all work for MV and MZ, with or without Yep_EngineCore and Yep_BattleEngineCore (Note: with Menu plugins 2 and 3 some text looks a little off without Engine Core.)



1. Choice Hover Change. Can change the text of an option in a choice while being hovered over. Will make the changed option's branch revert to what is selected in the param (default choice1).



2. Hide Battle Commands. Can hide any combonation of Attack, Magic, Guard, and Item for the specific battles and specific actors you choose. You can choose to replace all with Do Nothing,  which goes to the next actor's turn. There are plugin commands, HideAttack, HideSkill, etc. AddAttack, AddSkill, etc. Also actor specific plugin commands, HideAttackActor1, AddItemActor1, etc. (Full list in plugin help.) There is an optional switch, in case you want to be able to refight an enemy with different conditions.



3. No Battle Text. Removes the intro and outro text of a battle (Enemy appeared! and Player's Party won!) controlled by a certain switch so you can turn it on and off whenever you want.



4. No Battle Shadow. Turns off the shadows under actors during battle. You can also set it to certain battles and certain party members.



5. Hit Rate. In a skill's notetag add <hit_mod: X> (X being the decimal you want to add or subtract hit rate. i.e. <hit_mod: -0.15> to take away 15% accuracy.)    

                      

6. Close Game. Adds a “Quit Game” function in the options or menu (selected by a plugin parameter). If you are using the options version and something like SRD_OptionsUpgrade plugin, put exactly this in the Symbol parameter.    closeGameCommand                                                                                  



7. Undertale Controls. Mimics the controls of Undertale and Deltarune (more so deltarune, because of running). Works for keyboard and at Xbox controller. Not sure about Switch and Playstation, but it should work. (I can’t test them, sorry).



8. Skip Title Screen. Skips the title screen. Might break some playtesting features for mz, but I'm pretty sure you can turn off the titlescreen for playtesting normally in mz anyway.



9. Stop Abort Sound Effect. When using the Abort Battle command, it no longer plays the fleeing sound effect.



10. Meta Crash. This one is interesting and specific. When the plugin command MetaCrash is used, the game autosaves (to the slot last saved in), and the game closes. If the specified switch is on, the title screen is skipped.                          

NOTE: there is both an MV and MZ version of this plugin. I don't have mz, so I can't test it. If there are problems, please tell me and I will try to fix it.



11. Alternate Menu 1. Has menu selections on the top and status on the mid left.

12. Alternate Menu 2. Has thin menu selections on the top and status on the bottom left. NOTE: If you are using a custom font, it has to be named GameFont.

13. Alternate Menu 3. Inspired by deltarune and Omori's menu layout. Has menu selections on the top and status on the bottom. I recommend this one. NOTE: If you are using a custom font, it has to be named GameFont.



14. UTB TP Graze. Addon for SRD_UndertaleBattleSystem. Adds Deltarune's bullet grazing for TP. (You can also get MP or HP.) In can set a custom amount for a specific attack.



15. Half Speed UTB. Addon for SRD_UndertaleBattleSystem.  You move at half speed while holding Cancel (X) during an Undertale attack. (Also works with controllers and custom keybinds.)



16. Message History Keybind. Addon for PKD_MessageHistory. Normally, the text log is normally accessed when you click the on-screen icon. This allows you to set a button to access the message history.



Terms of use: These may be used for commercial or free games. Give credit to DeltaDunked for these plugins. Please add a link to https://deltadunked.itch.io/rpg-maker-plugins. You may edit the code but not the name (some will break if the name is changed, also for ownership purposes).
