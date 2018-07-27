'use strict';
import * as vscode from 'vscode';
import * as vsctm from 'vscode-textmate';
import * as fs from 'fs';
import * as path from 'path';

let grammarPaths = {
  'source.ruby': '../syntaxes/ruby.tmLanguage.json',
  'source.python': '../syntaxes/MagicPython.tmLanguage.json'
};

let registry = new vsctm.Registry({
  loadGrammar: function (scopeName) {
    let languageSyntaxPath = grammarPaths[scopeName];
    if (languageSyntaxPath) {
      return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(__dirname, languageSyntaxPath), (error, content) => {
          if (error) {
            console.log(error);
            console.log(__dirname);
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

export function activate(context: vscode.ExtensionContext) {
  let decorationType: vscode.TextEditorDecorationType;

  let disposable = vscode.commands.registerCommand('extension.showStartOfBlock', () => {
    // If the line is already highlighted, do nothing
    if (decorationType) {
      // vscode.window.showInformationMessage('Line is already highlighted');
      return;
    }

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
          if (!grammar) {
            console.error('Grammar is null!');
          }

          let word = editor.document.getText(range);

          // Check if the cursor is placed on a word, or if a word is selected
          if (word) {
            let count = -1;
            let firstEnd;
            let inAMultiLineComment = 0;
            let matchedKeyword: string;
            let lineText: string;
            const regExp = new RegExp(/(\bend\b|\}|\{)/);
            const regExp1 = new RegExp(/\b(if|unless|while|until)\b/);
            const regExp2 = new RegExp(/\b(begin|case|class|def|do|for|module)\b/);
            const regExp3 = new RegExp(/^\s*\b(if|unless|while|until)\b/);

            // The line number returned is off by 1 (line numbers start at 0 instead of at 1, like in the editor)
            for (let lineNumber = editor.selection.start.line; lineNumber >= 0; lineNumber--) {
              lineText = editor.document.lineAt(lineNumber).text;

              // If the function is activated on a line that doesn't contain "end", then don't worry about not 
              // decrementing the counter once the first keyword "end" is found. The reason for this is that the counter
              // is initialized to -1. So if the line contains "end", we don't want to decrement the counter again when we already
              // did so from the beginning
              if (lineNumber == editor.selection.start.line && lineText.match(/end|\}/)) {
                firstEnd = 0;
              } else {
                firstEnd = 1;
              }

              // Ignore multiline comments denoted by =begin/=end
              if (lineText.match(/=end/)) {
                inAMultiLineComment = 1;
                continue;
              } else if (lineText.match(/=begin/)) {
                inAMultiLineComment = 0; 
                continue;
              }
              if (inAMultiLineComment == 1) {
                continue;
              }

              // Check if the line has the word 'end' or '}'
              if (regExp.test(lineText)) {
                let lineTokens = grammar.tokenizeLine(lineText, null);

                // Tokenize the line and iterate through each token
                for (let i = 0; i < lineTokens.tokens.length; i++) {
                  let inCommentOrString = -1;
                  let startBlockInCommentOrString = -1;
                  let isAKeyword = -1;
                  let token = lineTokens.tokens[i];
                  let tokenString = (lineText.substring(token.startIndex, token.endIndex));
                  // console.log(tokenString);

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

                  // If a token matches '}', check to make sure it's not in a comment or string
                  // If a comment or string scope is found, set inCommentOrString to 1 and
                  // break the for loop (that's iterating over the scopes)
                  } else if (tokenString.match(/\}/)) {
                      inCommentOrString = 0;

                      for (let i = 0; i < token.scopes.length; i++) {
                        if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                          inCommentOrString = 1;
                          break;
                        }
                        // Check to make sure the token is a keyword (in this case: punctionation.scope.end)
                        if (token.scopes[i].includes('punctuation.section.scope.end')) {
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
                          // If it's a keyword, check to make sure it's not part of a one-line conditional
                          if (regExp2.test(tokenString) || (regExp1.test(tokenString) && regExp3.test(lineText))) {
                            isAKeyword = 0;
                          }
                        }
                      }

                  // Else if the token matches '{', check to make sure it's not
                  // in a comment or string. If so, set startBlockCommentOrString to 1 and break the for loop
                  // iterating over the scopes
                  } else if (tokenString.match(/\{/)) {
                      startBlockInCommentOrString = 0;

                      for (let i = 0; i < token.scopes.length; i++) {
                        if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                          startBlockInCommentOrString = 1;
                          break;
                        }
                        // Check to make sure the token is a keyword (in this case: punctionation.scope.begin)
                        if (token.scopes[i].includes('punctuation.section.scope.begin')) {
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

                  // console.log(count);
                }
                
              } else if (regExp1.test(lineText) || regExp2.test(lineText) || lineText.match(/\{/)) {
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
                      if ((regExp1.test(tokenString) || regExp2.test(tokenString) || tokenString.match(/\{/)) && (token.scopes[i].includes('comment') || token.scopes[i].includes('string'))) {
                        inCommentOrString = 1;
                        break;
                      }
                      if (token.scopes[i].includes('keyword') || (tokenString.match(/\{/) && token.scopes[i].includes('punctuation.section.scope.begin'))) {
                        isAKeyword = 0;
                      }
                    }

                    // If we have found a match, the token is a keyword, and it's not part of a comment or string,
                    // break out of the for loop iterating over the line tokens
                    if (inCommentOrString == 0 && isAKeyword == 0 && (regExp1.test(tokenString) || regExp2.test(tokenString) || tokenString.match(/\{/))) {
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
                    if (regExp2.test(matchedKeyword) || matchedKeyword.match(/\{/)) {
                      count++;

                    } else if (regExp1.test(matchedKeyword) && regExp3.test(lineText)) {
                      count++;
                    }
                  }

                  // console.log(count);
              }

              // console.log(count);

              if (count == 0) {
                addDecorations(editor, lineText, lineNumber)
                break;
              }
            }

          } else {
            vscode.window.showInformationMessage('Please place the cursor on or select only word characters in a line');
          }

        }); 

      } else {
        vscode.window.showInformationMessage('Nothing is selected');
      }
    }
  });

  let disposable2 = vscode.commands.registerCommand('extension.showStartOfScope', () => {
    // If the line is already highlighted, do nothing
    if (decorationType) {
      // vscode.window.showInformationMessage('Line is already highlighted');
      return;
    }

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
        registry.loadGrammar('source.python').then(grammar => {
          if (!grammar) {
            console.error('Grammar is null!');
          }

          let word = editor.document.getText(range);

          // Check if the cursor is placed on a word, or if a word is selected
          if (word) {
            let lineNumber = editor.selection.start.line;
            let lineText = editor.document.lineAt(lineNumber).text;
            let indentSizeInSpaces: number = +editor.options.tabSize;
            let spacesBeforeStartingLine = 0;
            const regExp1 = new RegExp(/\b(class|def|elif|else|except|finally|for|if|try|while)\b/);
            const regExp2 = new RegExp(/^\s*\b(class|def|elif|else|except|finally|for|if|try|while)\b/);

            for (let i = 0; i < lineText.length; i++) {
              if (lineText[i].match(/\s/)) {
                spacesBeforeStartingLine++;
              } else {
                break;
              }
            }

            let spacesBeforeTargetLine = spacesBeforeStartingLine - indentSizeInSpaces;

            if (spacesBeforeTargetLine >= 0) {
              // Regex to find lines with target number of indent spaces (spacesBeforeStartingLine - indentSizeSpaces)
              // Want to find lines with scope that's one indent previous to the starting line
              // i.e. ^\s{4}\S+
              let regExpString = "^\\s{" + spacesBeforeTargetLine.toString() + "}\\S+";
              let regExp = new RegExp(regExpString);

              for (lineNumber = editor.selection.start.line; lineNumber >= 0; lineNumber--) {
                lineText = editor.document.lineAt(lineNumber).text;

                // If the current line has the indentation we're looking for...
                if (regExp.test(lineText)) {
                  // And matches one of the keywords we're looking for...
                  if (regExp1.test(lineText)) {
                    let lineTokens = grammar.tokenizeLine(lineText, null);
                    // Go through each token in the line to find the keyword. Check that it's not part of a comment or string
                    // scope, and that it's scope list contains the word "keyword"
                    for (let i = 0; i < lineTokens.tokens.length; i++) {
                      let startScopeInCommentOrString = -1;
                      let isAKeyword = -1;
                      let token = lineTokens.tokens[i];
                      let tokenString = (lineText.substring(token.startIndex, token.endIndex));
                      
                      if (regExp1.test(tokenString)) {
                        startScopeInCommentOrString = 0;

                        for (let i = 0; i < token.scopes.length; i++) {
                          if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                            startScopeInCommentOrString = 1;
                            break;
                          }
                          // Check to make sure the token is a keyword
                          if (token.scopes[i].includes('keyword')) {
                            isAKeyword = 0;
                          }
                        }

                        // If the correct line and token has been found, if the line is not a single line conditional/loop,
                        // highlight the line and return
                        if (startScopeInCommentOrString == 0 && isAKeyword == 0) {
                          if (regExp2.test(lineText)) {
                            addDecorations(editor, lineText, lineNumber);
                            return;
                          }
                        } else {
                          continue;
                        }
                      }
                    }

                  // Match lines inside of dictionaries to the right scope
                  } else if (lineText.match(/\{/)) {
                    let lineTokens = grammar.tokenizeLine(lineText, null);
                    // Check that "{" is not part of a comment or string scope, and that it's scope list contains 
                    // the scope "punctuation.definition.dict.begin"
                    for (let i = 0; i < lineTokens.tokens.length; i++) {
                      let inCommentOrString = -1;
                      let isAKeyword = -1;
                      let token = lineTokens.tokens[i];
                      let tokenString = (lineText.substring(token.startIndex, token.endIndex));

                      if (tokenString.match(/\{/)) {
                        inCommentOrString = 0;

                        for (let i = 0; i < token.scopes.length; i++) {
                          if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                            inCommentOrString = 1;
                            break;
                          }
                          // Check to make sure the token has the scope "punctuation.definition.dict.begin"
                          if (token.scopes[i].includes('punctuation.definition.dict.begin')) {
                            isAKeyword = 0;
                          }
                        }

                        if (inCommentOrString == 0 && isAKeyword == 0) {
                          addDecorations(editor, lineText, lineNumber);
                          return;

                        } else {
                          continue;
                        }
                      }
                    }
                  }
                  
                } else {
                  continue;
                }
              }
            }

          } else {
            vscode.window.showInformationMessage('Please place the cursor on or select only word characters in a line');
          }
        });

      } else {
        vscode.window.showInformationMessage('Nothing is selected');
      }
    }
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(disposable2);

  function addDecorations(editor: vscode.TextEditor, lineText: string, lineNumber: number) {
    // Get the color from the user settings. If the color code is invalid or the provided value is not a string,
    // default to #BABABA
    let color = vscode.workspace.getConfiguration('highlightColor').get('color');

    if (typeof color !== 'string' || !color.match(/#[0-9A-F]{6}/)) {
      color = "#BABABA";
    }

    decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: color
    });

    let firstCharIndex = /(\S)/.exec(lineText).index;
    let highlightRange = new vscode.Range(lineNumber, firstCharIndex, lineNumber, lineText.length);
    editor.setDecorations(decorationType, [highlightRange]);

    let blockStartPosition = new vscode.Position(lineNumber, 0);
    let currentVisibleRange = editor.visibleRanges[0];

    // If the line isn't already visible, scroll to where the block's start line is at the top
    if (!currentVisibleRange.contains(blockStartPosition)) {
      editor.revealRange(new vscode.Range(blockStartPosition, blockStartPosition), vscode.TextEditorRevealType.AtTop);
    }
  }

  // Remove the highlighting upon cursor change
  vscode.window.onDidChangeTextEditorSelection(() => {
    if (decorationType) {
      const editor = vscode.window.activeTextEditor;

      if (editor) {
        decorationType.dispose();
        decorationType = null;
      }
    }
  })
}

// This method is called when your extension is deactivated
export function deactivate() {
}
