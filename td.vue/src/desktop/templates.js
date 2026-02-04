'use strict';

import { app, dialog } from 'electron';
import path from 'path';
import logger from './logger.js';

const fs = require('fs');

// provided by electron server bootstrap
var mainWindow;

// Constants
const CONFIG_FILE = 'templates-path.txt';
const TEMPLATES_FOLDER = 'templates';
const TEMPLATE_INDEX = 'template_info.json';

// get path to config file
function getConfigPath() {
    return path.join(app.getPath('userData'), CONFIG_FILE);
}

// get templates folder path from config file
async function getTemplatesPath() {
    try {
        const data = await fs.promises.readFile(getConfigPath(), 'utf-8');
        return data.trim();
    } catch {
        return null;
    }
}

// check if folder has write access
async function hasWriteAccess(folderPath) {
    try {
        await fs.promises.access(folderPath, fs.constants.W_OK);
        return true;
    } catch {
        return false;
    }
}

// check if folder exists
async function folderExists(folderPath) {
    try {
        const stats = await fs.promises.stat(folderPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}



// get full path to templates subfolder
function getTemplatesSubfolder(basePath) {
    return path.join(basePath, TEMPLATES_FOLDER);
}

// get full path to template index file
function getIndexPath(basePath) {
    return path.join(basePath, TEMPLATES_FOLDER, TEMPLATE_INDEX);
}

// check if template index file exists in templates subfolder
async function hasTemplateIndex(basePath) {
    try {
        const indexPath = getIndexPath(basePath);
        const stats = await fs.promises.stat(indexPath);
        return stats.isFile();
    } catch {
        return false;
    }
}

// Read template metadata from index file, returns null if not initialized
async function listTemplates(basePath) {
    if (!await hasTemplateIndex(basePath)) {
        return null;
    }

    try {
        const indexFilePath = getIndexPath(basePath);
        const data = await fs.promises.readFile(indexFilePath, 'utf-8');
        const parsed = JSON.parse(data);
        // Handle both array and {templates: [...]} formats
        return parsed.templates || [];
    } catch (err) {
        logger.log.warn('Error reading template index: ' + err);
        return [];
    }
}

// Bootstrap: create templates folder and empty index file
async function bootstrapTemplates(basePath) {
    const templatesFolder = getTemplatesSubfolder(basePath);
    const indexPath = getIndexPath(basePath);

    // Create templates subfolder if it doesn't exist
    await fs.promises.mkdir(templatesFolder, { recursive: true });

    // Create empty index file
    await fs.promises.writeFile(indexPath, '{"templates":[]}', 'utf-8');

    logger.log.debug('Bootstrapped templates folder at: ' + templatesFolder);
} 


// open folder picker and save selected path
async function setTemplateFolder() {
    logger.log.debug('Request to select template folder');

    try {
        const result = await dialog.showOpenDialog(mainWindow,{
            title: 'Select Templates Folder',  // TODO: add to i18n
            properties: ['openDirectory'],
            defaultPath: app.getPath('userData')
        });

        if (result.canceled) {
            logger.log.debug('Select template folder: canceled');
            return;
        }

        // Save the selected path
        const selectedPath = result.filePaths[0];
        const canWrite = await hasWriteAccess(selectedPath);
        await fs.promises.writeFile(getConfigPath(), selectedPath, 'utf-8');

        // Auto-bootstrap if templates/template_info.json doesn't exist
        if (!await hasTemplateIndex(selectedPath) && canWrite) {
            await bootstrapTemplates(selectedPath);
        }

        await getTemplates();
        logger.log.debug('Template folder set to: ' + selectedPath);

    } catch (err) {
        logger.log.warn('Error selecting template folder: ' + err);
        mainWindow.webContents.send('templates-result', {
            status: 'ERROR',
            error: err.message
        });
    }
}

// pipeline function to get templates and send state to renderer
async function getTemplates() {
    // check if there is a templates path configured
    const templatePath = await getTemplatesPath();
    if (!templatePath) {
        mainWindow.webContents.send('templates-result', {
            status: 'NOT_CONFIGURED',
            templates: []
        });
        return;
    }

    // check if that folder exists
    const exists = await folderExists(templatePath);
    if (!exists) {
        mainWindow.webContents.send('templates-result', {
            status: 'FOLDER_NOT_FOUND',
            templates: []
        });
        return;
    }

    // check if folder has write access
    const canWrite = await hasWriteAccess(templatePath);

    // Read template metadata from index file
    const templates = await listTemplates(templatePath);
     if (templates === null) {
        mainWindow.webContents.send('templates-result', {
            status: 'NOT_INITIALIZED',
            canWrite: canWrite,
            templates: []
        });
        return;
    }

    
    mainWindow.webContents.send('templates-result', {
        status: canWrite ? 'READ_WRITE' : 'READ_ONLY',
        templates: templates
    });
}

export const setMainWindow = (window) => {
    mainWindow = window;
};

export default {
    setMainWindow,
    setTemplateFolder,
    getTemplates
};
