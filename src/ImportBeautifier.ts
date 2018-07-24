import * as vscode from 'vscode'

import * as regexp from './regexp'
import { Configuration, OrderCaseFirstType, OrderDirectionType, TabType, TrailingCommaType, QuotemarkType, Group, OrderByType } from './configuration'

const allowedLanguages = [
  'typescript', 'typescriptreact'
]

type ImportItem = {
  path: string
  names: string
  default: string | null
  destructed: string[][] | null
  namespace: string | null
  range: vscode.Range
}

export default class ImportBeautifier {

  private config = Configuration.from('importBeautify')

  private getTabChars (tabType: TabType, tabSize: number) {
    return tabType === TabType.space
      ? Array.from({length: tabSize + 1}).join(' ')
      : '\t'
  }

  private sort (a: string, b: string, caseFirst: OrderCaseFirstType, direction: OrderDirectionType) {
    if (caseFirst === OrderCaseFirstType.ignore) {
      a = a.toLowerCase()
      b = b.toLowerCase()
    }

    const r = a.localeCompare(b, 'en', {caseFirst})

    return direction === OrderDirectionType.desc ? -r : r
  }

  private isInGroup (item: ImportItem, names?: RegExp, path?: RegExp) {
    if (names && !names.test(item.names)) {
      return false
    }

    if (path && !path.test(item.path)) {
      return false
    }

    return true
  }

  private regroup (list: ImportItem[], rules: Group[], caseFirst: OrderCaseFirstType, direction: OrderDirectionType, orderBy: OrderByType) {
    const rest = [...list]

    const groups =  rules.map((r) => {
      let group: ImportItem[] = []
      const names = r.names ? new RegExp(r.names) : undefined
      const path = r.path ? new RegExp(r.path) : undefined

      for (let i = 0; i < rest.length; i++) {
        if (this.isInGroup(rest[i], names, path)) {
          group.push(rest[i])
          rest.splice(i--, 1)
        }
      }

      if (r.groups) {
        group = ([] as ImportItem[]).concat(...this.regroup(group, r.groups, caseFirst, direction, orderBy))
      } else if (r.orderBy !== OrderByType.none) {
        if (r.orderBy === OrderByType.names) {
          group = group.sort((a, b) => this.sort(a.names, b.names, caseFirst, direction))
        } else if (r.orderBy === OrderByType.path) {
          group = group.sort((a, b) => this.sort(a.path, b.path, caseFirst, direction))
        } else if (orderBy === OrderByType.names) {
          group = group.sort((a, b) => this.sort(a.names, b.names, caseFirst, direction))
        } else if (orderBy === OrderByType.path) {
          group = group.sort((a, b) => this.sort(a.path, b.path, caseFirst, direction))
        }
      }
      return group
    })

    if (rest.length) {
      groups.push(rest)
    }

    return groups
  }

  private parseDestructedImport (source: string | null) {
    return typeof source === 'string'
      ? source.slice(1, -1).split(',').map((f) => f.trim().split(/[\s\n\r]+as[\s\n\r]+/)).filter((d) => Boolean(d[0]))
      : null
  }

  private parseImports (document: vscode.TextDocument) {
    const source = document.getText()
    const imports: ImportItem[] = []

    let match

    while (match = regexp.imports.exec(source)) {
      imports.push({
        names: '',
        path: match[10],
        default: match[3] || match[8],
        destructed: this.parseDestructedImport(match[4] || match[9]),
        namespace: match[6],
        range: new vscode.Range(
          document.positionAt(match.index),
          document.positionAt(match.index + match[0].length + 1)
        )
      })
    }

    return imports
  }

  private stringifyDestructed (
    destructed: string[][] | null,
    tab: string,
    multiLine: boolean,
    comma: boolean
  ) {
    if (!destructed) {
      return ''
    }

    if (!destructed.length) {
      return '{}'
    }

    const c = multiLine ? tab : ''
    const l = destructed.length - 1

    const body = destructed
      .map((d) => d.join(' as '))
      .map((d, i) => c + d + (i < l || comma ? ',' : ''))

    return ['{', ...body, '}'].join(multiLine ? '\n' : ' ')
  }

  private stringifyNames (
    item: ImportItem,
    tab: string,
    trailingComma: TrailingCommaType,
    maxCount: number,
    maxLength: number
  ) {
    if (item.namespace) {
      return '* as ' + item.namespace
    }

    const multiLine = !!item.destructed && item.destructed.length > maxCount
    let comma = trailingComma === TrailingCommaType.always || trailingComma === TrailingCommaType.multiLine && multiLine
    let names = [item.default, this.stringifyDestructed(item.destructed, tab, multiLine, comma)].filter(Boolean).join(', ')

    if (!multiLine && names.length > maxLength) {
      comma = trailingComma !== TrailingCommaType.none
      names = [item.default, this.stringifyDestructed(item.destructed, tab, true, comma)].filter(Boolean).join(', ')
    }

    return names
  }

  private beautifyImports (imports: ImportItem[]) {
    const destructedCaseFirst = this.config.getDestructedOrderCaseFirst()
    const destructedDirection = this.config.getDestructedOrderDirection()
    const tabChars = this.getTabChars(this.config.getTabType(), this.config.getTabSize())
    const maxCount = this.config.getMaxLineCount()
    const maxLength = this.config.getMaxLineLength()
    const trailingComma = this.config.getTrailingComma()
    const hasSemicolon = this.config.hasSemicolon()
    const groups = this.config.getGroups()
    const caseFirst = this.config.getOrderCaseFirst()
    const direction = this.config.getOrderDirection()
    const orderBy = this.config.getOrderBy()

    imports.forEach((item) => {
      if (item.destructed) {
        item.destructed = item.destructed.sort((a, b) => this.sort(a[0], b[0], destructedCaseFirst, destructedDirection))
      }

      const len = maxLength - (hasSemicolon ? 16 : 15) - item.path.length
      item.names = this.stringifyNames(item, tabChars, trailingComma, maxCount, len)
    })

    return this.regroup(imports, groups, caseFirst, direction, orderBy)
  }

  private stringifyImports (imports: ImportItem[][]) {
    const emptyLines = this.config.getEmptyLines()
    const quote = this.config.getQuotemark() === QuotemarkType.single ? '\'' : '"'
    const semi = this.config.hasSemicolon() ? ';' : ''

    return imports
      .filter((list) => !!list.length)
      .map((list) => {
        return list.map((item) => {
          return item.names
            ? `import ${item.names} from ${quote}${item.path}${quote}${semi}`
            : `import ${quote}${item.path}${quote}${semi}`
        }).join('\n') + '\n'
      }).join('\n'.repeat(emptyLines)) + '\n'.repeat(emptyLines)
  }

  public shouldExecute (document: vscode.TextDocument) {
    return allowedLanguages.indexOf(document.languageId) >= 0
  }

  public shouldExecuteOnSave (document: vscode.TextDocument) {
    return this.config.shouldBeautifyOnSave() && this.shouldExecute(document)
  }

  public execute (document: vscode.TextDocument): vscode.TextEdit[] {
    if (!this.shouldExecute(document)) {
      return []
    }

    try {
      const imports = this.parseImports(document)
      const beautifulImports = this.beautifyImports(imports)
      const results = this.stringifyImports(beautifulImports)

      const edits = imports.reverse().map((i) => vscode.TextEdit.delete(i.range))
      edits.push(vscode.TextEdit.insert(new vscode.Position(0, 0), results))

      return edits
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}
