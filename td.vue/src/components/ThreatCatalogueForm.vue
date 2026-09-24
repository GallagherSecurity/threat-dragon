<template>
    <div>
        <td-mitigation-catalogue-selector
            ref="mitigationCatalogueSelector"
            @mitigationSelected="onMitigationRefAdded"
        />
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
                        <b-card header-tag="header">
                            <template #header>
                                <div class="clauses-header">
                                    <span>{{ $t('threats.properties.mitigation') }}</span>
                                    <button
                                        type="button"
                                        class="clauses-header-action"
                                        @click="openMitigationSelector()"
                                    >
                                        <font-awesome-icon icon="plus" class="clauses-header-icon"></font-awesome-icon>
                                        {{ $t('threats.mitigations.newFromCatalogue') }}
                                    </button>
                                </div>
                            </template>

                            <b-card-text v-if="mitigations.length">
                                <div
                                    v-for="m in mitigations"
                                    :key="m.id"
                                    class="mitigation-ref-row d-flex justify-content-between align-items-start"
                                >
                                    <div v-if="!m.missing">
                                        <strong>{{ m.title }}</strong>
                                        <div class="text-muted small">{{ m.description }}</div>
                                    </div>
                                    <div v-else class="text-danger">
                                        {{ $t('threats.mitigations.catalogue.missingReference') }}
                                    </div>
                                    <b-button
                                        variant="link"
                                        class="remove-clause-btn"
                                        @click="removeMitigationRef(m.id)"
                                    >
                                        <font-awesome-icon icon="times"></font-awesome-icon>
                                    </b-button>
                                </div>
                            </b-card-text>

                            <b-card-text v-else class="text-muted">
                                {{ $t('threats.mitigations.empty') }}
                            </b-card-text>
                        </b-card>
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

<style lang="scss" scoped>
.clauses-header {
    align-items: center;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    line-height: 1.5;
}

.clauses-header-action {
    align-items: center;
    background: transparent;
    border: 0;
    color: $orange;
    display: inline-flex;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: inherit;
    line-height: 1;
    margin: 0;
    padding: 0;
    white-space: nowrap;
}

.clauses-header-icon {
    margin-right: 0.25rem;
}

.clauses-header-action:hover,
.clauses-header-action:focus {
    color: darken($orange, 10%);
    text-decoration: underline;
}

.mitigation-ref-row {
    margin-bottom: 0.5rem;
}

.remove-clause-btn {
    color: $red;
    padding: 0;
}

.remove-clause-btn:hover {
    color: darken($red, 10%);
}
</style>

<script>
import { v4 as uuidv4 } from 'uuid';
import { mapGetters } from 'vuex';
import tcActions from '@/store/actions/threatCatalogue.js';
import mcActions from '@/store/actions/mitigationCatalogue.js';
import threatModels from '@/service/threats/models/index.js';
import TdFormTags from '@/components/FormTags.vue';
import TdMitigationCatalogueSelector from '@/components/MitigationCatalogueSelector.vue';
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
    components: { TdFormTags, TdMitigationCatalogueSelector },
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
        ...mapGetters(['mitigationCatalogue']),
        mitigations() {
            return (this.threat.mitigationRefs || []).map(id => {
                const entry = this.mitigationCatalogue.find(m => m.id === id);
                return entry
                    ? { id, title: entry.title, description: entry.briefDescription, missing: false }
                    : { id, missing: true };
            });
        },
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
        async showModal(existingThreat) {
            if (existingThreat) {
                this.isEditing = true;
                this.threat = {
                    id: existingThreat.id,
                    title: existingThreat.title,
                    modelType: existingThreat.modelType,
                    type: existingThreat.type,
                    description: existingThreat.description || '',
                    mitigationRefs: [...(existingThreat.mitigationRefs || [])],
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
                    mitigationRefs: [],
                    score: '',
                    severity: 'TBD',
                    tags: []
                };
            }
            await this.$store.dispatch(mcActions.fetchAll);
            this.$refs.formModal.show();
        },
        openMitigationSelector() {
            this.$refs.mitigationCatalogueSelector.open();
        },
        onMitigationRefAdded(catalogueMitigation) {
            if (!this.threat.mitigationRefs.includes(catalogueMitigation.id)) {
                this.threat.mitigationRefs.push(catalogueMitigation.id);
            }
        },
        removeMitigationRef(id) {
            this.threat.mitigationRefs = this.threat.mitigationRefs.filter(refId => refId !== id);
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
