<template>
    <b-card class="mitigation-card">
        <b-card-text>
            <b-row class="mb-2">
                <b-col>
                    <a href="#" @click.prevent="mitigationSelected()">
                        #{{ number }} {{ mitigation.title || $t('threats.mitigations.noTitle') }}
                    </a>
                </b-col>
            </b-row>


            <b-row class="mb-2">
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
                        icon="exclamation-triangle"
                        class="mitigation-icon orange-icon"
                        :title="mitigation.status"
                    />

                    <font-awesome-icon
                        v-if="mitigation.mandatory"
                        icon="shield-alt"
                        class="mitigation-icon red-icon"
                        :title="$t('threats.mitigations.mandatory')"
                    />
                </b-col>

                <b-col align-h="end">
                    <b-badge v-if="mitigation.mandatory" variant="danger" class="mr-1">
                        {{ $t('threats.mitigations.mandatory') }}
                    </b-badge>
                    <b-badge>{{ mitigation.status }}</b-badge>
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

    computed: {
        number() { return this.mitigation.number || '?'; }
    },

    methods: {
        mitigationSelected() {
            this.$emit('mitigationSelected', this.mitigation.mitigationId);
        }
    }
};
</script>
