'use strict';

import * as vscode from 'vscode';
import { registry, addDecorations, decorationType } from './extension'

export function showStartOfBlockPython() {
  // If the line is already highlighted, do nothing
  if (decorationType) {
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

      if (startPos.line != endPos.line) {
        vscode.window.showInformationMessage('Please select content on only one line');
        return;

      } else {
        range = new vscode.Range(startPos, endPos);
      }
    }

    // Check to make sure something is selected or that the cursor is visible
    if (range) {
      registry.loadGrammar('source.python').then(grammar => {
        if (!grammar) {
          console.error('Grammar is null!');
        }

        let word = editor.document.getText(range);

        // Check if the cursor is placed on a word, or if a word is selected
        if (word) {
          // let indentSizeInSpaces: number = +editor.options.tabSize;
          let lineNumber = editor.selection.start.line;
          let lineText = editor.document.lineAt(lineNumber).text;;
          let spacesBeforeStartingLine = lineText.search(/\S/);
          let spacesBeforeTargetLine;
          const regExp1 = new RegExp(/\b(class|def|elif|else|except|finally|for|if|try|while)\b/);
          const regExp2 = new RegExp(/^\s*\b(class|def|elif|else|except|finally|for|if|try|while)\b/);

          // Find the number of spaces before the previous indent/parent scope
          for (lineNumber = editor.selection.start.line; lineNumber >= 0; lineNumber--) {
            lineText = editor.document.lineAt(lineNumber).text;

            // Don't match lines with nothing on it
            if (!lineText.match(/^\s*$/)) {
              spacesBeforeTargetLine = lineText.search(/\S/);

              if (spacesBeforeTargetLine != -1 && spacesBeforeTargetLine < spacesBeforeStartingLine) {
                break;
              }
            }
          }

          // Regex to find lines with target number of indent spaces (spacesBeforeTargetLine)
          // i.e. ^\s{4}\S+
          let regExpString = "^\\s{" + spacesBeforeTargetLine.toString() + "}\\S+";
          let regExp = new RegExp(regExpString);

          if (spacesBeforeStartingLine > 0 && spacesBeforeTargetLine >= 0) {

            for (lineNumber = editor.selection.start.line; lineNumber >= 0; lineNumber--) {
              lineText = editor.document.lineAt(lineNumber).text;

              // If the current line has the indentation we're looking for...
              if (regExp.test(lineText)) {

                // Decrement the target indent size (of the line we're looking for) when a multiline doc comment delimiter
                // is found. Need to do this here, in cases of (for example) when there is a multiline doc comment that has a
                // multiline string variable declaration right behind it. We want the indented string lines to match
                // the variable declaration lines, while we want the doc comment string lines to match the scope
                // previous to that. Now we need to find the number of spaces before the previous scope and update the
                // spacesBeforeTargetLine variable
                if (lineText.match(/^\s*[\"\']{3}/)) {
                  let oldSpacesBeforeTargetLine = spacesBeforeTargetLine;

                  for (let lineNum = lineNumber; lineNum >= 0; lineNum--) {
                    let currentLineText = editor.document.lineAt(lineNum).text;

                    // Don't match lines with nothing on it or with leading white space followed by doc comment delimiters
                    if (!currentLineText.match(/^\s*$/) && !currentLineText.match(/^\s*[\"\']{3}/)) {
                      spacesBeforeTargetLine = currentLineText.search(/\S/);

                      if (spacesBeforeTargetLine < oldSpacesBeforeTargetLine && spacesBeforeTargetLine < spacesBeforeStartingLine) {
                        // Reset these variables
                        regExpString = "^\\s{" + spacesBeforeTargetLine.toString() + "}\\S+";
                        regExp = new RegExp(regExpString);
                        break;
                      }
                    }
                  }

                  // Now, only look for lines with the new target indent size
                  if (!regExp.test(lineText)) {
                    continue;
                  }
                }

                // If the current line matches one of the keywords we're looking for...
                if (regExp1.test(lineText)) {
                  let lineTokens = grammar.tokenizeLine(lineText, null);
                  // Go through each token in the line to find the keyword
                  for (let i = 0; i < lineTokens.tokens.length; i++) {
                    let startScopeInCommentOrString = -1;
                    let isAKeyword = -1;
                    let token = lineTokens.tokens[i];
                    let tokenString = (lineText.substring(token.startIndex, token.endIndex));

                    if (regExp1.test(tokenString)) {
                      startScopeInCommentOrString = 0;

                      // Check that it's not part of a comment or string scope, and that it's scope list 
                      // contains the word "keyword"
                      for (let i = 0; i < token.scopes.length; i++) {
                        if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                          startScopeInCommentOrString = 1;
                          break;
                        }
                        if (token.scopes[i].includes('keyword')) {
                          isAKeyword = 0;
                        }
                      }

                      // If the correct line and token have been found, and if the line is not a single line 
                      // conditional/loop, highlight the line and return
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
                }

                // Match lines inside of dictionaries to the right scope. If a keyword wasn't found in the line
                // check for parenthesis, braces, brackets, backslash, or variables with multiline comments as values
                if (lineText.match(/(\{|\(|\[|\\|^\s*\w+\s*=\s*[\"\']{3})/)) {
                  let lineTokens = grammar.tokenizeLine(lineText, null);

                  for (let i = 0; i < lineTokens.tokens.length; i++) {
                    let inCommentOrString = -1;
                    let isAKeyword = -1;
                    let token = lineTokens.tokens[i];
                    let tokenString = (lineText.substring(token.startIndex, token.endIndex));

                    if (tokenString.match(/\{/)) {
                      inCommentOrString = 0;

                      // Check that match is not part of a comment or string scope, and that it's scope list contains 
                      // the proper scope name
                      for (let i = 0; i < token.scopes.length; i++) {
                        if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                          inCommentOrString = 1;
                          break;
                        }

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

                      // Provide matching for line continuation using parenthesis
                    } else if (tokenString.match(/\(/)) {
                      inCommentOrString = 0;

                      for (let i = 0; i < token.scopes.length; i++) {
                        if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                          inCommentOrString = 1;
                          break;
                        }

                        if (token.scopes[i].includes('punctuation.definition.arguments.begin') || token.scopes[i].includes('punctuation.parenthesis.begin')) {
                          isAKeyword = 0;
                        }
                      }

                      if (inCommentOrString == 0 && isAKeyword == 0) {
                        addDecorations(editor, lineText, lineNumber);
                        return;

                      } else {
                        continue;
                      }

                      // Provide matching for line continuation using braces
                    } else if (tokenString.match(/\[/)) {
                      inCommentOrString = 0;

                      for (let i = 0; i < token.scopes.length; i++) {
                        if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                          inCommentOrString = 1;
                          break;
                        }

                        if (token.scopes[i].includes('punctuation.definition.list.begin')) {
                          isAKeyword = 0;
                        }
                      }

                      if (inCommentOrString == 0 && isAKeyword == 0) {
                        addDecorations(editor, lineText, lineNumber);
                        return;

                      } else {
                        continue;
                      }

                      // Provide matching for line continuation using backslash
                    } else if (tokenString.match(/\\/)) {
                      inCommentOrString = 0;

                      for (let i = 0; i < token.scopes.length; i++) {
                        if (token.scopes[i].includes('comment') || token.scopes[i].includes('string')) {
                          inCommentOrString = 1;
                          break;
                        }

                        if (token.scopes[i].includes('punctuation.separator.continuation.line')) {
                          isAKeyword = 0;
                        }
                      }

                      if (inCommentOrString == 0 && isAKeyword == 0) {
                        addDecorations(editor, lineText, lineNumber);
                        return;

                      } else {
                        continue;
                      }

                    } else if (tokenString.match(/[\"\']{3}/)) {
                      inCommentOrString = 0;

                      // Don't check for string scope here because we're looking to match something like this:
                      // s = ''' this is a very
                      //     long string '''

                      for (let i = 0; i < token.scopes.length; i++) {
                        if (token.scopes[i].includes('comment')) {
                          inCommentOrString = 1;
                          break;
                        }

                        if (token.scopes[i].includes('punctuation.definition.string.begin')) {
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
}