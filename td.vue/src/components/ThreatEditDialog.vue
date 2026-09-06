<template>
    <div>
        <td-mitigation-edit-dialog
            ref="mitigationEditDialog"
            @mitigationUpdated="onMitigationUpdated"
            @mitigationDeleted="onMitigationDeleted"
        />
        <td-mitigation-catalogue-selector
            ref="mitigationCatalogueSelector"
            @mitigationSelected="onMitigationFromCatalogue"
        />
        <b-modal
            v-if="!!threat"
            id="threat-edit"
            size="lg"
            ok-variant="primary"
            header-bg-variant="primary"
            header-text-variant="light"
            :title="modalTitle"
            ref="editModal"
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

                <b-form-row v-if="threat.modelType == 'EOP'">
                    <b-col>
                        <b-form-group 
                            id="eop-game"
                            :label="$t('threatmodel.diagram.eop.select')"
                            label-for="eop-game"
                        >
                            <td-form-select
                                id="eop-game-select"
                                v-model="selectedGameId"
                                :options="eopGames"
                            />
                        </b-form-group>
                    </b-col>
                </b-form-row>
                <b-form-row v-if="threat.modelType == 'EOP'">
                    <b-col>
                        <b-form-group
                            id="card-suit-group"
                            :label="$t('cards.properties.suit')"
                            label-for="card-suit"
                        >
                            <td-form-select
                                id="card-suit"
                                v-model="card.suit"
                                :options="cardSuits"
                            >
                            </td-form-select>
                        </b-form-group>
                    </b-col>
                    <b-col>
                        <b-form-group
                            id="card-number-group"
                            :label="$t('cards.properties.number')"
                            label-for="card-number"
                        >
                            <td-form-select
                                id="card-number"
                                v-model="card.number"
                                :options="filteredCardNumbers"
                            >
                            </td-form-select>
                        </b-form-group>
                    </b-col>
                </b-form-row>
                <b-form-row>
                    <b-col>
                        <b-form-group
                            id="threat-type-group"
                            :label="$t('threats.properties.type')"
                            label-for="threat-type"
                            v-if="threat.modelType !== 'EOP'"
                        >
                            <td-form-select
                                id="threat-type"
                                v-model="threat.type"
                                :options="threatTypes"
                            >
                            </td-form-select>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row
                    v-if="
                        threat &&
                        threat.modelType === 'EOP' &&
                        card.number &&
                        filteredCardNumbers.some(
                            (option) => option.value === card.number
                        )
                    "
                    style="margin-bottom: 16px"
                >
                    <b-col>
                        <a
                            :href="cardUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            :title="
                                'View ' +
                                cardCategory +
                                ' ' +
                                card.number +
                                ' details'
                            "
                            style="
                                font-size: 16px;
                                font-weight: normal;
                                color: red;

                                padding: 6px 10px;
                                border-radius: 4px;
                                display: inline-block;
                            "
                        >
                            {{ $t("cards.details") }}:
                            {{
                                cardCategory.charAt(0) +
                                cardCategory.slice(1).toLowerCase()
                            }}
                            {{
                                card.number
                                    ? ` ${card.number}`
                                    : `, ${$t("cards.noDetails")}`
                            }}
                        </a>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col md="5">
                        <b-form-group
                            id="status-group"
                            class="float-left"
                            :label="$t('threats.properties.status')"
                            label-for="status"
                        >
                            <td-threat-status-selector
                                id="status"
                                v-model="threat.status"
                            ></td-threat-status-selector>
                        </b-form-group>
                    </b-col>

                    <b-col md="2">
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

                    <b-col md="5">
                        <b-form-group
                            id="severity-group"
                            class="float-right"
                            :label="$t('threats.properties.severity')"
                            label-for="severity"
                        >
                            <td-form-radio-group
                                id="severity"
                                v-model="threat.severity"
                                :options="priorities"
                                buttons
                            ></td-form-radio-group>
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
                            >
                            </b-form-textarea>
                        </b-form-group>
                    </b-col>
                </b-form-row>

                <b-form-row>
                    <b-col>
                        <b-card header-tag="header">
                            <template #header>
                                <div class="mitigations-header">
                                    <span>{{ $t('threats.mitigations.title') }}</span>
                                    <button
                                        type="button"
                                        class="mitigations-header-action"
                                        @click="newMitigation()"
                                    >
                                        <font-awesome-icon icon="plus" class="mitigations-header-icon"></font-awesome-icon>
                                        {{ $t('threats.mitigations.new') }}
                                    </button>
                                </div>
                            </template>

                            <b-card-text v-if="threat.mitigations && threat.mitigations.length">
                                <b-row>
                                    <b-col
                                        md="4"
                                        v-for="mitigation in threat.mitigations"
                                        :key="mitigation.mitigationId"
                                    >
                                        <td-mitigation-card
                                            :mitigation="mitigation"
                                            @mitigationSelected="mitigationSelected"
                                        />
                                    </b-col>
                                </b-row>
                            </b-card-text>

                            <b-card-text v-else class="text-muted">
                                {{ $t('threats.mitigations.empty') }}
                            </b-card-text>
                        </b-card>

                        <a href="#" @click.prevent="newMitigation()" class="new-mitigation-link m-2">
                            <font-awesome-icon icon="plus"></font-awesome-icon>
                            {{ $t('threats.mitigations.new') }}
                        </a>
                        <a href="#" @click.prevent="newMitigationFromCatalogue()" class="new-mitigation-link m-2">
                            <font-awesome-icon icon="plus"></font-awesome-icon>
                            {{ $t('threats.mitigations.newFromCatalogue') }}
                        </a>
                    </b-col>
                </b-form-row>
            </b-form>

            <template #modal-footer>
                <div class="w-100">
                    <b-button
                        v-if="!newThreat"
                        variant="danger"
                        class="float-left"
                        @click="confirmDelete()"
                    >
                        {{ $t("forms.delete") }}
                    </b-button>
                    <b-button
                        v-if="newThreat"
                        variant="danger"
                        class="float-left"
                        @click="immediateDelete()"
                    >
                        {{ $t("forms.remove") }}
                    </b-button>
                    <b-button
                        variant="secondary"
                        class="float-right"
                        @click="updateThreat()"
                    >
                        {{ $t("forms.apply") }}
                    </b-button>
                    <b-button
                        v-if="!newThreat"
                        variant="secondary"
                        class="float-right mr-2"
                        @click="hideModal()"
                    >
                        {{ $t("forms.cancel") }}
                    </b-button>
                </div>
            </template>
        </b-modal>
    </div>
