const space = `[\\s\\n\\r]`
const name = `[a-zA-Z_$]+`

const defaultImport = name
const destructedImport = `{[^}]*}`
const namespaceImport = `\\*${space}+as${space}+(${name})`
const defaultAndDestructedImport = `(${defaultImport})${space}*,${space}s*(${destructedImport})`
const allTypes = `((${defaultImport})|(${destructedImport})|(${namespaceImport})|(${defaultAndDestructedImport}))`
const path = `['"]([^'"]+)['"]`

export const imports = new RegExp(`^import(${space}+${allTypes}${space}+from)?${space}+${path};?${space}*$`, 'gm')
