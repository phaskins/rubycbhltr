'use strict';

import * as vscode from 'vscode';
import { IToken } from 'vscode-textmate';
import { registry, addDecorations, decorationType } from './extension';

// States:
// 0: Start of line
// 1: Spaces after start of line
// 5: Begin, Case, Class, Def, Do, For, Module, { keywords found
// 6: If, Unless, Until, While keywords found
// 7: End, } keywords found
// 8: Non-keyword found
// 9: Spaces directly after a non-keyword

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

          let firstBlockKeyword = '';
          let firstBlockKeywordIndex = -1;

          let lastSeenBlockKeyword = '';
          let elseWhenOrRescueKeywordFound = '';
          let storedLineNumber = -1;
          let storedLineText = '';

          // console.time('Whole Line Runtime')

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
              let tokenString = lineText.substring(token.startIndex, token.endIndex);
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
                      // Find the string and index of the first block keyword in the first line
                      // This is important if we decide we want to highlight the parent class of, let's say, an if statement
                      // instead of having it highlight itself
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'case'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'class'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'def'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'do'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'for'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9 ) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'if'):
                  if (prevState == 0 || prevState == 1) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 6;
                  }
                  break;

                case (tokenString == 'module'):
                  if (prevState == 0 || prevState == 1 || prevState == 8 || prevState == 9) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 5;
                  }
                  break;

                case (tokenString == 'unless'):
                  if (prevState == 0 || prevState == 1) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 6;
                  }
                  break;

                case (tokenString == 'until'):
                  if (prevState == 0 || prevState == 1) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 6;
                  }
                  break;

                case (tokenString == 'while'):
                  if (prevState == 0 || prevState == 1) {
                    containsScope = isScopeInScopeArray(token, 'keyword');

                    if (containsScope == 0) {
                      if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                        firstBlockKeyword = tokenString;
                        firstBlockKeywordIndex = token.startIndex;
                      }
                      lastSeenBlockKeyword = tokenString;
                      count++;
                    }
                    prevState = 6;
                  }
                  break;

                case (tokenString == '{'):
                  containsScope = isScopeInScopeArray(token, 'punctuation.section.scope.begin');
                  let inString = isScopeInScopeArray(token, 'string');

                  if (containsScope == 0 && inString == 1) {
                    if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                      firstBlockKeyword = tokenString;
                      firstBlockKeywordIndex = token.startIndex;
                    }
                    count++;
                  }
                  prevState = 5;
                  break;

                case (tokenString == 'elsif'):
                  containsScope = isScopeInScopeArray(token, 'keyword');

                  if (containsScope == 0 && count + 1 == 0 && elseWhenOrRescueKeywordFound == '') {
                    if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                      firstBlockKeyword = tokenString;
                      firstBlockKeywordIndex = token.startIndex;
                    }
                    elseWhenOrRescueKeywordFound = tokenString;
                    storedLineNumber = lineNumber;
                    storedLineText = lineText;
                  }
                  break;

                case (tokenString == 'else'):
                  containsScope = isScopeInScopeArray(token, 'keyword');

                  if (containsScope == 0 && count + 1 == 0 && elseWhenOrRescueKeywordFound == '') {
                    if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                      firstBlockKeyword = tokenString;
                      firstBlockKeywordIndex = token.startIndex;
                    }
                    elseWhenOrRescueKeywordFound = tokenString;
                    storedLineNumber = lineNumber;
                    storedLineText = lineText;
                  }
                  break;

                case (tokenString == 'rescue'):
                  containsScope = isScopeInScopeArray(token, 'keyword');

                  if (containsScope == 0 && count + 1 == 0 && elseWhenOrRescueKeywordFound == '') {
                    if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                      firstBlockKeyword = tokenString;
                      firstBlockKeywordIndex = token.startIndex;
                    }
                    elseWhenOrRescueKeywordFound = tokenString;
                    storedLineNumber = lineNumber;
                    storedLineText = lineText;
                  }
                  break;

                case (tokenString == 'when'):
                  containsScope = isScopeInScopeArray(token, 'keyword');

                  if (containsScope == 0 && count + 1 == 0 && elseWhenOrRescueKeywordFound == '') {
                    if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                      firstBlockKeyword = tokenString;
                      firstBlockKeywordIndex = token.startIndex;
                    }
                    elseWhenOrRescueKeywordFound = tokenString;
                    storedLineNumber = lineNumber;
                    storedLineText = lineText;
                  }
                  break;
                  
                case (tokenString == 'end'):
                  // If the function is activated on a line that does not contain "end", then go ahead and decrement the 
                  // counter once the first keyword "end" is found (like normal). The reason for this is that the count
                  // is initialized to -1 on the line we start at. So if the line contains "end", we don't want to decrement 
                  // the counter again when we already did so from the beginning
                  if (lineNumber == editor.selection.start.line && firstEndCharFound == 0) {
                    if (firstBlockKeywordIndex == -1) {
                      firstBlockKeyword = tokenString;
                      firstBlockKeywordIndex = token.startIndex;
                    }
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
                    let inString = isScopeInScopeArray(token, 'string');

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
              // If target line = start line (i.e. the line to be highlighted is the line the command is initialized on)
              // If the cursor is behind the keyword: if, while, begin, do, etc. then highlight its parent scope by
              // decrementing the count. Else if the cursor is after the keyword, go ahead and highlight the current line.
              // This helps provide a better sense of scope. Any text after keywords such as if, while, begin, do, etc.
              // is part of that scope. But the block statement itself belongs to its parent scope.
              if (firstBlockKeywordIndex != -1 && firstBlockKeyword != 'end' && editor.selection.start.character < (firstBlockKeywordIndex + firstBlockKeyword.length + 1)) {
                // If the command wasn't initialized with the cursor on an "elsif", "else", "rescue", or "when", go ahead and 
                // decrement the count to select the parent scope
                if (lineNumber == editor.selection.start.line) {
                  count--;
                  continue;

                // However if the command WAS initialized with the curspr on an "elsif", "else", "rescue", or "when",
                // just use lineNumber and lineText to highlight the parent block, instead of storedLineNumber 
                // storedLineText
                } else if (storedLineNumber == editor.selection.start.line) {
                  addDecorations(editor, lineText, lineNumber);
                  break;
                }
              }
              // Allow for the ability to highlight "elsif", "else", "rescue", and "when", without disrupting the count.
              // First, if one of these keywords is found, and doing a "count++" would bring the count to 0, store
              // the lineNumber and lineText for later use. When the line to be highlighted is found, check the
              // lastSeenBlockKeyword. If they match up, i.e. "else" found earlier and "if" found as the lastSeenBlockKeyword,
              // then highlight, i.e., that "else" line (the previously storedLineNumber) instead. If the command is activated
              // on the word "end", this "end" needs to match with the start block keyword (i.e. an "if") and not an
              // "elsif" or "else". So check for that and don't do the following.
              if (elseWhenOrRescueKeywordFound != '' && firstBlockKeyword != 'end' && storedLineNumber != -1 && storedLineText != '') {

                switch (elseWhenOrRescueKeywordFound) {
                  case 'elsif':
                    if (lastSeenBlockKeyword == 'if') {
                      addDecorations(editor, storedLineText, storedLineNumber);
                    }
                    break;

                  case 'else':
                    if (lastSeenBlockKeyword == 'if' || lastSeenBlockKeyword == 'case' || lastSeenBlockKeyword == 'begin') {
                      addDecorations(editor, storedLineText, storedLineNumber);
                    }
                    break;

                  case 'rescue':
                    if (lastSeenBlockKeyword == 'begin') {
                      addDecorations(editor, storedLineText, storedLineNumber);
                    }
                    break;

                  case 'when':
                    if (lastSeenBlockKeyword == 'case') {
                      addDecorations(editor, storedLineText, storedLineNumber);
                    }
                    break;
                }
              
              } else {
                addDecorations(editor, lineText, lineNumber);
              }

              // console.timeEnd('Whole Line Runtime')
              break;
            }
          }  

        } else {
          vscode.window.showInformationMessage('Please place the cursor on or select only word characters in a line');
        }

      });

    } else {
      vscode.window.showInformationMessage('Please select text or place the cursor near a word character');
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
