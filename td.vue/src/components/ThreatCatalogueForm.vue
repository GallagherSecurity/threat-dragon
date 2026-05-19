<template>
    <div>
        <b-modal
            v-if="!!threat"
            id="threat-catalogue-form"
            size="lg"
            ok-variant="primary"
            header-bg-variant="primary"
            header-text-variant="light"
            :title="isEditing ? $t('threats.catalogue.editThreat') : $t('threats.catalogue.newThreat')"
            ref="formModal"
        >
            <b-form>
                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="title-group"
                            :label="$t('threats.properties.title')"
                            label-for="title"
                        >
                            <b-form-input
                                id="title"
                                v-model="threat.title"
                                type="text"
                                required
                            ></b-form-input>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="model-type-group"
                            :label="$t('threats.catalogue.framework')"
                            label-for="model-type"
                        >
                            <select
                                id="model-type"
                                v-model="threat.modelType"
                                class="form-control custom-select"
                                @change="threat.type = ''"
                            >
                                <option v-for="opt in modelTypeOptions" :key="opt.value" :value="opt.value">{{ opt.text }}</option>
                            </select>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="threat-type-group"
                            :label="$t('threats.properties.type')"
                            label-for="threat-type"
                        >
                            <select
                                id="threat-type"
                                v-model="threat.type"
                                class="form-control custom-select"
                                :disabled="!threat.modelType"
                            >
                                <option v-for="opt in threatTypes" :key="opt.value" :value="opt.value">{{ opt.text }}</option>
                            </select>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col md="6">
                        <b-form-group
                            id="score-group"
                            :label="$t('threats.properties.score')"
                            label-for="score"
                        >
                            <b-form-input
                                id="score"
                                v-model="threat.score"
                                type="text"
                            ></b-form-input>
                        </b-form-group>
                    </b-col>
                    <b-col md="6">
                        <b-form-group
                            id="severity-group"
                            :label="$t('threats.properties.severity')"
                            label-for="severity"
                        >
                            <select
                                id="severity"
                                v-model="threat.severity"
                                class="form-control custom-select"
                            >
                                <option v-for="opt in severityOptions" :key="opt.value" :value="opt.value">{{ opt.text }}</option>
                            </select>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="description-group"
                            :label="$t('threats.properties.description')"
                            label-for="description"
                        >
                            <b-form-textarea
                                id="description"
                                v-model="threat.description"
                                rows="5"
                            ></b-form-textarea>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="mitigation-group"
                            :label="$t('threats.properties.mitigation')"
                            label-for="mitigation"
                        >
                            <b-form-textarea
                                id="mitigation"
                                v-model="threat.mitigation"
                                rows="5"
                            ></b-form-textarea>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="tags-group"
                            :label="$t('threats.catalogue.tags')"
                            label-for="tags"
                        >
                            <td-form-tags
                                id="tags"
                                v-model="threat.tags"
                                variant="primary"
                                separator=",;"
                                :placeholder="$t('threats.catalogue.tagsPlaceholder')"
                            ></td-form-tags>
                        </b-form-group>
                    </b-col>
                </b-form-row>
            </b-form>

            <template #modal-footer>
                <div class="w-100">
                    <b-button
                        v-if="isEditing"
                        variant="danger"
                        class="float-left"
                        @click="confirmDelete()"
                    >
                        {{ $t('forms.delete') }}
                    </b-button>
                    <b-button
                        variant="primary"
                        class="float-right"
                        :disabled="!threat.title || !threat.modelType || !threat.type"
                        @click="onSave()"
                    >
                        {{ $t('forms.apply') }}
                    </b-button>
                    <b-button
                        variant="secondary"
                        class="float-right mr-2"
                        @click="hideModal()"
                    >
                        {{ $t('forms.cancel') }}
                    </b-button>
                </div>
            </template>
        </b-modal>
    </div>
</template>

