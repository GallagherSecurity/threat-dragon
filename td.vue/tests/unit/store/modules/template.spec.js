import {
    TEMPLATE_FETCH_ALL,
    TEMPLATE_CLEAR,
    TEMPLATE_CREATE,
    TEMPLATE_UPDATE,
    TEMPLATE_DELETE,
    TEMPLATE_FETCH_MODEL_BY_ID,
    TEMPLATE_SET_TEMPLATES,
    TEMPLATE_SET_CONTENT_STORE_STATUS,
    TEMPLATE_BOOTSTRAP,
} from '@/store/actions/template.js';

import templateModule from '@/store/modules/template.js';
import templateApi from '@/service/api/templateApi.js';
import { getProviderType } from '@/service/provider/providers';
import { providerTypes } from '@/service/provider/providerTypes';

jest.mock('@/service/api/templateApi.js');
jest.mock('@/service/provider/providers');

describe('store/modules/template.js', () => {
    const getRootState = () => ({
        provider: {
            selected: 'github',
        },
    });

    const mocks = {
        commit: () => {},
        dispatch: () => {},
        rootState: getRootState(),
        state: {},
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(mocks, 'commit');
        jest.spyOn(mocks, 'dispatch');
        mocks.rootState = getRootState();
        getProviderType.mockReturnValue(providerTypes.git);
    });

    describe('state', () => {
        it('defines a templates array', () => {
            expect(templateModule.state.templates).toBeInstanceOf(Array);
        });

        it('defines a contentStore object', () => {
            expect(templateModule.state.contentStore).toBeInstanceOf(Object);
        });

        it('sets initial contentStore status to null', () => {
            expect(templateModule.state.contentStore.status).toBeNull();
        });
        it('sets initial canWrite to false', () => {
            expect(templateModule.state.contentStore.canWrite).toBe(false);
        });
    });

    describe('actions', () => {
        describe('clear', () => {
            it('commits the clear mutation', () => {
                templateModule.actions[TEMPLATE_CLEAR](mocks);
                expect(mocks.commit).toHaveBeenCalledWith(TEMPLATE_CLEAR);
            });
        });

        describe('bootstrap', () => {
            beforeEach(async () => {
                jest.spyOn(templateApi, 'bootstrapAsync').mockResolvedValue();
                await templateModule.actions[TEMPLATE_BOOTSTRAP](mocks);
            });

            it('calls bootstrapAsync', () => {
                expect(templateApi.bootstrapAsync).toHaveBeenCalledTimes(1);
            });

            it('dispatches TEMPLATE_FETCH_ALL after bootstrap', () => {
                expect(mocks.dispatch).toHaveBeenCalledWith(TEMPLATE_FETCH_ALL);
            });
        });

        describe('create with template', () => {
            const template = {
                templateMetadata: { name: 'My Template' },
                model: { title: 'My model' },
            };

            beforeEach(async () => {
                jest.spyOn(
                    templateApi,
                    'importTemplateAsync'
                ).mockResolvedValue();
                await templateModule.actions[TEMPLATE_CREATE](mocks, {
                    template,
                });
            });

            it('calls importTemplateAsync with the template', () => {
                expect(templateApi.importTemplateAsync).toHaveBeenCalledWith(
                    template
                );
            });

            it('dispatches TEMPLATE_FETCH_ALL after creation', () => {
                expect(mocks.dispatch).toHaveBeenCalledWith(TEMPLATE_FETCH_ALL);
            });
        });

        describe('update with template metadata', () => {
            const templateMetadata = {
                id: 'foo',
                name: 'Foo Template',
                description: 'A foo template',
                tags: ['foo'],
                modelRef: 'bar',
            };

            beforeEach(async () => {
                jest.spyOn(
                    templateApi,
                    'updateTemplateAsync'
                ).mockResolvedValue();
                await templateModule.actions[TEMPLATE_UPDATE](
                    mocks,
                    templateMetadata
                );
            });

            it('calls updateTemplateAsync api with the template metadata', () => {
                expect(templateApi.updateTemplateAsync).toHaveBeenCalledWith(
                    templateMetadata
                );
            });

            it('dispatches TEMPLATE_FETCH_ALL after update', () => {
                expect(mocks.dispatch).toHaveBeenCalledWith(TEMPLATE_FETCH_ALL);
            });
        });

        describe('delete with template id', () => {
            const templateId = '123';

            beforeEach(async () => {
                jest.spyOn(
                    templateApi,
                    'deleteTemplateAsync'
                ).mockResolvedValue();
                await templateModule.actions[TEMPLATE_DELETE](
                    mocks,
                    templateId
                );
            });

            it('calls deleteTemplateAsync api with the template id', () => {
                expect(templateApi.deleteTemplateAsync).toHaveBeenCalledWith(
                    templateId
                );
            });

            it('dispatches TEMPLATE_FETCH_ALL after deletion', () => {
                expect(mocks.dispatch).toHaveBeenCalledWith(TEMPLATE_FETCH_ALL);
            });
        });

        describe('fetch all templates', () => {
            describe('desktop provider', () => {
                beforeEach(() => {
                    getProviderType.mockReturnValue(providerTypes.desktop);
                    window.electronAPI = { getTemplates: jest.fn() };
                    templateModule.actions[TEMPLATE_FETCH_ALL](mocks);
                });

                it('fires the IPC get templates request', () => {
                    expect(
                        window.electronAPI.getTemplates
                    ).toHaveBeenCalledTimes(1);
                });

                it('does not call the fetchAllAsync api', () => {
                    expect(templateApi.fetchAllAsync).not.toHaveBeenCalled();
                });
            });

            describe('git provider', () => {
                describe('when templates are available', () => {
                    const templates = [
                        {
                            templateMetadata: {
                                id: 'foo',
                                name: 'Foo Template',
                                description: 'A foo template',
                                tags: ['foo'],
                                modelRef: 'bar',
                            },
                            model: { title: 'Foo Model' },
                        },
                    ];

                    beforeEach(async () => {
                        jest.spyOn(
                            templateApi,
                            'fetchAllAsync'
                        ).mockResolvedValue({
                            data: { templates, canWrite: true, status: null },
                        });
                        await templateModule.actions[TEMPLATE_FETCH_ALL](mocks);
                    });

                    it('commits set templates with the returned templates', () => {
                        expect(mocks.commit).toHaveBeenCalledWith(
                            TEMPLATE_SET_TEMPLATES,
                            templates
                        );
                    });

                    it('commits content store status as null with canWrite true', () => {
                        expect(mocks.commit).toHaveBeenCalledWith(
                            TEMPLATE_SET_CONTENT_STORE_STATUS,
                            {
                                status: null,
                                canWrite: true,
                            }
                        );
                    });
                });

                describe('when status is NOT_CONFIGURED', () => {
                    const templates = [];

                    beforeEach(async () => {
                        jest.spyOn(
                            templateApi,
                            'fetchAllAsync'
                        ).mockResolvedValue({
                            data: { status: 'NOT_CONFIGURED', canWrite: false },
                        });
                        await templateModule.actions[TEMPLATE_FETCH_ALL](mocks);
                    });

                    it('commits set templates with an empty array', () => {
                        expect(mocks.commit).toHaveBeenCalledWith(
                            TEMPLATE_SET_TEMPLATES,
                            templates
                        );
                    });
                    it('commits content store status as NOT_CONFIGURED with canWrite false', () => {
                        expect(mocks.commit).toHaveBeenCalledWith(
                            TEMPLATE_SET_CONTENT_STORE_STATUS,
                            {
                                status: 'NOT_CONFIGURED',
                                canWrite: false,
                            }
                        );
                    });
                });

                describe('when status is NOT_INITIALIZED', () => {
                    const templates = [];

                    beforeEach(async () => {
                        jest.spyOn(
                            templateApi,
                            'fetchAllAsync'
                        ).mockResolvedValue({
                            data: {
                                status: 'NOT_INITIALIZED',
                                canWrite: false,
                            },
                        });
                        await templateModule.actions[TEMPLATE_FETCH_ALL](mocks);
                    });

                    it('commits set templates with an empty array', () => {
                        expect(mocks.commit).toHaveBeenCalledWith(
                            TEMPLATE_SET_TEMPLATES,
                            templates
                        );
                    });
                    it('commits content store status as NOT_INITIALIZED with canWrite false', () => {
                        expect(mocks.commit).toHaveBeenCalledWith(
                            TEMPLATE_SET_CONTENT_STORE_STATUS,
                            {
                                status: 'NOT_INITIALIZED',
                                canWrite: false,
                            }
                        );
                    });
                });

                describe('when repository is not found (404)', () => {
                    beforeEach(async () => {
                        const error = new Error('Not Found');
                        error.response = { status: 404 };
                        jest.spyOn(
                            templateApi,
                            'fetchAllAsync'
                        ).mockRejectedValue(error);
                        await templateModule.actions[TEMPLATE_FETCH_ALL](mocks);
                    });

                    it('commits content store status as NOT_FOUND', () => {
                        expect(mocks.commit).toHaveBeenCalledWith(
                            TEMPLATE_SET_CONTENT_STORE_STATUS,
                            {
                                status: 'NOT_FOUND',
                            }
                        );
                    });

                    it('commits set templates with an empty array', () => {
                        expect(mocks.commit).toHaveBeenCalledWith(
                            TEMPLATE_SET_TEMPLATES,
                            []
                        );
                    });
                });
            });
        });
        describe('fetch model by id', () => {
            const templateId = 'template-abc';

            describe('desktop provider', () => {
                beforeEach(() => {
                    getProviderType.mockReturnValue(providerTypes.desktop);
                    window.electronAPI = { fetchModelById: jest.fn() };
                    templateModule.actions[TEMPLATE_FETCH_MODEL_BY_ID](
                        mocks,
                        templateId
                    );
                });

                it('fires the IPC fetch model by id request', () => {
                    expect(
                        window.electronAPI.fetchModelById
                    ).toHaveBeenCalledWith(templateId);
                });

                it('does not call the REST api', () => {
                    expect(
                        templateApi.fetchModelByIdAsync
                    ).not.toHaveBeenCalled();
                });
            });

            describe('git provider', () => {
                const modelData = { title: 'foobar' };
                const templateId = '123';

                beforeEach(async () => {
                    jest.spyOn(
                        templateApi,
                        'fetchModelByIdAsync'
                    ).mockResolvedValue({ data: modelData });
                });

                it('calls fetchModelByIdAsync with the id', async () => {
                    await templateModule.actions[TEMPLATE_FETCH_MODEL_BY_ID](
                        mocks,
                        templateId
                    );
                    expect(
                        templateApi.fetchModelByIdAsync
                    ).toHaveBeenCalledWith(templateId);
                });

                it('returns the model data', async () => {
                    const result = await templateModule.actions[
                        TEMPLATE_FETCH_MODEL_BY_ID
                    ](mocks, templateId);
                    expect(result).toEqual(modelData);
                });
            });
        });
    });
});
