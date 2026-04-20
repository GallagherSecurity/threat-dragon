<template>
    <div>
        <b-modal
            v-if="!!threat"
            id="threat-catalogue-form"
            size="lg"
            ok-variant="primary"
            header-bg-variant="primary"
            header-text-variant="light"
            :title="isEditing ? 'Edit Threat' : 'New Threat'"
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
                            label="Framework"
                            label-for="model-type"
                        >
                            <b-form-select
                                id="model-type"
                                v-model="threat.modelType"
                                :options="modelTypeOptions"
                                @change="threat.type = ''"
                            ></b-form-select>
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
                            <b-form-select
                                id="threat-type"
                                v-model="threat.type"
                                :options="threatTypes"
                                :disabled="!threat.modelType"
                            ></b-form-select>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col md="10">
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
                            label="Tags"
                            label-for="tags"
                        >
                            <b-form-tags
                                id="tags"
                                v-model="threat.tags"
                                separator=",;"
                                placeholder="Add tags..."
                            ></b-form-tags>
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
import cia from '@/service/threats/models/cia.js';
import ciaDie from '@/service/threats/models/ciadie.js';
import linddun from '@/service/threats/models/linddun.js';
import plot4ai from '@/service/threats/models/plot4ai.js';
import stride from '@/service/threats/models/stride.js';

const MODEL_ALL_TYPES = {
    CIA: cia,
    CIADIE: ciaDie,
    LINDDUN: linddun.all,
    PLOT4ai: plot4ai.all,
    STRIDE: stride.all
};

export default {
    name: 'TdThreatCatalogueForm',
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
        }
    },
    methods: {
        showModal(existingThreat) {
            if (existingThreat) {
                this.isEditing = true;
                this.threat = {
                    id: existingThreat.id,
                    threatRef: existingThreat.threatRef,
                    title: existingThreat.title,
                    modelType: existingThreat.modelType,
                    type: existingThreat.type,
                    description: existingThreat.description || '',
                    mitigation: existingThreat.mitigation || '',
                    score: existingThreat.score || '',
                    tags: [...(existingThreat.tags || [])]
                };
            } else {
                this.isEditing = false;
                this.threat = {
                    id: uuidv4(),
                    threatRef: uuidv4(),
                    title: '',
                    modelType: '',
                    type: '',
                    description: '',
                    mitigation: '',
                    score: '',
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
                } else {
                    await this.$store.dispatch(tcActions.create, { ...this.threat });
                }
                this.hideModal();
            } catch (error) {
                console.error('Failed to save catalogue threat:', error);
            }
        },
        async confirmDelete() {
            const confirmed = await this.$bvModal.msgBoxConfirm(
                `Delete "${this.threat.title}"? This cannot be undone.`,
                {
                    title: 'Delete Threat',
                    okTitle: this.$t('forms.delete'),
                    cancelTitle: this.$t('forms.cancel'),
                    okVariant: 'danger',
                }
            );
            if (confirmed) {
                await this.$store.dispatch(tcActions.delete, this.threat.id);
                this.hideModal();
            }
        }
    }
};
</script>
