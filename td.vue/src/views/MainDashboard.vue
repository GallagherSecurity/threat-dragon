<template>
    <div>
        <b-row>
            <b-col>
                <b-jumbotron :header="$t('dashboard.welcome.title')">
                    <p>
                        {{ $t('dashboard.welcome.description') }}
                    </p>
                </b-jumbotron>
            </b-col>
        </b-row>
        <b-row >
            
            <td-dashboard-action class="dashboard-action"
                v-for="(action, idx) in actions"
                :key="idx"
                :to="action.to"
                :icon="action.icon"
                :iconPreface="action.iconPreface"
                :description="action.key"
            ></td-dashboard-action>
        </b-row>
    </div>
</template>

<style lang="scss" scoped>
.action-icon {
    color: $orange;
    margin-bottom: 15px;
}

.dashboard-action {
    padding-bottom: 2rem;
}

</style>

<script>


import TdDashboardAction from '@/components/DashboardAction.vue';
import {mapGetters} from 'vuex';

export default {
    name: 'MainDashboard',
    components: {
        TdDashboardAction
    },
    computed: {
    ...mapGetters({
            actions: 'dashboardActions' 
        })},
   
};
</script>
