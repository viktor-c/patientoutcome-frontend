<template>
  <v-container fluid class="activity-log-dashboard pa-4">
    <v-row>
      <v-col cols="12">
        <v-card class="elevation-3">
          <v-card-title class="d-flex justify-space-between align-center bg-primary">
            <div>
              <v-icon icon="mdi-monitor-dashboard" class="mr-2"></v-icon>
              Activity Log Dashboard
            </div>
            <div class="d-flex align-center">
              <v-chip :color="isConnected ? 'success' : 'error'" variant="flat" class="mr-2">
                <v-icon
                        :icon="isConnected ? 'mdi-lan-connect' : 'mdi-lan-disconnect'"
                        start></v-icon>
                {{ isConnected ? 'Connected' : 'Disconnected' }}
              </v-chip>
              <v-chip color="info" variant="flat" class="mr-2">
                <v-icon icon="mdi-counter" start></v-icon>
                {{ logs.length }} logs
              </v-chip>
              <v-btn
                     icon="mdi-refresh"
                     size="small"
                     variant="text"
                     @click="reconnect"
                     :disabled="isConnected"></v-btn>
              <v-btn
                     icon="mdi-delete"
                     size="small"
                     variant="text"
                     color="error"
                     @click="clearLogs"></v-btn>
            </div>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-container fluid class="pa-0">
              <!-- Filter controls -->
              <v-row class="pa-3 bg-grey-lighten-4" no-gutters>
                <v-col cols="12" md="4">
                  <v-text-field
                                v-model="searchQuery"
                                label="Search"
                                prepend-inner-icon="mdi-magnify"
                                clearable
                                dense
                                hide-details></v-text-field>
                </v-col>
                <v-col cols="12" md="4" class="pl-md-2">
                  <v-select
                            v-model="selectedTypes"
                            :items="logTypes"
                            label="Filter by type"
                            multiple
                            chips
                            clearable
                            dense
                            hide-details></v-select>
                </v-col>
                <v-col cols="12" md="4" class="pl-md-2 d-flex align-center">
                  <v-switch
                            v-model="autoScroll"
                            label="Auto-scroll"
                            color="primary"
                            hide-details
                            density="comfortable"></v-switch>
                </v-col>
              </v-row>

              <!-- Log display area -->
              <v-virtual-scroll
                                :items="filteredLogs"
                                height="600"
                                item-height="80"
                                ref="logScroll"
                                class="log-container">
                <template v-slot:default="{ item }">
                  <v-list-item
                               :key="item.timestamp"
                               class="log-item"
                               :class="`log-${item.type}`">
                    <template v-slot:prepend>
                      <v-avatar :color="item.color" size="40">
                        <v-icon :icon="getIconForType(item.type)" color="white"></v-icon>
                      </v-avatar>
                    </template>

                    <v-list-item-title class="d-flex align-center">
                      <span class="font-weight-bold mr-2">{{ item.username }}</span>
                      <v-chip :color="item.color" size="x-small" variant="flat">
                        {{ item.type }}
                      </v-chip>
                    </v-list-item-title>

                    <v-list-item-subtitle>
                      <div class="text-body-2">{{ item.action }}</div>
                      <div v-if="item.details" class="text-caption text-grey mt-1">
                        {{ item.details }}
                      </div>
                    </v-list-item-subtitle>

                    <template v-slot:append>
                      <div class="text-caption text-grey">
                        {{ formatTime(item.timestamp) }}
                      </div>
                    </template>
                  </v-list-item>
                  <v-divider></v-divider>
                </template>
              </v-virtual-scroll>
            </v-container>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useNotifierStore } from '@/stores/notifierStore'

interface ActivityLog {
  timestamp: string
  username: string
  action: string
  details?: string
  type: 'login' | 'roleSwitch' | 'dashboard' | 'formOpen' | 'formSubmit' | 'info' | 'warning' | 'error'
  color?: string
}

const notifierStore = useNotifierStore()

