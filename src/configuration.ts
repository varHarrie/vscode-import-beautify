import * as vscode from 'vscode'

export enum TabType {
  space = 'space',
  tab = 'tab'
}

export enum QuotemarkType {
  single = 'single',
  double = 'double'
}

export enum TrailingCommaType {
  none = 'none',
  multiLine = 'multiLine',
  always = 'always'
}

export enum OrderByType {
  none = 'none',
  path = 'path',
  names = 'names'
}

export enum OrderCaseFirstType {
  ignore = 'ignore',
  lower = 'lower',
  upper = 'upper'
}

export enum OrderDirectionType {
  asc = 'asc',
  desc = 'desc'
}

export type Group = {
  names?: string
  path?: string
  orderBy?: OrderByType
  groups?: Group[]
}

export type PathRewrite = {
  regexp: RegExp
  replacement: string
}

export class Configuration {
  public static from (key: string) {
    return new Configuration(vscode.workspace.getConfiguration(key))
  }

  private config!: vscode.WorkspaceConfiguration

  private constructor (config: vscode.WorkspaceConfiguration) {
    this.config = config
  }

  public getTabType () {
    return this.config.get<TabType>('tabType')!
  }
  
  public getTabSize () {
    return this.config.get<number>('tabSize')!
  }
  
  public getQuotemark () {
    return this.config.get<QuotemarkType>('quotemark')!
  }
  
  public getTrailingComma () {
    return this.config.get<TrailingCommaType>('trailingComma')!
  }
  
  public hasSemicolon () {
    return this.config.get<boolean>('semicolon')!
  }
  
  public getMaxLineCount () {
    return this.config.get<number>('maxLineCount')!
  }
  
  public getMaxLineLength () {
    return this.config.get<number>('maxLineLength')!
  }
  
  public getOrderBy () {
    return this.config.get<OrderByType>('orderBy')!
  }
  
  public getOrderCaseFirst () {
    return this.config.get<OrderCaseFirstType>('orderCaseFirst')!
  }
  
  public getOrderDirection () {
    return this.config.get<OrderDirectionType>('orderDirection')!
  }
  
  public getDestructedOrderCaseFirst () {
    return this.config.get<OrderCaseFirstType>('destructedOrderCaseFirst')!
  }
  
  public getDestructedOrderDirection () {
    return this.config.get<OrderDirectionType>('destructedOrderDirection')!
  }
  
  public getEmptyLines () {
    return this.config.get<number>('emptyLines')!
  }

  public getLastEmptyLines () {
    return this.config.get<number>('lastEmptyLines')!
  }
  
  public getGroups () {
    return this.config.get<Group[]>('groups')!
  }
  
  public shouldBeautifyOnSave () {
    return this.config.get<boolean>('beautifyOnSave')!
  }

  public getPathRewrites () {
    const obj = this.config.get<any>('pathRewrites') || {}
    const rewrites: PathRewrite[] = []

    for (let key in obj) {
      rewrites.push({regexp: new RegExp(key), replacement: obj[key]})
    }

    return rewrites
  }
}
