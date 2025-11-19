<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed } from 'vue'

const { locale } = useI18n()

// Locales with flag emojis (simple and dependency-free)
const locales = ref([
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
])

const currentLocale = computed(() => locales.value.find(l => l.code === locale.value) ?? locales.value[0])

function setLocale(code: string) {
  locale.value = code
}
</script>

<template>
  <v-menu>
    <template #activator="{ props: activatorProps }">
      <v-btn v-bind="activatorProps" color="primary" flat icon title="Change language">
        <span>{{ currentLocale.flag }}</span>
      </v-btn>
    </template>
    <v-list>
      <v-list-item v-for="item in locales" :key="item.code" @click="setLocale(item.code)">
        <template #prepend>
          <span>{{ item.flag }}</span>
        </template>
        <v-list-item-title>{{ item.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<style scoped></style>
