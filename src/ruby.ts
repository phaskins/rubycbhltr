'use strict';

import * as vscode from 'vscode';
import { IToken } from 'vscode-textmate';
import { registry, addDecorations, decorationType } from './extension'

export function showStartOfBlockRuby() {
  // If the line is already highlighted, do nothing
  if (decorationType) {
    return;
  }

  const editor = vscode.window.activeTextEditor;

  if (editor) {
    let range: vscode.Range;

    if (editor.selection.isEmpty) {
      range = editor.document.getWordRangeAtPosition(editor.selection.start);

    } else {
      let startPos = editor.selection.start;
      let endPos = editor.selection.end;

      if (startPos.line != endPos.line) {
        vscode.window.showInformationMessage('Please select content on only one line');
        return;

      } else {
        range = new vscode.Range(startPos, endPos);
      }
    }

    // Check to make sure something is selected or that the cursor is visible
    if (range) {
      registry.loadGrammar('source.ruby').then(grammar => {
        if (!grammar) {
          console.error('Grammar is null!');
        }

        let word = editor.document.getText(range);

        // Check if the cursor is placed on a word, or if a word is selected
        if (word) {
          let count = -1;
          let lineText: string;
          let firstEndCharFound = 0;
          let spaceRegEx = /^\s+$/;
          let beginMultiLineCommentRegEx = /^=begin/;
          let endMultiLineCommentRegEx = /^=end/;
          let multiLineComment = 0;

          for (let lineNumber = editor.selection.start.line; lineNumber >= 0; lineNumber--) {
            lineText = editor.document.lineAt(lineNumber).text;
            let lineTokens = grammar.tokenizeLine(lineText, null);
            let prevState = 0;
            let skipToNextLine = 0;

            if (endMultiLineCommentRegEx.test(lineText)) {
              multiLineComment = 1;
              continue;
            } else if (beginMultiLineCommentRegEx.test(lineText)) {
              multiLineComment = 0;
              continue;
            }
            if (multiLineComment == 1) {
              continue;
            }

            for (let i = 0; i < lineTokens.tokens.length; i++) {
              let containsScope = -1;
              let token = lineTokens.tokens[i];
              let tokenString = (lineText.substring(token.startIndex, token.endIndex));
              // console.log(tokenString)

              switch (true) {
                case spaceRegEx.test(tokenString):
                  if (prevState == 0) {
                    prevState = 1;
                  } else if (prevState == 8) {
                    prevState = 9;
                  }
                  break;

                case (tokenString == '#'):
                  if (prevState == 0 || prevState == 1) {
                    skipToNextLine = 1;
                  }
                  break;

                case(tokenString == 'begin'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9 ) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'case'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'class'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'def'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'do'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'for'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9 ) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'if'):
                  if (prevState == 0 || prevState == 1) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 6;
                  }
                  break;

                case (tokenString == 'module'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'unless'):
                  if (prevState == 0 || prevState == 1) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 6;
                  }
                  break;

                case (tokenString == 'until'):
                  if (prevState == 0 || prevState == 1) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 6;
                  }
                  break;

                case (tokenString == 'while'):
                  if (prevState == 0 || prevState == 1) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count++;
                    }
                    prevState = 6;
                  }
                  break;

                case (tokenString == '{'):
                  containsScope = isScopeInScopeArray(token, 'punctuation.section.scope.begin');
                  let inString = isScopeInScopeArray(token, 'string')

                  if (containsScope == 0 && inString == 1) {
                    count++;
                  }
                  prevState = 5;
                  break;

                case (tokenString == 'end'):
                  // If the function is activated on a line that does not contain "end", then go ahead and decrement the 
                  // counter once the first keyword "end" is found (like normal). The reason for this is that the count
                  // is initialized to -1 on the line we start at. So if the line contains "end", we don't want to decrement 
                  // the counter again when we already did so from the beginning
                  if (lineNumber == editor.selection.start.line && firstEndCharFound == 0) {
                    firstEndCharFound = 1;
                  } else if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');
                    if (containsScope == 0) {
                      count--;
                    }
                    prevState = 7;
                  }
                  break;

                case (tokenString == '}'):
                  if (lineNumber == editor.selection.start.line && firstEndCharFound == 0) {
                    firstEndCharFound = 1;
                  } else {
                    containsScope = isScopeInScopeArray(token, 'punctuation.section.scope.end');
                    let inString = isScopeInScopeArray(token, 'string')

                    if (containsScope == 0 && inString == 1) {
                      count--;
                    }
                    prevState = 7;
                  }
                  break;

                default: 
                  prevState = 8;
              }

              if (containsScope == 1) {
                continue;
              }

              if (skipToNextLine == 1) {
                break;
              }

              // console.log(count)
            }

            if (skipToNextLine == 1) {
              continue;
            }

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
}

function isScopeInScopeArray(token: IToken, string: string): number {
  for (let i = 0; i < token.scopes.length; i++) {
    if (token.scopes[i].includes(string)) {
      return 0;
    }
  }
  return 1;
}

