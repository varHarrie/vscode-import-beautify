import * as vscode from 'vscode'

import ImportBeautifier from './ImportBeautifier'

export function activate(context: vscode.ExtensionContext) {

  const beautifier = new ImportBeautifier()

  const beautifyDisposer = vscode.commands.registerCommand('extension.beautifyImports', (e) => {
    const editor = vscode.window.activeTextEditor

    if (!editor || !beautifier.shouldExecute(editor.document)) {
      return
    }

    const edits = beautifier.execute(editor.document)
    const edit = new vscode.WorkspaceEdit()

    edit.set(editor.document.uri, edits)

    vscode.workspace.applyEdit(edit)
  })

  const onSaveDisposer = vscode.workspace.onWillSaveTextDocument((e) => {
    if (!beautifier.shouldExecuteOnSave(e.document)) {
      return
    }

    const promise = new Promise((resolve) => {
      resolve(beautifier.execute(e.document))
    })

    e.waitUntil(promise)
  })

  context.subscriptions.push(beautifyDisposer)
  context.subscriptions.push(onSaveDisposer)
}

export function deactivate() {/* */}