</template>

<style lang="scss" scoped>
.new-mitigation-link {
    color: $orange;
    font-size: 14px;
    padding: 8px;
}

.mitigations-header {
    align-items: center;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    line-height: 1.5;
}

.mitigations-header-action {
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

.mitigations-header-icon {
    margin-right: 0.25rem;
}

.mitigations-header-action:hover,
.mitigations-header-action:focus {
    color: darken($orange, 10%);
    text-decoration: underline;
}
</style>

<script>
import { mapState } from 'vuex';

import { CELL_DATA_UPDATED } from '@/store/actions/cell.js';
import tmActions from '@/store/actions/threatmodel.js';
import dataChanged from '@/service/x6/graph/data-changed.js';
import threatModels from '@/service/threats/models/index.js';
import { v4 as uuidv4 } from 'uuid';
import TdFormRadioGroup from '@/components/FormRadioGroup.vue';
import TdFormSelect from '@/components/FormSelect.vue';
import TdMitigationCard from '@/components/MitigationCard.vue';
import TdMitigationEditDialog from '@/components/MitigationEditDialog.vue';
import TdMitigationCatalogueSelector from '@/components/MitigationCatalogueSelector.vue';
import TdThreatStatusSelector from '@/components/ThreatStatusSelector.vue';
import { getGame, getAllGames } from '../service/threats/models/eop';
import { getSeverityOptions } from '@/service/threats/index.js';

export default {
    name: 'TdThreatEditDialog',
    components: {
        TdFormRadioGroup,
        TdFormSelect,
        TdMitigationCard,
        TdMitigationEditDialog,
        TdMitigationCatalogueSelector,
        TdThreatStatusSelector
    },
    computed: {
        ...mapState({
            cellRef: (state) => state.cell.ref,
            threatTop: (state) => state.threatmodel.data.detail.threatTop,
            mitigationTop: (state) => state.threatmodel.data.detail.mitigationTop,
        }),
        threatTypes() {
            if (!this.cellRef || !this.threat || !this.threat.modelType) {
                return [];
            }

            const res = [];
            const threatTypes = threatModels.getThreatTypesByElement(
                this.threat.modelType,
                this.cellRef.data.type
            );
            Object.keys(threatTypes).forEach((type) => {
                res.push(this.$t(type));
            }, this);
            if (!res.includes(this.threat.type)) res.push(this.threat.type);
            return res;
        },
        priorities() {
            return getSeverityOptions(this.$t.bind(this));
        },
        modalTitle() {
            return this.$t('threats.edit') + ' #' + this.number;
        },
        eopGames() {
            return getAllGames().map(g => ({
                value: g.id,
                text: g.name
            }));
        },
        activeGame() {
            return getGame(this.selectedGameId);
        },
        cardSuits() {
            return this.activeGame?.getSuits() ?? [];
        },
        filteredCardNumbers() {
            return this.activeGame?.getCardsBySuit(this.card.suit) ?? [];
        },
        cardCategory() {
            return this.activeGame?.getCardCategory(this.card.number);
        },
        cardUrl() {
            return this.activeGame?.getCardUrl(this.card.number);
        }
    },
    data() {
        return {
            threat: {},
            modelTypes: [
                'CIA',
                'CIADIE',
                'LINDDUN',
                'PLOT4ai',
                'STRIDE',
                'EOP',
            ],
            number: 0,
            selectedGameId: null,
            card: {
                suit: null,
                number: null,
            },
        };
    },

    watch: {
        'card.suit'(newSuit, oldSuit) {
            if (!this.isLoadingThreat && newSuit !== oldSuit) {
                this.card.number = null;
                this.$nextTick(() => {
                    const cards = this.activeGame?.getCardsBySuit(newSuit) ?? [];
                    this.card.number = cards.length > 0 ? cards[cards.length - 1].value : null;
                });
            }
        },
        selectedGameId(newGameId) {
            if (!this.isLoadingThreat && newGameId) {
                const game = getGame(newGameId);
                const suits = game?.getSuits() ?? [];
                if (suits.length > 0) {
                    this.card.suit = suits[0].value;
                    this.$nextTick(() => {
                        const cards = game?.getCardsBySuit(suits[0].value) ?? [];
                        this.card.number = cards.length > 0 ? cards[cards.length - 1].value : null;
                    });
                }
            }
        }
    },

    methods: {
        editThreat(threatId, state) {
            this.isLoadingThreat = true;

            const crnthreat = this.cellRef.data.threats.find(
                (x) => x.id === threatId
            );
            this.threat = { ...crnthreat };

            this.$nextTick(() => {
                this.isLoadingThreat = false;
            });

            if (!this.threat) {
                // this should never happen with a valid threatId
                console.warn(
                    'Trying to access a non-existent threatId: ' + threatId
                );
            } else {
                this.selectedGameId = this.threat.type || this.threat.eopGameId;
                this.card.suit = this.activeGame?.getCardCategory(this.threat.cardNumber);
                this.card.number = this.threat.cardNumber;
                this.number = this.threat.number;
                this.newThreat = state === 'new';
                this.$refs.editModal.show();
            }
        },
        updateThreat() {
            if (
                this.threat.modelType === 'EOP' &&
                this.card.suit &&
                !this.card.number
            ) {
                this.$bvModal.msgBoxOk(
                    this.$t('threats.validation.cardNumberRequired'),
                    {
                        title: this.$t('threats.validation.error'),
                        okVariant: 'danger',
                        headerBgVariant: 'danger',
                        headerTextVariant: 'light',
                        centered: true,
                    }
                );
                return;
            }

            const threatRef = this.cellRef.data.threats.find(
                (x) => x.id === this.threat.id
            );
            if (threatRef) {
                const objRef = this.cellRef.data;
                if (!objRef.threatFrequency) {
                    const tmpfreq = threatModels.getFrequencyMapByElement(
                        this.threat.modelType,
                        this.cellRef.data.type
                    );
                    if (tmpfreq !== null) objRef.threatFrequency = tmpfreq;
                }
                if (objRef.threatFrequency) {
                    Object.keys(objRef.threatFrequency).forEach((k) => {
                        if (
                            this.$t(
                                `threats.model.${this.threat.modelType.toLowerCase()}.${k}`
                            ) === this.threat.type
                        )
                            objRef.threatFrequency[k]++;
                    });
                }
                threatRef.status = this.threat.status;
                threatRef.severity = this.threat.severity;
                threatRef.title = this.threat.title;
                threatRef.description = this.threat.description;
                threatRef.mitigations = this.threat.mitigations || [];
                threatRef.modelType = this.threat.modelType;
                threatRef.new = false;
                threatRef.number = this.number;
                threatRef.score = this.threat.score;
                if (threatRef.modelType === 'EOP') {
                    threatRef.cardSuit = this.card.suit;
                    threatRef.cardNumber = this.card.number;
                    threatRef.type = this.selectedGameId;
                } else {
                    threatRef.type = this.threat.type;
                }
                this.$store.dispatch(CELL_DATA_UPDATED, this.cellRef.data);
                this.$store.dispatch(tmActions.modified);
                dataChanged.updateStyleAttrs(this.cellRef);
            }
            this.hideModal();
        },
        deleteThreat() {
            if (!this.threat.new && this.cellRef.data.threatFrequency) {
                const threatMap = this.cellRef.data.threatFrequency;
                Object.keys(threatMap).forEach((k) => {
                    if (
                        this.$t(
                            `threats.model.${this.threat.modelType.toLowerCase()}.${k}`
                        ) === this.threat.type
                    )
                        threatMap[k]--;
                });
            }
            this.cellRef.data.threats = this.cellRef.data.threats.filter(
                (x) => x.id !== this.threat.id
            );
            this.cellRef.data.hasOpenThreats =
                this.cellRef.data.threats.length > 0;
            this.$store.dispatch(CELL_DATA_UPDATED, this.cellRef.data);
            this.$store.dispatch(tmActions.modified);
            dataChanged.updateStyleAttrs(this.cellRef);
        },
        hideModal() {
            this.$refs.editModal.hide();
        },
        async confirmDelete() {
            const confirmed = await this.$bvModal.msgBoxConfirm(
                this.$t('threats.confirmDeleteMessage'),
                {
                    title: this.$t('threats.confirmDeleteTitle'),
                    okTitle: this.$t('forms.delete'),
                    cancelTitle: this.$t('forms.cancel'),
                    okVariant: 'danger',
                }
            );

            if (!confirmed) {
                return;
            }

            this.deleteThreat();
            this.hideModal();
        },
        async immediateDelete() {
            this.deleteThreat();
            this.hideModal();
        },
        newMitigation() {
            const number = (this.mitigationTop || 0) + 1;
            const mitigation = {
                mitigationId: uuidv4(),
                number,
                title: '',
                description: '',
                status: 'Recommended',
                clauses: [],
                mandatory: false
            };
            this.threat.mitigations = this.threat.mitigations || [];
            this.threat.mitigations.push(mitigation);
            this.$store.dispatch(tmActions.update, { mitigationTop: number });
            this.mitigationSelected(mitigation.mitigationId);
        },
        newMitigationFromCatalogue() {
            this.$refs.mitigationCatalogueSelector.open();
        },
        onMitigationFromCatalogue(catalogueMitigation) {
            const number = (this.mitigationTop || 0) + 1;
            const mitigation = {
                mitigationId: uuidv4(),
                number,
                title: catalogueMitigation.title,
                description: catalogueMitigation.description,
                status: catalogueMitigation.status,
                clauses: catalogueMitigation.clauses,
                mandatory: false
            };
            this.threat.mitigations = this.threat.mitigations || [];
            this.threat.mitigations.push(mitigation);
            this.$store.dispatch(tmActions.update, { mitigationTop: number });
            this.mitigationSelected(mitigation.mitigationId);
        },
        mitigationSelected(mitigationId) {
            const mitigation = (this.threat.mitigations || []).find(m => m.mitigationId === mitigationId);
            if (mitigation) {
                this.$refs.mitigationEditDialog.editMitigation(mitigation);
            }
        },
        onMitigationUpdated(updated) {
            const mitigations = this.threat.mitigations || [];
            const idx = mitigations.findIndex(m => m.mitigationId === updated.mitigationId);
            if (idx !== -1) {
                this.$set(this.threat.mitigations, idx, updated);
            }
        },
        onMitigationDeleted(mitigationId) {
            this.threat.mitigations = (this.threat.mitigations || []).filter(m => m.mitigationId !== mitigationId);
        },
    },
};
</script>
