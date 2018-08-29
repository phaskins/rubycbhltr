# Ruby/Python Code Block Highlighter

This extension is designed to: (Ruby) help identify the innermost block that the current line belongs to, or (Python) help match the current line to its parent scope.

## Usage

* First, either select the the line (drag over it with the mouse) or place the cursor on top of it.
* Next, trigger the command by pressing Alt + H or by choosing "Show Start Of Block"/"Show Start Of Scope" from the Command Palette.<br/><br/>
![](./images/example_highlighting.png)  
![](./images/command_selection_ruby.png)  
![](./images/command_selection_python.png)  
  
* The line that starts the innermost block/scope of the selected line will be highlighted.<br/><br/>
![](./images/example_highlighting_1.png) ![](./images/example_highlighting_2.png) ![](./images/example_highlighting_3.png)  
  
* **(RUBY)** Where you place your cursor within the line may matter. For example, if you place your cursor before, on, or directly after the keyword "if" (and it's the first keyword in the line that starts a block), the if statement's parent block will be highlighted. However, if you place your cursor completely after the keyword "if" as such: "if |" (where | is the cursor), the if statement itself will be highlighted, since you are now within its scope.<br/><br/>
![](./images/ruby_scope_change_example_1.png) ![](./images/ruby_scope_change_example_2.png)  
  
* The extension supports Python as well, though the functionality is somewhat different than with Ruby. In Python, the parent scope of the selected line will be highlighted. Therefore if the cursor is place on an a line in an "elif" conditional, for example, when the command is activated, the elif will be highlighted. However with Ruby, the if statement that the elsif belongs to will be highlighted.<br/><br/>
![](./images/python_example_1.png) ![](./images/python_example_2.png) ![](./images/python_example_3.png)  
![](./images/python_example_4.png) ![](./images/python_example_5.png) ![](./images/python_example_6.png)  
  
* To remove the highlight, click elsewhere on the file.  
  
## Known Bugs  
  
### Ruby

* In the case where there are two or more open braces on the same line, with no closing braces in between, the highlighting will fail.  
![](./images/error_producing_code.png)  
However, putting the code on one line will fix the bug.  
![](./images/error_fix.png)  
Something like this would also work.  
![](./images/error_fix_2.png)  
  
## Dependencies

* [vscode-textmate](https://github.com/Microsoft/vscode-textmate)

## Extension Settings

The highlight color can be changed via the "configuration" settings:

* highlightColor.color: Specifies the color code for the highlighting. The default is #BABABA. If an invalid code is provided, the color will default to #BABABA.
  
![](./images/configurations.png)

## Commands/Keybindings

The keybinding for the extension can be changed via the "keybindings" settings  
  
![](./images/commands_and_keybindings.png)  

###### Honorary Beta Tester: Fenhan Wang
