<template>
    <b-card class="mitigation-card">
        <b-card-text>
            <b-row>
                <b-col>
                    <a href="#" @click.prevent="mitigationSelected()">
                        {{ mitigation.description || $t('threats.mitigations.noDescription') }}
                    </a>
                </b-col>
            </b-row>

            <b-row>
                <b-col>
                    <font-awesome-icon
                        v-if="mitigation.status === 'Implemented'"
                        icon="check"
                        class="mitigation-icon green-icon"
                        :title="mitigation.status"
                    />
                    <font-awesome-icon
                        v-else-if="mitigation.status === 'Not Applicable'"
                        icon="check"
                        class="mitigation-icon gray-icon"
                        :title="mitigation.status"
                    />
                    <font-awesome-icon
                        v-else-if="mitigation.status === 'Rejected'"
                        icon="times"
                        class="mitigation-icon red-icon"
                        :title="mitigation.status"
                    />
                    <font-awesome-icon
                        v-else
                        icon="clock"
                        class="mitigation-icon orange-icon"
                        :title="mitigation.status"
                    />
                    <b-badge
                        v-if="mitigation.mandatory"
                        variant="warning"
                        class="ml-1"
                    >{{ $t('threats.mitigations.mandatory') }}</b-badge>
                </b-col>
                <b-col align-h="end">
                    <b-badge>{{ mitigation.status }}</b-badge>
                </b-col>
            </b-row>

            <b-row v-if="mitigation.clauses && mitigation.clauses.length">
                <b-col>
                    <small class="text-muted">
                        <span
                            v-for="(clause, idx) in mitigation.clauses"
                            :key="idx"
                        >{{ clause.standard }} {{ clause.clause }}<span v-if="idx < mitigation.clauses.length - 1">, </span></span>
                    </small>
                </b-col>
            </b-row>
        </b-card-text>
    </b-card>
</template>

<style lang="scss" scoped>
.mitigation-card {
    font-size: 14px;
}

.mitigation-icon {
    margin: 2px;
}

.green-icon {
    color: $green;
}

.red-icon {
    color: $red;
}

.orange-icon {
    color: $darkorange;
}

.gray-icon {
    color: $gray;
}
</style>

<script>
export default {
    name: 'TdMitigationCard',

    props: {
        mitigation: {
            type: Object,
            required: true
        }
    },

    methods: {
        mitigationSelected() {
            this.$emit('mitigationSelected', this.mitigation.mitigationId);
        }
    }
};
</script>
