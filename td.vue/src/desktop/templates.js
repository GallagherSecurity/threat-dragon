'use strict';

import { app, dialog } from 'electron';
import path from 'path';
import logger from './logger.js';

const fs = require('fs');

// provided by electron server bootstrap
var mainWindow;

// Constants
const CONFIG_FILE = 'templates-path.txt';
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

// check if template index file exists in folder (avoid overwrites)
async function hasTemplateIndex(folderPath) {
    try {
        const indexPath = path.join(folderPath, TEMPLATE_INDEX);
        const stats = await fs.promises.stat(indexPath);
        return stats.isFile();
    } catch {
        return false;
    }
}

// open folder picker and save selected path
async function setTemplateFolder() {
    logger.log.debug('Request to select template folder');

    try {
        const result = await dialog.showOpenDialog({
            title: 'Select Templates Folder',  // TODO: add to i18n
            properties: ['openDirectory'],
            defaultPath: app.getPath('documents')
        });

        if (result.canceled) {
            logger.log.debug('Select template folder: canceled');
            return;
        }

        // Save the selected path then get templates
        const selectedPath = result.filePaths[0];
        await fs.promises.writeFile(getConfigPath(), selectedPath, 'utf-8');
        await getTemplates();
        logger.log.debug('Template folder set to: ' + result.filePaths[0]);

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
            status: 'NOT_CONFIGURED'
        });
        return;
    }

    // check if that folder exists
    const exists = await folderExists(templatePath);
    if (!exists) {
        mainWindow.webContents.send('templates-result', {
            status: 'FOLDER_NOT_FOUND',
            path: templatePath
        });
        return;
    }

    // check if folder has write access
    const canWrite = await hasWriteAccess(templatePath);

    // check if template index file exists in folder (avoid overwrites)
    const hasIndex = await hasTemplateIndex(templatePath);

    // List templates (TODO: implement later)
    const templates = [];

    mainWindow.webContents.send('templates-result', {
        status: canWrite ? 'READ_WRITE' : 'READ_ONLY',
        path: templatePath,
        hasIndex: hasIndex,
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
