<template>
    <div>
        <b-modal
            v-if="!!mitigation"
            id="mitigation-catalogue-form"
            size="lg"
            ok-variant="primary"
            header-bg-variant="primary"
            header-text-variant="light"
            :title="isEditing ? $t('threats.mitigations.catalogue.editMitigation') : $t('threats.mitigations.catalogue.newMitigation')"
            ref="formModal"
        >
            <b-form>
                <b-form-row>
                    <b-col>
                        <b-form-group
                            :label="$t('threats.properties.title')"
                            label-for="cat-mitigation-title"
                        >
                            <b-form-input
                                id="cat-mitigation-title"
                                v-model="mitigation.title"
                                type="text"
                                required
                            ></b-form-input>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col>
                        <b-form-group
                            :label="$t('threats.properties.description')"
                            label-for="cat-mitigation-description"
                        >
                            <b-form-textarea
                                id="cat-mitigation-description"
                                v-model="mitigation.description"
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
                                    <span>{{ $t('threats.mitigations.clauses') }}</span>
                                    <button
                                        type="button"
                                        class="clauses-header-action"
                                        @click="addClause()"
                                    >
                                        <font-awesome-icon icon="plus" class="clauses-header-icon"></font-awesome-icon>
                                        {{ $t('threats.mitigations.addClause') }}
                                    </button>
                                </div>
                            </template>

                            <b-card-text v-if="mitigation.clauses && mitigation.clauses.length">
                                <b-form-row
                                    v-for="(clause, idx) in mitigation.clauses"
                                    :key="idx"
                                    class="clause-row align-items-center"
                                >
                                    <b-col md="5">
                                        <td-form-select
                                            v-model="clause.standard"
                                            :options="standardOptions"
                                        ></td-form-select>
                                    </b-col>
                                    <b-col md="5">
                                        <b-form-input
                                            v-model="clause.clause"
                                            :placeholder="$t('threats.mitigations.clausePlaceholder')"
                                        ></b-form-input>
                                    </b-col>
                                    <b-col md="2" class="text-right">
                                        <b-button
                                            variant="link"
                                            class="remove-clause-btn"
                                            @click="removeClause(idx)"
                                        >
                                            <font-awesome-icon icon="times"></font-awesome-icon>
                                        </b-button>
                                    </b-col>
                                </b-form-row>
                            </b-card-text>

                            <b-card-text v-else class="text-muted">
                                {{ $t('threats.mitigations.noClauses') }}
                            </b-card-text>
                        </b-card>
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
                        :disabled="!mitigation.title"
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

.clause-row {
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
import mcActions from '@/store/actions/mitigationCatalogue.js';
import TdFormSelect from '@/components/FormSelect.vue';

export default {
    name: 'TdMitigationCatalogueForm',
    components: { TdFormSelect },
    data() {
        return {
            mitigation: null,
            isEditing: false
        };
    },
    computed: {
        ...mapGetters(['allStandards']),
        standardOptions() {
            return [
                { value: '', text: this.$t('threats.mitigations.standardPlaceholder'), disabled: true },
                ...this.allStandards.map(s => ({ value: s.name, text: s.name }))
            ];
        }
    },
    methods: {
        showModal(existingMitigation) {
            if (existingMitigation) {
                this.isEditing = true;
                this.mitigation = {
                    id: existingMitigation.id,
                    title: existingMitigation.title || '',
                    description: existingMitigation.description || '',
                    clauses: (existingMitigation.clauses || []).map(c => ({ ...c }))
                };
            } else {
                this.isEditing = false;
                this.mitigation = {
                    id: uuidv4(),
                    title: '',
                    description: '',
                    clauses: []
                };
            }
            this.$nextTick(() => this.$refs.formModal.show());
        },
        hideModal() {
            this.$refs.formModal.hide();
        },
        addClause() {
            this.mitigation.clauses.push({ standard: '', clause: '' });
        },
        removeClause(idx) {
            this.mitigation.clauses.splice(idx, 1);
        },
        async onSave() {
            try {
                if (this.isEditing) {
                    await this.$store.dispatch(mcActions.update, { ...this.mitigation });
                    this.$toast.success(this.$t('threats.mitigations.catalogue.prompts.updateSuccess'));
                } else {
                    await this.$store.dispatch(mcActions.create, { ...this.mitigation });
                    this.$toast.success(this.$t('threats.mitigations.catalogue.prompts.createSuccess'));
                }
                this.hideModal();
            } catch (error) {
                console.error('Failed to save catalogue mitigation:', error);
                this.$toast.error(this.$t(this.isEditing
                    ? 'threats.mitigations.catalogue.errors.updateFailed'
                    : 'threats.mitigations.catalogue.errors.createFailed'));
            }
        },
        async confirmDelete() {
            const confirmed = await this.$bvModal.msgBoxConfirm(
                `Delete "${this.mitigation.title}"? This cannot be undone.`,
                {
                    title: this.$t('threats.mitigations.catalogue.deleteTitle'),
                    okTitle: this.$t('forms.delete'),
                    cancelTitle: this.$t('forms.cancel'),
                    okVariant: 'danger'
                }
            );
            if (confirmed) {
                try {
                    await this.$store.dispatch(mcActions.delete, this.mitigation.id);
                    this.$toast.success(this.$t('threats.mitigations.catalogue.prompts.deleteSuccess'));
                    this.hideModal();
                } catch (error) {
                    console.error('Failed to delete catalogue mitigation:', error);
                    this.$toast.error(this.$t('threats.mitigations.catalogue.errors.deleteFailed'));
                }
            }
        }
    }
};
</script>
