# Desktop Template Storage Folder — Specification

## Overview

First implementation phase: Allow desktop users to configure a template storage folder. Store only the path in a plain text file. Check write access dynamically each time (not stored).

---

## Config Storage

**File:** `{app.getPath('userData')}/templates-path.txt`

**Contents:** Just the absolute path, nothing else
```
C:\Users\AjithP\Documents\ThreatDragonTemplates
```

**Why plain text:**
- Simplest possible format
- Human-readable and editable
- No parsing needed — just `fs.readFileSync().trim()`
- Write access checked on-the-fly (permissions can change between sessions)

---

## Folder Picker Dialog

**Default location:** `app.getPath('userData')`
- Windows: `C:\Users\{user}\AppData\Roaming\threat-dragon\`
- macOS: `~/Library/Application Support/threat-dragon/`
- Linux: `~/.config/threat-dragon/`

**Dialog options:**
```js
dialog.showOpenDialog({
    defaultPath: app.getPath('userData'),
    properties: ['openDirectory', 'createDirectory']
})
```

---

## Validation Checks (On Folder Selection)

Perform these checks using Node.js `fs` before accepting the folder:

### 1. Write Access Check
```js
const fs = require('fs');

function hasWriteAccess(folderPath) {
    try {
        fs.accessSync(folderPath, fs.constants.W_OK);
        return true;
    } catch {
        return false;
    }
}
```

### 2. Existing Content Check

| Scenario | Action |
|----------|--------|
| Empty folder | Accept — will create `template_info.json` on first import |
| Has `template_info.json` | Accept — existing templates preserved |
| Has `.json` files but NO `template_info.json` | Warning dialog: "Folder has JSON files but no template index" |
| Non-empty with non-JSON files | Allow — templates will coexist with other files |

### 3. Don't Corrupt Existing Data
- NEVER delete existing files
- NEVER overwrite existing `template_info.json`
- When creating index, only add files that match template schema

---

## Status Codes

| Status | Meaning | How Determined |
|--------|---------|----------------|
| `null` | Configured & working | Path file exists, folder exists, has write access |
| `NOT_CONFIGURED` | No folder configured | Path file doesn't exist or is empty |
| `FOLDER_NOT_FOUND` | Configured folder missing | Path file exists but folder doesn't |
| `READ_ONLY` | No write access | Folder exists but `fs.access(W_OK)` fails |

---

## ManageTemplates UI Behavior

### Normal Mode (`writeAccess: true`)
- All buttons enabled: Import, Delete, Edit metadata
- Full CRUD functionality

### Read-Only Mode (`writeAccess: false`)
- **Header banner:** "Read-only: You don't have write access to the templates folder. You can browse and use templates, but cannot import, edit, or delete."
- **Disabled buttons:** Import, Delete, Edit metadata (grayed out)
- **Enabled:** Browse, Search, Use template, Change folder

---

## New File: `td.vue/src/desktop/templateStorage.js`

Separate module for template storage operations (not in menu.js).

```js
/**
 * Template storage operations for desktop
 * Handles config persistence and folder validation
 */

const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = 'templates-path.txt';

/**
 * Gets the path to the config file
 */
function getConfigPath() {
    return path.join(app.getPath('userData'), CONFIG_FILE);
}

/**
 * Reads the configured templates folder path
 * @returns {string|null} The path or null if not configured
 */
function getTemplatesPath() {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
        return null;
    }
    const content = fs.readFileSync(configPath, 'utf-8').trim();
    return content || null;
}

/**
 * Saves the templates folder path to config
 * @param {string} folderPath
 */
function saveTemplatesPath(folderPath) {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, folderPath, 'utf-8');
}

/**
 * Checks if app has write access to a folder
 * @param {string} folderPath
 * @returns {boolean}
 */
