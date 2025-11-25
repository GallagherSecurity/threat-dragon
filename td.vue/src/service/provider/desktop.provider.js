import { providerTypes } from './providerTypes.js';

const providerType = providerTypes.desktop;

const getDashboardActions = () => ([
    {
        to: `/${providerType}/threatmodel/import`,
        key: 'openExisting',
        icon: 'file-import'
    },
    {
        to: `/${providerType}/threatmodel/new`,
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
