<template>
    <div>
        <b-row>
            <b-col>
                <b-jumbotron class="text-center">
                    <h4>
                        {{ $t('forms.open') }} / {{ $t('dashboard.actions.template') }}
                    </h4>
                </b-jumbotron>
            </b-col>
        </b-row>
        <b-row>
            <b-col md=8 offset=2>
                <b-form>
                    <!-- Template File Upload -->
                    <b-form-row>
                        <b-col @drop.prevent="onDropFile" @dragenter.prevent @dragover.prevent>
                            <b-form-group
                                id="template-input-group"
                                label-for="template-input">
                                <b-form-textarea
                                    id="template-input"
                                    v-model="templateJson"
                                    :placeholder="templatePrompt"
                                    rows="10"
                                ></b-form-textarea>
                            </b-form-group>
                        </b-col>
                    </b-form-row>

                    <!-- Model Details Form -->
                    <b-form-row v-if="showModelForm">
                        <b-col md=6>
                            <b-form-group
                                id="title-group"
                                label-for="title-input"
                                :label="$t('threatmodel.title')">
                                <b-form-input
                                    id="title-input"
                                    v-model="modelInfo.title"
                                    :placeholder="$t('threatmodel.title')"
                                ></b-form-input>
                            </b-form-group>
                        </b-col>
                        <b-col md=6>
                            <b-form-group
                                id="owner-group"
                                label-for="owner-input"
                                :label="$t('threatmodel.owner')">
                                <b-form-input
                                    id="owner-input"
                                    v-model="modelInfo.owner"
                                    :placeholder="$t('threatmodel.owner')"
                                ></b-form-input>
                            </b-form-group>
                        </b-col>
                    </b-form-row>

                    <b-form-row v-if="showModelForm">
                        <b-col md=6>
                            <b-form-group
                                id="reviewer-group"
                                label-for="reviewer-input"
                                :label="$t('threatmodel.reviewer')">
                                <b-form-input
                                    id="reviewer-input"
                                    v-model="modelInfo.reviewer"
                                    :placeholder="$t('threatmodel.reviewer')"
                                ></b-form-input>
                            </b-form-group>
                        </b-col>
                    </b-form-row>
                </b-form>
            </b-col>
        </b-row>

        <!-- Template Info Display -->
        <b-row v-if="showModelForm" class="mt-3">
            <b-col md=8 offset=2>
                <b-alert show variant="info" class="text-left">
                    <strong>{{ $t('dashboard.actions.template') }}:</strong> {{ templateMetadata.name }}<br>
                    <small v-if="templateMetadata.description">{{ templateMetadata.description }}</small>
                    <small v-if="templateMetadata.author"> by {{ templateMetadata.author }}</small>
                </b-alert>
            </b-col>
        </b-row>

        <!-- Action Buttons -->
        <b-row class="mt-3">
            <b-col md=4 offset=2 class="text-left">
                <b-btn-group>
                    <td-form-button
                        id="td-open-template-btn"
                        :onBtnClick="onOpenClick"
                        icon="folder-open"
                        :text="$t('forms.open')" />
                </b-btn-group>
            </b-col>
            <b-col md=4 class="text-right">
                <b-btn-group>
                    <td-form-button
                        id="td-create-from-template-btn"
                        :isPrimary="true"
                        :isDisabled="!showModelForm"
                        :onBtnClick="onCreateClick"
                        icon="file-import"
                        :text="$t('forms.import')" />
                </b-btn-group>
            </b-col>
        </b-row>
    </div>
</template>

<script>
import { mapState } from 'vuex';

import isElectron from 'is-electron';
import { getProviderType } from '@/service/provider/providers.js';
import TdFormButton from '@/components/FormButton.vue';
import tmActions from '@/store/actions/threatmodel.js';
import schema from '@/service/schema/ajv';

// only search for JSON files
const pickerFileOptions = {
    types: [
        {
            description: 'Threat model templates',
            accept: {
                'application/json': ['.json']
            }
        }
    ],
    multiple: false
};