const logs = ref<ActivityLog[]>([])
const searchQuery = ref('')
const selectedTypes = ref<string[]>([])
const autoScroll = ref(true)
const isConnected = ref(false)
const logScroll = ref<{ $el: { querySelector: (selector: string) => HTMLElement | null } } | null>(null)

const logTypes = [
  { title: 'Login', value: 'login' },
  { title: 'Role Switch', value: 'roleSwitch' },
  { title: 'Dashboard', value: 'dashboard' },
  { title: 'Form Open', value: 'formOpen' },
  { title: 'Form Submit', value: 'formSubmit' },
  { title: 'Info', value: 'info' },
  { title: 'Warning', value: 'warning' },
  { title: 'Error', value: 'error' }
]

let eventSource: EventSource | null = null

const filteredLogs = computed(() => {
  let result = logs.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      log =>
        log.username.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query)
    )
  }

  // Filter by type
  if (selectedTypes.value.length > 0) {
    result = result.filter(log => selectedTypes.value.includes(log.type))
  }

  return result.slice().reverse() // Show newest first
})

function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    login: 'mdi-login',
    roleSwitch: 'mdi-swap-horizontal',
    dashboard: 'mdi-view-dashboard',
    formOpen: 'mdi-file-document-edit',
    formSubmit: 'mdi-check-circle',
    info: 'mdi-information',
    warning: 'mdi-alert',
    error: 'mdi-alert-circle'
  }
  return icons[type] || 'mdi-circle'
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function connectToEventStream() {
  // If running in production, force the promo API URL
  // BUG in production env meta.env.VITE_API_BASE_URL is undefined
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:40001'
  console.debug('Connecting to SSE at', `${baseURL}/activitylog/stream`)
  eventSource = new EventSource(`${baseURL}/activitylog/stream`, {
    withCredentials: true
  })

  eventSource.onopen = () => {
    isConnected.value = true
    console.log('📡 Connected to activity log stream')
  }

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type !== 'connected') {
        logs.value.push(data as ActivityLog)

        // Auto-scroll to bottom if enabled
        if (autoScroll.value) {
          nextTick(() => {
            if (logScroll.value) {
              const container = logScroll.value.$el.querySelector('.v-virtual-scroll__container')
              if (container) {
                container.scrollTop = container.scrollHeight
              }
            }
          })
        }
      }
    } catch (error) {
      console.error('Error parsing event data:', error)
    }
  }

  eventSource.onerror = (error) => {
    console.error('SSE error:', error)
    isConnected.value = false
    notifierStore.notify('Connection to activity log lost. Retrying...', 'info')

    // Reconnect after 5 seconds
    setTimeout(() => {
      if (eventSource) {
        eventSource.close()
      }
      connectToEventStream()
    }, 5000)
  }
}

function reconnect() {
  if (eventSource) {
    eventSource.close()
  }
  logs.value = []
  connectToEventStream()
  notifierStore.notify('Reconnecting to activity log...', 'info')
}

function clearLogs() {
  logs.value = []
  notifierStore.notify('Local logs cleared', 'success')
}

watch(autoScroll, (newValue) => {
  if (newValue) {
    nextTick(() => {
      if (logScroll.value) {
        const container = logScroll.value.$el.querySelector('.v-virtual-scroll__container')
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      }
    })
  }
})

onMounted(() => {
  connectToEventStream()
})

onUnmounted(() => {
  if (eventSource) {
    eventSource.close()
  }
})
</script>

<style scoped>
.activity-log-dashboard {
  background-color: #f5f5f5;
}

.log-container {
  background-color: #ffffff;
}

.log-item {
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
}

.log-item:hover {
  background-color: #f5f5f5;
}

.log-login {
  border-left-color: #4caf50;
}

.log-roleSwitch {
  border-left-color: #2196f3;
}

.log-dashboard {
  border-left-color: #ff9800;
}

.log-formOpen {
  border-left-color: #9c27b0;
}

.log-formSubmit {
  border-left-color: #00bcd4;
}

.log-info {
  border-left-color: #607d8b;
}

.log-warning {
  border-left-color: #ffc107;
}

.log-error {
  border-left-color: #f44336;
}
</style>
