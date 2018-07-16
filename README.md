# Ruby Code Block Highlighter

This extension is designed to help identify the beginning line of a block in Ruby.

## Usage

* Either select the word "end" (drag over the word with the mouse) or place the cursor on top of it. The cursor can be placed anywhere within, behind, or after the word "end" to work.
* Trigger the command by choosing "Show Start Of Block" from the Command Palette, or by pressing Shift + F.

## Requirements

* Requires vscode-textmate

## Extension Settings

The highlight color can be changed via the configuration settings:

* highlightColor.color: specifies the color code for the highlighting. The default color is #BABABA. If an invalid color code is provided, it will default to #BABABA.

![](./images/configurations.png)

## Command/Keybinding
![](./images/commands.png)