function hasWriteAccess(folderPath) {
    try {
        fs.accessSync(folderPath, fs.constants.W_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if folder exists
 * @param {string} folderPath
 * @returns {boolean}
 */
function folderExists(folderPath) {
    try {
        return fs.statSync(folderPath).isDirectory();
    } catch {
        return false;
    }
}

/**
 * Checks if folder has template_info.json
 * @param {string} folderPath
 * @returns {boolean}
 */
function hasTemplateIndex(folderPath) {
    const indexPath = path.join(folderPath, 'template_info.json');
    return fs.existsSync(indexPath);
}

/**
 * Gets all JSON files in folder
 * @param {string} folderPath
 * @returns {string[]}
 */
function getJsonFiles(folderPath) {
    const files = fs.readdirSync(folderPath);
    return files.filter(f => f.endsWith('.json'));
}

/**
 * Gets current template storage config and status
 * @returns {Object} { path, status, writeAccess }
 */
function getConfig() {
    const templatesPath = getTemplatesPath();

    if (!templatesPath) {
        return { path: null, status: 'NOT_CONFIGURED', writeAccess: false };
    }

    if (!folderExists(templatesPath)) {
        return { path: templatesPath, status: 'FOLDER_NOT_FOUND', writeAccess: false };
    }

    const writeAccess = hasWriteAccess(templatesPath);
    if (!writeAccess) {
        return { path: templatesPath, status: 'READ_ONLY', writeAccess: false };
    }

    return { path: templatesPath, status: null, writeAccess: true };
}

/**
 * Opens folder picker and validates selection
 * @param {BrowserWindow} mainWindow
 * @returns {Promise<Object>} { success, path, writeAccess, warning }
 */
async function selectFolder(mainWindow) {
    const result = await dialog.showOpenDialog(mainWindow, {
        defaultPath: app.getPath('userData'),
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Templates Folder'
    });

    if (result.canceled || !result.filePaths.length) {
        return { success: false, canceled: true };
    }

    const folderPath = result.filePaths[0];
    const writeAccess = hasWriteAccess(folderPath);

    // Check for existing JSON files without index
    let warning = null;
    const jsonFiles = getJsonFiles(folderPath);
    if (jsonFiles.length > 0 && !hasTemplateIndex(folderPath)) {
        warning = `Folder contains ${jsonFiles.length} JSON file(s) but no template_info.json. These files will be ignored until an index is created.`;
    }

    // Save the path
    saveTemplatesPath(folderPath);

    return {
        success: true,
        path: folderPath,
        writeAccess,
        warning
    };
}

module.exports = {
    getConfig,
    getTemplatesPath,
    saveTemplatesPath,
    hasWriteAccess,
    folderExists,
    hasTemplateIndex,
    selectFolder
};
```

---

## IPC Registration (desktop.js)

```js
const templateStorage = require('./templateStorage');

ipcMain.handle('template-get-config', () => templateStorage.getConfig());
ipcMain.handle('template-set-folder', () => templateStorage.selectFolder(mainWindow));
```

---

## Preload Bridge (preload.js)

```js
templateGetConfig: () => ipcRenderer.invoke('template-get-config'),
templateSetFolder: () => ipcRenderer.invoke('template-set-folder'),
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Folder deleted after config saved | `getConfig()` returns `FOLDER_NOT_FOUND` |
| Write access revoked after config | `getConfig()` returns `READ_ONLY` |
| Network folder goes offline | Same as folder deleted |
| User cancels folder picker | Return `{ success: false, canceled: true }` |
| Path file corrupted/invalid | Treat as `NOT_CONFIGURED` |
| Folder has template_info.json | Use existing index, don't overwrite |

---

## Verification

1. **First run:** No `templates-path.txt` → status is `NOT_CONFIGURED`
2. **Select folder:** Picker defaults to app data, user selects folder
3. **Path saved:** `templates-path.txt` created with just the path
4. **Restart app:** Path persists, templates load
5. **No write access:** Status is `READ_ONLY`, ManageTemplates shows banner
6. **Delete folder:** Status becomes `FOLDER_NOT_FOUND`
7. **Existing JSON files:** Warning shown but folder accepted
