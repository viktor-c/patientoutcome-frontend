<template>
  <v-menu offset-y>
    <template #activator="{ props }">
      <v-btn v-bind="props" color="primary" variant="elevated" class="role-switcher-btn">
        <v-icon start>mdi-account-switch</v-icon>
        {{ currentUsername }}
        <v-icon end>mdi-chevron-down</v-icon>
      </v-btn>
    </template>
    
    <v-list>
      <v-list-subheader>Switch Role</v-list-subheader>
      
      <v-list-item
        v-for="user in availableUsers"
        :key="user.username"
        @click="switchRole(user.username)"
        :disabled="user.username === currentUsername"
      >
        <template #prepend>
          <v-avatar :color="user.isKiosk ? 'orange' : 'blue'" size="32">
            <v-icon :icon="user.isKiosk ? 'mdi-monitor-dashboard' : 'mdi-doctor'" color="white"></v-icon>
          </v-avatar>
        </template>
        
        <v-list-item-title>{{ user.username }}</v-list-item-title>
        <v-list-item-subtitle>{{ user.role }}</v-list-item-subtitle>
        
        <template #append>
          <v-icon v-if="user.username === currentUsername" color="success">mdi-check-circle</v-icon>
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { userApi } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const notifierStore = useNotifierStore()
const router = useRouter()

const isLoading = ref(false)

const currentUsername = computed(() => userStore.username || '')

// Extract suffix from current username to determine related users
const userSuffix = computed(() => {
  const username = currentUsername.value
  if (username.startsWith('kiosk')) {
    // Extract suffix after "kiosk" (e.g., "kiosk3543" -> "3543")
    return username.substring(5)
  }
  if (username.startsWith('user')) {
    // Extract suffix after "user" (e.g., "user3543" -> "3543")
    return username.substring(4)
  }
  return ''
})

interface User {
  username: string
  role: string
  isKiosk: boolean
}

// Generate list of available users based on current user
const availableUsers = computed((): User[] => {
  const users: User[] = []
  const suffix = userSuffix.value
  
  if (!suffix) return users
  
  // Always include both kiosk and doctor variants (no dash in kiosk username)
  users.push({
    username: `kiosk${suffix}`,
    role: 'Kiosk User',
    isKiosk: true
  })
  
  users.push({
    username: `user${suffix}`,
    role: 'Doctor',
    isKiosk: false
  })
  
  return users
})

async function switchRole(username: string) {
  if (username === currentUsername.value) {
    return
  }
  
  isLoading.value = true
  
  try {
    const data = await userApi.roleSwitchUser({ kioskLoginUserRequest: { username } })

    if (data.responseObject && data.success && data.statusCode === 200) {
      // Update user session
      const responseWithPostop = data.responseObject as typeof data.responseObject & { postopWeek?: number }
      
      userStore.setSession({
        username: data.responseObject.username,
        department: data.responseObject.department,
        belongsToCenter: data.responseObject.belongsToCenter,
        email: data.responseObject.email || '',
        roles: data.responseObject.roles || [],
        postopWeek: responseWithPostop.postopWeek
      })
      
      notifierStore.notify(`Switched to ${username}`, 'success')
      
      // Redirect based on new role
      if (data.responseObject.roles?.includes('kiosk')) {
        router.push('/kiosk')
      } else if (data.responseObject.roles?.includes('doctor')) {
        router.push('/dashboard')
      }
    } else {
      notifierStore.notify(data.message || 'Role switch failed', 'error')
    }
  } catch (error) {
    console.error('Role switch error:', error)
    notifierStore.notify('An error occurred during role switch', 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.role-switcher-btn {
  text-transform: none;
  font-weight: 500;
}
</style>