<script>
import { v4 as uuidv4 } from 'uuid';
import tcActions from '@/store/actions/threatCatalogue.js';
import threatModels from '@/service/threats/models/index.js';
import TdFormTags from '@/components/FormTags.vue';
import cia from '@/service/threats/models/cia.js';
import ciaDie from '@/service/threats/models/ciadie.js';
import linddun from '@/service/threats/models/linddun.js';
import plot4ai from '@/service/threats/models/plot4ai.js';
import stride from '@/service/threats/models/stride.js';
import { getSeverityOptions } from '@/service/threats/index.js';

const MODEL_ALL_TYPES = {
    CIA: cia,
    CIADIE: ciaDie,
    LINDDUN: linddun.all,
    PLOT4ai: plot4ai.all,
    STRIDE: stride.all
};

export default {
    name: 'TdThreatCatalogueForm',
    components: { TdFormTags },
    data() {
        return {
            threat: {},
            isEditing: false,
            modelTypeOptions: [
                { value: '', text: '-- Select framework --' },
                ...threatModels.allModels
                    .filter(m => m !== 'EOP')
                    .map(m => ({ value: m, text: m }))
            ]
        };
    },
    computed: {
        threatTypes() {
            const model = MODEL_ALL_TYPES[this.threat.modelType];
            if (!model) return [{ value: '', text: '-- Select type --' }];
            return [
                { value: '', text: '-- Select type --' },
                ...Object.values(model).map(key => ({ value: this.$t(key), text: this.$t(key) }))
            ];
        },
        severityOptions() {
            return getSeverityOptions(this.$t.bind(this));
        }
    },
    methods: {
        showModal(existingThreat) {
            if (existingThreat) {
                this.isEditing = true;
                this.threat = {
                    id: existingThreat.id,
                    title: existingThreat.title,
                    modelType: existingThreat.modelType,
                    type: existingThreat.type,
                    description: existingThreat.description || '',
                    mitigation: existingThreat.mitigation || '',
                    score: existingThreat.score || '',
                    severity: existingThreat.severity || 'TBD',
                    tags: [...(existingThreat.tags || [])]
                };
            } else {
                this.isEditing = false;
                this.threat = {
                    id: uuidv4(),
                    title: '',
                    modelType: '',
                    type: '',
                    description: '',
                    mitigation: '',
                    score: '',
                    severity: 'TBD',
                    tags: []
                };
            }
            this.$refs.formModal.show();
        },
        hideModal() {
            this.$refs.formModal.hide();
        },
        async onSave() {
            try {
                if (this.isEditing) {
                    await this.$store.dispatch(tcActions.update, { ...this.threat });
                    this.$toast.success(this.$t('threats.catalogue.prompts.updateSuccess'));
                } else {
                    await this.$store.dispatch(tcActions.create, { ...this.threat });
                    this.$toast.success(this.$t('threats.catalogue.prompts.createSuccess'));
                }
                this.hideModal();
            } catch (error) {
                console.error('Failed to save catalogue threat:', error);
                this.$toast.error(this.$t(this.isEditing ? 'threats.catalogue.errors.updateFailed' : 'threats.catalogue.errors.createFailed'));
            }
        },
        async confirmDelete() {
            const confirmed = await this.$bvModal.msgBoxConfirm(
                `Delete "${this.threat.title}"? This cannot be undone.`,
                {
                    title: this.$t('threats.catalogue.deleteTitle'),
                    okTitle: this.$t('forms.delete'),
                    cancelTitle: this.$t('forms.cancel'),
                    okVariant: 'danger',
                }
            );
            if (confirmed) {
                try {
                    await this.$store.dispatch(tcActions.delete, this.threat.id);
                    this.$toast.success(this.$t('threats.catalogue.prompts.deleteSuccess'));
                    this.hideModal();
                } catch (error) {
                    console.error('Failed to delete catalogue threat:', error);
                    this.$toast.error(this.$t('threats.catalogue.errors.deleteFailed'));
                }
            }
        }
    }
};
</script>