export default {
    name: 'TemplateSelect',
    components: {
        TdFormButton
    },
    computed: {
        ...mapState({
            providerType: (state) => getProviderType(state.provider.selected)
        }),
        templatePrompt() {
            return '{ ' + this.$t('threatmodel.dragAndDrop') + this.$t('threatmodel.jsonPaste') + ' ... }';
        }
    },
    data() {
        return {
            templateJson: '',
            showModelForm: false,
            templateMetadata: {
                name: '',
                description: '',
                author: '',
                version: ''
            },
            modelInfo: {
                title: 'New Threat Model',
                owner: '',
                reviewer: ''
            },
            parsedTemplate: null
        };
    },
    methods: {
        onDropFile(event) {
            if (event.dataTransfer.files.length === 1) {
                let file = event.dataTransfer.files[0];
                if (file.name.endsWith('.json')) {
                    file.text()
                        .then(text => {
                            this.templateJson = text;
                            this.parseAndValidateTemplate();
                        })
                        .catch(e => this.$toast.error(e));
                } else {
                    this.$toast.error(this.$t('threatmodel.errors.onlyJsonAllowed'));
                }
            } else {
                this.$toast.error(this.$t('threatmodel.errors.dropSingleFileOnly'));
            }
        },
        async onOpenClick() {
            if ('showOpenFilePicker' in window) {
                try {
                    const [handle] = await window.showOpenFilePicker(pickerFileOptions);
                    let file = await handle.getFile();
                    if (file.name.endsWith('.json')) {
                        this.templateJson = await file.text();
                        this.parseAndValidateTemplate();
                    } else {
                        this.$toast.error(this.$t('threatmodel.errors.onlyJsonAllowed'));
                    }
                } catch (e) {
                    this.$toast.warning(this.$t('threatmodel.errors.open'));
                    console.warn(e);
                }
            } else {
                this.$toast.error('File picker is not yet supported on this browser: use Paste or Drag and Drop');
            }
        },
        parseAndValidateTemplate() {
            let jsonTemplate;

            // Check for JSON syntax errors
            try {
                jsonTemplate = JSON.parse(this.templateJson);
            } catch (e) {
                this.$toast.error(this.$t('threatmodel.errors.invalidJson'));
                console.error(e);
                return;
            }

            // Validate it's a valid template (has templateMetadata)
            if (!jsonTemplate.templateMetadata) {
                this.$toast.error('Invalid template: missing templateMetadata');
                console.error('Template validation failed: no templateMetadata');
                return;
            }

            // Validate it's a valid threat model structure (v2 schema)
            if (!schema.isV2(jsonTemplate)) {
                this.$toast.error(this.$t('threatmodel.errors.invalidModel'));
                console.error('Template does not match v2 schema');
                return;
            }

            // Store the parsed template and show form
            this.parsedTemplate = jsonTemplate;
            this.templateMetadata = jsonTemplate.templateMetadata;
            this.modelInfo.title = this.templateMetadata.name || 'New Threat Model';
            this.showModelForm = true;
        },
        async onCreateClick() {
            if (!this.modelInfo.title) {
                this.$toast.error('Model title is required');
                return;
            }

            if (!this.parsedTemplate) {
                this.$toast.error('No template loaded');
                return;
            }

            try {
                // Call the store action to load template and convert it to a model
                await this.$store.dispatch(tmActions.templateLoad, {
                    templateData: this.parsedTemplate,
                    modelInfo: this.modelInfo
                });

                if (isElectron()) {
                    window.electronAPI.modelOpened(this.modelInfo.title);
                }

                // Navigate to edit view
                const params = Object.assign({}, this.$route.params, {
                    threatmodel: this.modelInfo.title
                });
                this.$router.push({ name: `${this.providerType}ThreatModelEdit`, params });
            } catch (e) {
                this.$toast.error('Error creating model from template: ' + e.message);
                console.error(e);
            }
        }
    }
};
</script>
