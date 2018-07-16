//'use strict';
// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as vsctm from 'vscode-textmate';
import * as fs from 'fs';
import * as path from 'path';

let grammarPaths = {
  'source.ruby': '../syntaxes/ruby.tmLanguage.json'
};

let registry = new vsctm.Registry({
  loadGrammar: function (scopeName) {
    // console.log(scopeName)
    let languageSyntaxPath = grammarPaths[scopeName];

    if (languageSyntaxPath) {
      return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(__dirname, languageSyntaxPath), (error, content) => {
          if (error) {
            console.log(error)
            console.log(__dirname)
            reject(error);
          } else {
            let rawGrammar = vsctm.parseRawGrammar(content.toString(), languageSyntaxPath);
            resolve(rawGrammar);
          }
        });
      });
    } 
    return null;
  }
});

// This method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let decorationType: vscode.TextEditorDecorationType;

  let disposable = vscode.commands.registerCommand('extension.showStartOfBlock', () => {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
      let range;

      if (editor.selection.isEmpty) {
        range = editor.document.getWordRangeAtPosition(editor.selection.start);

      } else {
        let startPos = editor.selection.start;
        let endPos = editor.selection.end;
        range = new vscode.Range(startPos, endPos);
      }

      if (range) {
        registry.loadGrammar('source.ruby').then(grammar => {
          let word = editor.document.getText(range);

          // Check if the cursor is placed on the word "end", or if the word "end" is selected
          if (word == 'end') {
            let count = -1;
            let firstEnd = 0;
            let matchedKeyword: string;
            let lineText: string;
            const regExp = new RegExp(/\bend\b/)
            const regExp1 = new RegExp(/\b(if|unless|while|until)\b/)
            const regExp2 = new RegExp(/\b(begin|case|class|def|do|for|module)\b/);
            // Since Javascript does not support negative lookbehinds, check for one line conditional/loop statements
            // and ignore these lines. Check for this by reversing the regex and checking against reverseLineText
            // A very long a complicated regex that basically says, if there is stuff behind an if/unless/while/until
            // it MUST be in a comment or string
            const regExp3 = new RegExp(/^\s*(if|unless|while|until)/);

            // The line number returned is off by 1 (line numbers start at 0 instead of at 1, like in the editor)
            for (let lineNumber = editor.selection.start.line; lineNumber >= 0; lineNumber--) {
              lineText = editor.document.lineAt(lineNumber).text;

              // Check if the line has the word 'end'
              if (regExp.test(lineText)) {
                let lineTokens = grammar.tokenizeLine(lineText, null);

                // Tokenize the line and iterate through each token
                for (let i = 0; i < lineTokens.tokens.length; i++) {
                  let inCommentOrString = -1;
                  let startBlockInCommentOrString = -1;
                  let isAKeyword = -1;
                  let token = lineTokens.tokens[i];
                  let tokenString = (lineText.substring(token.startIndex, token.endIndex));
                  // console.log(tokenString)

                  // If a token matches the word 'end', check to make sure it's not in a comment or string
                  // If a comment or string scope is found, set inCommentOrString to 1 and
                  // break the for loop (that's iterating over the scopes)
                  if (tokenString.match(/\bend\b/)) {
                    inCommentOrString = 0;

                    for (let i = 0; i < token.scopes.length; i++) {
                      if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                        inCommentOrString = 1;
                        break;
                      }
                      // Check to make sure the token is a keyword
                      if (token.scopes[i].includes('keyword')) {
                        isAKeyword = 0;
                      }
                    }
                  
                  // Otherwise if the token matches the keyword of a start block, check to make sure it's not
                  // in a comment or string. If so, set startBlockCommentOrString to 1 and break the for loop
                  // iterating over the scopes
                  } else if (regExp1.test(tokenString) || regExp2.test(tokenString)) {
                      startBlockInCommentOrString = 0;

                      for (let i = 0; i < token.scopes.length; i++) {
                        if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                          startBlockInCommentOrString = 1;
                          break;
                        }
                        if (token.scopes[i].includes('keyword')) {
                          isAKeyword = 0;
                        }
                      }
                  }

                  // If startBlockInCommentOrString is 0 and the token is a keyword, increment the count.
                  // Else if inCommentOrString == 0 and the token ('end') is a keyword, decrement the count
                  if (startBlockInCommentOrString == 0 && isAKeyword == 0) {
                    count++;

                  } else if (inCommentOrString == 0 && isAKeyword == 0) {
                    // Do not decrement the counter for the first "end" encountered. That is already
                    // accounted for when count is set to -1
                    if (firstEnd == 0) {
                      firstEnd = 1;
                    } else {
                      count--;
                    }
                  }
                }

                // console.log(count);
                
              } else if (regExp1.test(lineText )|| regExp2.test(lineText)) {
                  if (!grammar) {
                    console.error('Grammar is null!')
                  }

                  let lineTokens = grammar.tokenizeLine(lineText, null);
                  let inCommentOrString = 0;
                  let isAKeyword = -1;

                  for (let i = 0; i < lineTokens.tokens.length; i++) {
                    let token = lineTokens.tokens[i];
                    let tokenString = (lineText.substring(token.startIndex, token.endIndex));
                    // Updated matchedKeyword. When this variable is checked at the end, it should contain the match
                    matchedKeyword = tokenString;
                    // console.log(tokenString)
                    
                    for (let i = 0; i < token.scopes.length; i++) {
                      if ((regExp1.test(tokenString) || regExp2.test(tokenString)) && (token.scopes[i].includes('comment') || token.scopes[i].includes('string'))) {
                        inCommentOrString = 1;
                        break;
                      }
                      if (token.scopes[i].includes('keyword')) {
                        isAKeyword = 0;
                      }
                    }

                    // If we have found a match, the token is a keyword, and it's not part of a comment or string,
                    // break out of the for loop iterating over the line tokens
                    if (inCommentOrString == 0 && isAKeyword == 0 && (regExp1.test(tokenString) || regExp2.test(tokenString))) {
                      break;
                    }

                    // If the current token matches a start block keyword but is in a comment or string,
                    // reset the variables and skip to the next token in the line
                    if (inCommentOrString == 1) {
                      inCommentOrString = 0;
                      isAKeyword = -1;
                      continue;
                    }

                    isAKeyword = -1;
                  }

                  // If the line doesn't have an if/unless/while/until in it, go ahead and increment the count
                  // Else if the line does contain one of those keywords, removed any comments, strings, or regexps from
                  // the line and check to make sure there is nothing behind it such as a "next if" or "expression....if" 
                  // (one line block statement). These need to be ignored
                  if (inCommentOrString == 0 && isAKeyword == 0) {
                    if (regExp2.test(matchedKeyword)) {
                      count++;

                    } else if (regExp1.test(matchedKeyword) && regExp3.test(lineText)) {
                      count++;
                    }
                  }

                // console.log(count);
              }

              if (count == 0) {
                // Get the color from the user settings. If the color code is invalid, default to #BABABA
                let color: String = vscode.workspace.getConfiguration('highlightColor').get('color')
                
                if (!color.match(/#[0-9A-F]{6}/)) {
                  color = "#BABABA"
                }

                decorationType = vscode.window.createTextEditorDecorationType({
                  backgroundColor: color
                });
                let highlightRange = new vscode.Range(lineNumber, 0, lineNumber, lineText.length);

                editor.setDecorations(decorationType, [highlightRange]);
                break;
              }
            }
          

          } else {
            vscode.window.showInformationMessage('Please place the cursor on the word "end"');
          }

        }); 

      } else {
        vscode.window.showInformationMessage('Nothing is selected');
      }
    }
  });

  context.subscriptions.push(disposable);

  // Remove the highlighting upon cursor change
  vscode.window.onDidChangeTextEditorSelection(() => {
    if (decorationType) {
      const editor = vscode.window.activeTextEditor;

      if (editor) {
        decorationType.dispose();
      }
    } 
  })
}

// This method is called when your extension is deactivated
export function deactivate() {
}
