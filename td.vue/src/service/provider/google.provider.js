import { providerTypes } from './providerTypes.js';

const providerType = providerTypes.google;

const getDashboardActions = () => ([
    {
        to: `/${providerType}/google/folder`,
        key: 'openExisting',
        icon: 'google-drive',
        iconPreface: 'fab'
    },
    {
        to: `/${providerType}/google/folder?action=create`,
        key: 'createNew',
        icon: 'plus'
    },
    {
        to: '/demo/select',
        key: 'readDemo',
        icon: 'cloud-download-alt'
    },
    {
        to: `/${providerType}/template`,
        key: 'template',
        icon: 'file-template'
    }
]);

export default {
    getDashboardActions
};
