import { providerTypes } from './providerTypes.js';

const providerType = providerTypes.git;

const getDashboardActions = () => ([
    {
        to: `/${providerType}/gitlab/repository`,
        key: 'openExisting',
        icon: 'gitlab',
        iconPreface: 'fab'
    },
    {
        to: `/${providerType}/gitlab/repository?action=create`,
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
