import * as vscode from 'vscode'

import ImportBeautifier from './ImportBeautifier'

export function activate(context: vscode.ExtensionContext) {

  const beautifier = new ImportBeautifier()

  let disposable = vscode.commands.registerCommand('extension.beautifyImports', () => {
    beautifier.execute()
  })

  context.subscriptions.push(disposable)
}

export function deactivate() {/* */}
