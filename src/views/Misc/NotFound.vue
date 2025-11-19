<template>
  <div class="not-found">
    <h1>{{ t('notFound.title') }}</h1>
    <p>{{ t('notFound.message') }}</p>
    <router-link to="/">{{ t('notFound.goHome') }}</router-link>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<style scoped>
.not-found {
  text-align: center;
  margin-top: 50px;
}

.not-found h1 {
  font-size: 2rem;
  color: #ff6b6b;
}

.not-found p {
  margin: 20px 0;
  font-size: 1.2rem;
}

.not-found a {
  color: #1e90ff;
  text-decoration: none;
  font-weight: bold;
}
</style>
