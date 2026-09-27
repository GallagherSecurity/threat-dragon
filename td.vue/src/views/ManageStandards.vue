<template>
    <b-container fluid>
        <b-row>
            <b-col>
                <b-jumbotron class="text-center">
                    <h4>{{ $t('standards.manage') }}</h4>
                    <p class="lead">{{ $t('standards.manageDescription') }}</p>
                </b-jumbotron>
            </b-col>
        </b-row>

        <b-row>
            <b-col md="8" offset-md="2">
                <b-form @submit.prevent="onAdd">
                    <b-form-row>
                        <b-col md="9">
                            <b-form-input
                                id="new-standard-name"
                                v-model="newName"
                                :placeholder="$t('standards.namePlaceholder')"
                                :aria-label="$t('standards.namePlaceholder')"
                                :state="isDuplicate ? false : null"
                            />
                        </b-col>
                        <b-col md="3">
                            <b-button type="submit" variant="primary" block :disabled="!canAdd">
                                + {{ $t('standards.add') }}
                            </b-button>
                        </b-col>
                    </b-form-row>
                    <small v-show="isDuplicate" class="text-danger">
                        {{ $t('standards.duplicate') }}
                    </small>
                </b-form>
            </b-col>
        </b-row>

        <b-row class="mt-3">
            <b-col md="8" offset-md="2">
                <b-list-group v-if="allStandards.length">
                    <b-list-group-item v-for="standard in allStandards" :key="standard.id">
                        {{ standard.name }}
                    </b-list-group-item>
                </b-list-group>
                <b-alert v-else show variant="info">{{ $t('standards.empty') }}</b-alert>
            </b-col>
        </b-row>
    </b-container>
</template>

<script>
import { mapGetters } from 'vuex';
import standardsActions from '@/store/actions/standards.js';

export default {
    name: 'ManageStandards',
    data() {
        return {
            newName: '',
            isAdding: false
        };
    },
    computed: {
        ...mapGetters(['allStandards']),
        trimmedName() {
            return this.newName.trim();
        },
        isDuplicate() {
            const name = this.trimmedName.toLowerCase();
            return !!name && this.allStandards.some(s => s.name.toLowerCase() === name);
        },
        canAdd() {
            return !!this.trimmedName && !this.isDuplicate && !this.isAdding;
        }
    },
    mounted() {
        this.$store.dispatch(standardsActions.fetch);
    },
    methods: {
        async onAdd() {
            if (!this.canAdd) return;
            this.isAdding = true;
            try {
                await this.$store.dispatch(standardsActions.create, this.trimmedName);
                this.$toast.success(this.$t('standards.prompts.createSuccess'));
                this.newName = '';
            } catch (e) {
                console.error('Failed to add standard:', e);
                this.$toast.error(this.$t('standards.errors.createFailed'));
            } finally {
                this.isAdding = false;
            }
        }
    }
};
</script>
