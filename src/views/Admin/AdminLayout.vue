<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useLocalStorage } from '@vueuse/core';

const router = useRouter();
const route = useRoute();
const rail = useLocalStorage<boolean>('adminRail', false);
const isToggling = ref(false);

const adminMenuItems = [
  {
    title: 'User Management',
    icon: 'mdi-account-multiple',
    route: 'admin-users'
  },
  {
    title: 'Department Management',
    icon: 'mdi-domain',
    route: 'admin-departments'
  },
  {
    title: 'Batch User Creation',
    icon: 'mdi-account-multiple-plus',
    route: 'admin-batch-user-creation'
  },
  {
    title: 'Form Templates',
    icon: 'mdi-form-select',
    route: 'admin-form-templates'
  },
  // Add more admin items here in the future
];

const navigateTo = (routeName: string) => {
  router.push({ name: routeName });
};

const toggleRail = () => {
  isToggling.value = true;
  rail.value = !rail.value;
  // Clear the toggling state after animation duration
  setTimeout(() => { isToggling.value = false; }, 260);
};

const currentRouteName = computed(() => route.name as string | undefined);
</script>

<template>
  <v-container fluid class="pa-0 mt-4">
    <v-navigation-drawer
                         v-model:rail="rail"
                         :width="rail ? 72 : 256"
                         permanent
                         color="grey-lighten-4"
                         floating
                         class="admin-drawer">
      <v-list density="compact" nav>
        <v-list-item class="pa-0 align-center">
          <v-list-item-title v-if="!rail" class="text-h6 mb-2 ml-2">Admin Panel</v-list-item-title>
          <v-spacer />
        </v-list-item>

        <v-divider class="mb-2" />

        <v-list-item
                     v-for="item in adminMenuItems"
                     :key="item.route"
                     :value="item.route"
                     @click="navigateTo(item.route)"
                     :class="{ 'v-item--active': currentRouteName === item.route }"
                     ripple>
          <v-tooltip :open-on-hover="true" v-if="rail">
            <template #activator="{ props }">
              <v-icon>{{ item.icon }}</v-icon>
            </template>
            <span>{{ item.title }}</span>
          </v-tooltip>
          <template v-else>
            <v-icon>{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title v-if="!rail">{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <!-- Right side collapse/expand stripe -->
      <div
           class="collapse-stripe"
           :class="{ 'is-collapsed': rail, 'is-toggling': isToggling }"
           :style="{ '--chev-rot': rail ? '180deg' : '0deg' }"
           role="button"
           tabindex="0"
           @click="toggleRail"
           @keydown.enter.prevent="toggleRail"
           @keydown.space.prevent="toggleRail"
           aria-label="Toggle sidebar">
        <v-icon>mdi-chevron-left</v-icon>
      </div>

      <!-- collapsed/expanded toggle moved to top bar -->
    </v-navigation-drawer>

    <v-main :class="['flex-grow-1 pa-0 admin-content', { 'admin-collapsed': rail, 'admin-expanded': !rail }]">
      <RouterView />
    </v-main>
  </v-container>
</template>

<style scoped>
.fill-height {
  min-height: 100vh;
}

.admin-drawer .v-list-item {
  padding-left: 8px;
  padding-right: 8px;
}

.admin-drawer .v-list-item-icon {
  min-width: 40px;
}

.admin-drawer .v-list-item-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-drawer {
  transition: width 240ms ease, min-width 240ms ease;
}

.admin-content {
  transition: margin-left 240ms ease;
}

.admin-content.admin-expanded {
  margin-left: 12px;
  /* more gap when expanded */
}

.admin-content.admin-collapsed {
  margin-left: 4px;
  /* smaller gap when collapsed */
}

.collapse-stripe {
  position: absolute;
  right: 0px;
  /* moved 4px further outside the drawer */
  top: 0;
  bottom: 0;
  width: 22px;
  background: rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 120ms ease, right 120ms ease, width 160ms ease;
  border-radius: 0 4px 4px 0;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.02) inset;
}

.collapse-stripe:not(.is-collapsed):hover {
  background: rgba(0, 0, 0, 0.12);
}

.collapse-stripe v-icon {
  color: rgba(0, 0, 0, 0.6);
}

.collapse-stripe .v-icon {
  /* base transform/transition */
  transition: transform 160ms cubic-bezier(.2, .8, .2, 1);
  transform: rotate(var(--chev-rot));
}

.collapse-stripe:hover .v-icon {
  transform: rotate(calc(var(--chev-rot) + 25deg)) scale(1.05);
}

.collapse-stripe.is-collapsed:hover .v-icon {
  transform: rotate(calc(var(--chev-rot) + 25deg)) scale(1.05);
}

/* small bounce animation when toggling */
@keyframes stripe-bounce {
  0% {
    transform: translateX(0px) scale(1);
  }

  50% {
    transform: translateX(3px) scale(1.06);
  }

  100% {
    transform: translateX(0px) scale(1);
  }
}

.collapse-stripe.is-toggling .v-icon {
  animation: stripe-bounce 220ms cubic-bezier(.2, .8, .2, 1);
}

.collapse-stripe:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.12);
}

/* collapsed appearance: icon only, no gray stripe background */
.collapse-stripe.is-collapsed {
  right: 0px;
  /* push further to the right */
  width: 14px;
  /* visually smaller clickable area */
  background: transparent;
  box-shadow: none;
}

.collapse-stripe.is-collapsed:hover {
  background: rgba(0, 0, 0, 0.02);
  /* minimal hover effect */
}
</style>
