<template>
    <div>
        <b-modal
            v-if="!!mitigation"
            id="mitigation-edit"
            size="lg"
            ok-variant="primary"
            header-bg-variant="primary"
            header-text-variant="light"
            :title="$t('threats.mitigations.edit')"
            ref="editModal"
        >
            <b-form>
                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="mitigation-title-group"
                            :label="$t('threats.properties.title')"
                            label-for="mitigation-title"
                        >
                            <b-form-input
                                id="mitigation-title"
                                v-model="mitigation.title"
                                type="text"
                            ></b-form-input>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="mitigation-description-group"
                            :label="$t('threats.properties.description')"
                            label-for="mitigation-description"
                        >
                            <b-form-textarea
                                id="mitigation-description"
                                v-model="mitigation.description"
                                rows="4"
                            ></b-form-textarea>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="mitigation-status-group"
                            :label="$t('threats.properties.status')"
                            label-for="mitigation-status"
                        >
                            <td-form-select
                                id="mitigation-status"
                                v-model="mitigation.status"
                                :options="mitigationStatuses"
                            ></td-form-select>
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
                        variant="danger"
                        class="float-left"
                        @click="deleteMitigation()"
                    >
                        {{ $t('forms.delete') }}
                    </b-button>
                    <b-button
                        variant="secondary"
                        class="float-right"
                        @click="applyMitigation()"
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
import { mapGetters, mapState } from 'vuex';
import { computeMandatory } from '@/service/mitigations/compliance.js';
import TdFormSelect from '@/components/FormSelect.vue';

export default {
    name: 'TdMitigationEditDialog',

    components: {
        TdFormSelect
    },

    computed: {
        ...mapGetters(['allStandards']),
        ...mapState({
            requiredStandards: (state) => state.threatmodel.data.summary.requiredStandards || []
        }),
        standardOptions() {
            return [
                { value: '', text: this.$t('threats.mitigations.standardPlaceholder'), disabled: true },
                ...this.allStandards.map(s => ({ value: s.name, text: s.name }))
            ];
        }
    },

    data() {
        return {
            mitigation: null,
            mitigationStatuses: [
                'Recommended',
                'Identified',
                'Implemented',
                'Not Applicable',
                'Rejected'
            ]
        };
    },

    methods: {
        editMitigation(mitigation) {
            this.mitigation = { ...mitigation, clauses: mitigation.clauses ? mitigation.clauses.map(c => ({ ...c })) : [] };
            this.$nextTick(() => this.$refs.editModal.show());
        },

        applyMitigation() {
            const mitigation = { ...this.mitigation, mandatory: computeMandatory(this.mitigation, this.requiredStandards) };
            this.$emit('mitigationUpdated', mitigation);
            this.hideModal();
        },

        deleteMitigation() {
            this.$emit('mitigationDeleted', this.mitigation.mitigationId);
            this.hideModal();
        },

        addClause() {
            this.mitigation.clauses.push({ standard: '', clause: '' });
        },

        removeClause(idx) {
            this.mitigation.clauses.splice(idx, 1);
        },

        hideModal() {
            this.$refs.editModal.hide();
        }
    }
};
</script>
