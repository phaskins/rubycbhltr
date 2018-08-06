'use strict';

import * as vscode from 'vscode';
import { IToken, ITokenizeLineResult } from 'vscode-textmate';
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
          let firstEnd: number;
          let foundDocComment = 0;
          let inAMultiLineComment = 0;
          let matchedKeyword: string;
          let firstBlockKeyword = '';
          let firstBlockKeywordIndex = -1;
          let lineText: string;
          let hereDocBeginRegExp: RegExp;
          const hereDocEndRegExp = new RegExp(/^\s*([\w]+)$/);
          const regExp = new RegExp(/(\bend\b|\}|\{)/);
          const regExp1 = new RegExp(/\b(if|unless|while|until)\b/);
          const regExp2 = new RegExp(/\b(begin|case|class|def|do|for|module)\b/);
          const regExp3 = new RegExp(/^\s*\b(if|unless|while|until)\b/);

          // The line number returned is off by 1 (line numbers start at 0, instead of at 1 like in the editor)
          for (let lineNumber = editor.selection.start.line; lineNumber >= 0; lineNumber--) {
            lineText = editor.document.lineAt(lineNumber).text;

            // If the function is activated on a line that does not contain "end", then go ahead and decrement the 
            // counter once the first keyword "end" is found (like normal). The reason for this is that the count
            // is initialized to -1 on the line we start at. So if the line contains "end", we don't want to decrement 
            // the counter again when we already did so from the beginning
            if (lineNumber == editor.selection.start.line && lineText.match(/end/)) {
              firstEnd = 0;
            } else {
              firstEnd = 1;
            }

            // Ignore multiline comments denoted by =begin/=end
            if (lineText.match(/^=end/)) {
              inAMultiLineComment = 1;
              continue;
            } else if (lineText.match(/^=begin/)) {
              inAMultiLineComment = 0;
              continue;
            }
            if (inAMultiLineComment == 1) {
              continue;
            }

            // Check for possible heredoc declarations. Skip each line until the begin heredoc delimiter is found
            if (lineText.match(hereDocEndRegExp)) {
              let heredocDelimiter = lineText.match(hereDocEndRegExp)[1];
              let currentLineTokens: ITokenizeLineResult;
              let ruleStack = null;
              let matchedScopes = 0;

              for (let line = 0; line <= lineNumber; line++) {
                let text = editor.document.lineAt(line).text;
                currentLineTokens = grammar.tokenizeLine(text, ruleStack);
                ruleStack = currentLineTokens.ruleStack;
              }

              for (let i = 0; i < currentLineTokens.tokens.length; i++) {
                let token = currentLineTokens.tokens[i];
                let tokenString = (lineText.substring(token.startIndex, token.endIndex));

                if (tokenString.match(heredocDelimiter)) {

                  for (let i = 0; i < token.scopes.length; i++) {
                    // Check to make sure the token has these specific keywords
                    if (token.scopes[i].includes('punctuation.definition.string.end') || token.scopes[i].includes('string.unquoted.heredoc')) {
                      matchedScopes++;
                    }
                  }
                }
              }

              // We have found the ending of a heredoc
              if (matchedScopes == 2) {
                let hereDocBeginString = "\<\<[-~]?" + heredocDelimiter;
                hereDocBeginRegExp = new RegExp(hereDocBeginString);
                foundDocComment = 1;
                continue;
              }
            }

            // If we are within the scope of a heredoc, check for the beginning of the heredoc. If found,
            // we can resume our bracket matching. Otherwise, we can skip each line until we find it
            if (foundDocComment == 1) {
              if (lineText.match(hereDocBeginRegExp)) {
                let currentLineTokens = grammar.tokenizeLine(lineText, null);
                let matchedScopes = 0;

                // Check to make sure it's not part of a comment or regular string
                for (let i = 0; i < currentLineTokens.tokens.length; i++) {
                  let token = currentLineTokens.tokens[i];
                  let tokenString = (lineText.substring(token.startIndex, token.endIndex));

                  if (tokenString.match(hereDocBeginRegExp)) {

                    for (let i = 0; i < token.scopes.length; i++) {
                      // Check to make sure the token has these specific keywords
                      if (token.scopes[i].includes('punctuation.definition.string.begin') || token.scopes[i].includes('string.unquoted.heredoc')) {
                        matchedScopes++;
                      }
                    }
                  }
                }

                // We have found the beginning of a heredoc. Stop skipping lines and don't skip the current line
                if (matchedScopes == 2) {
                  foundDocComment = 0;
                } else {
                  continue;
                }

              } else {
                continue;
              }
            }

            // Check if the line has the word 'end', '{', or }'
            if (regExp.test(lineText)) {
              let lineTokens = grammar.tokenizeLine(lineText, null);

              // Tokenize the line and iterate through each token
              for (let i = 0; i < lineTokens.tokens.length; i++) {
                let inCommentOrString = -1;
                let startBlockInCommentOrString = -1;
                let isAKeyword = -1;
                let token = lineTokens.tokens[i];
                let tokenString = (lineText.substring(token.startIndex, token.endIndex));

                // If a token matches the word 'end', check to make sure it's not in a comment or string
                // If a comment or string scope is found, set inCommentOrString to 1 and
                // break the for loop (that's iterating over the scopes). Do something similar for "}"
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
                  // iterating over the scopes. Do something similar for "{"
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
                // Else if inCommentOrString == 0 and the token is a keyword ("end", "{"), decrement the count
                if (startBlockInCommentOrString == 0 && isAKeyword == 0) {
                  // Find the string and index of the first block keyword in the first line.
                  // This is important if we decide we want to highlight the parent class of, let's say, an if statement
                  // instead of having it highlight itself
                  if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                    firstBlockKeyword = tokenString;
                    firstBlockKeywordIndex = token.startIndex;
                  }
                  count++;

                } else if (inCommentOrString == 0 && isAKeyword == 0) {
                  // Do not decrement the count for the first "end" encountered. That is already
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
              let token: IToken;
              let tokenString: string;

              for (let i = 0; i < lineTokens.tokens.length; i++) {
                token = lineTokens.tokens[i];
                tokenString = (lineText.substring(token.startIndex, token.endIndex));
                // Updated matchedKeyword. When this variable is checked at the end, it should contain the match
                matchedKeyword = tokenString;

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

              if (inCommentOrString == 0 && isAKeyword == 0) {
                if (regExp2.test(matchedKeyword) || matchedKeyword.match(/\{/)) {
                  // Find the string and index of the first block keyword in the first line
                  // This is important if we decide we want to highlight the parent class of, let's say, an if statement
                  // instead of having it highlight itself
                  if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                    firstBlockKeyword = tokenString;
                    firstBlockKeywordIndex = token.startIndex;
                  }
                  count++;

                  // If the line doesn't have an if/unless/while/until in it, go ahead and increment the count.
                  // But if the line does contain one of those keywords, check to make sure there is only whitespace
                  // before it (don't want to match one line statements)
                } else if (regExp1.test(matchedKeyword) && regExp3.test(lineText)) {
                  if (lineNumber == editor.selection.start.line && firstBlockKeywordIndex == -1) {
                    firstBlockKeyword = tokenString;
                    firstBlockKeywordIndex = token.startIndex;
                  }
                  count++;
                }
              }
              // console.log(count);
            }

            // console.log(count);

            if (count == 0) {
              // If target line = start line (i.e. the line to be highlighted is the line the command is initialized on)
              // If the cursor is behind the keyword: if, while, begin, do, etc. then highlight its parent scope by
              // decrementing the count. Else if the cursor is after the keyword, go ahead and highlight the current line.
              // This helps provide a better sense of scope. Any text after keywords such as if, while, begin, do, etc.
              // is part of that scope. But the block statement itself belongs to its parent scope.
              if (firstBlockKeywordIndex != -1 && lineNumber == editor.selection.start.line && editor.selection.start.character < (firstBlockKeywordIndex + firstBlockKeyword.length + 1)) {
                count--;
                firstBlockKeywordIndex = -1;
                continue;
              }

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