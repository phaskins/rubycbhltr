'use strict';

import * as vscode from 'vscode';
import * as vsctm from 'vscode-textmate';
import * as fs from 'fs';
import * as path from 'path';
import { showStartOfBlockRuby } from './ruby'
import { showStartOfBlockPython } from './python'

let grammarPaths = {
  'source.ruby': '../syntaxes/ruby.tmLanguage.json',
  'source.python': '../syntaxes/MagicPython.tmLanguage.json'
};

export var registry = new vsctm.Registry({
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

export var decorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
  
  let disposable_ruby = vscode.commands.registerCommand('extension.showStartOfBlock', showStartOfBlockRuby);
  let disposable_python = vscode.commands.registerCommand('extension.showStartOfScope', showStartOfBlockPython);

  context.subscriptions.push(disposable_ruby);
  context.subscriptions.push(disposable_python);

  
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

export function addDecorations(editor: vscode.TextEditor, lineText: string, lineNumber: number) {
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

// This method is called when your extension is deactivated
export function deactivate() {
}
