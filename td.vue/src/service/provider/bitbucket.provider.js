import { providerTypes } from './providerTypes.js';

const providerType = providerTypes.git;

const getDashboardActions = () => ([
    {
        to: `/${providerType}/bitbucket/repository`,
        key: 'openExisting',
        icon: 'bitbucket',
        iconPreface: 'fab'
    },
    {
        to: `/${providerType}/bitbucket/repository?action=create`,
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
