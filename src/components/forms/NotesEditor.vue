<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import type { Note } from '@/api'

interface Props {
  notes: Note[]
  title?: string
  addButtonText?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'notes.title',
  addButtonText: 'notes.addNote'
})

const emit = defineEmits<{
  'update:notes': [notes: Note[]]
}>()

const { t } = useI18n()
const { formatLocalizedCustomDate, dateFormats } = useDateFormat()

const localNotes = ref<Note[]>([...props.notes])
const editingNoteIndex = ref<number | null>(null)
const editedNote = ref<string>('')

// Watch for external changes
watch(() => props.notes, (newNotes) => {
  if (editingNoteIndex.value === null) {
    localNotes.value = [...newNotes]
  }
}, { deep: true })

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = dateFormats.isoDateTime): string => {
  if (!date) return 'N/A'
  return formatLocalizedCustomDate(date, format)
}

function addNote() {
  const newNote: Note = {
    dateCreated: null,
    createdBy: '',
    dateModified: null,
    note: '',
  }
  localNotes.value.push(newNote)
  editingNoteIndex.value = localNotes.value.length - 1
  editedNote.value = ''
  emit('update:notes', localNotes.value)
}

function editNote(index: number) {
  editingNoteIndex.value = index
  editedNote.value = localNotes.value[index].note
}

function saveNote(index: number) {
  if (editingNoteIndex.value !== null) {
    const note = localNotes.value[index]
    if (note.dateCreated) {
      note.dateModified = new Date().toISOString()
    } else {
      note.dateCreated = new Date().toISOString()
    }
    note.note = editedNote.value
    editingNoteIndex.value = null
    editedNote.value = ''
    emit('update:notes', localNotes.value)
  }
}

function cancelEdit() {
  if (editingNoteIndex.value !== null) {
    // If it's a new note (no dateCreated), remove it
    const note = localNotes.value[editingNoteIndex.value]
    if (!note.dateCreated) {
      localNotes.value.splice(editingNoteIndex.value, 1)
      emit('update:notes', localNotes.value)
    }
  }
  editingNoteIndex.value = null
  editedNote.value = ''
}

function deleteNote(index: number) {
  localNotes.value.splice(index, 1)
  emit('update:notes', localNotes.value)
}
</script>

<template>
  <v-card class="my-2">
    <!-- <v-card-title>
      <h4>{{ t(title) }}</h4>
    </v-card-title> -->
    <v-card-text>
      <v-list>
        <v-list-item v-for="(note, index) in localNotes" :key="index">
          <template v-slot:prepend v-if="editingNoteIndex !== index">
            <v-chip color="blue" class="mr-2">
              <v-icon @click="editNote(index)">mdi-pencil</v-icon>
            </v-chip>
            <v-chip color="red">
              <v-icon @click="deleteNote(index)">mdi-delete</v-icon>
            </v-chip>
          </template>

          <!-- Editing mode -->
          <v-container v-if="editingNoteIndex === index">
            <v-row>
              <v-textarea
                          v-model="editedNote"
                          rows="2"
                          variant="outlined"
                          density="compact"
                          data-testid="note-textarea"
                          autofocus></v-textarea>
            </v-row>
            <v-row>
              <v-col class="py-0" cols="8">
                <v-btn
                       color="success"
                       @click="saveNote(index)"
                       size="small"
                       data-testid="note-save-btn">
                  <v-icon>mdi-check</v-icon>
                </v-btn>
              </v-col>
              <v-col class="py-0" cols="4">
                <v-btn
                       color="error"
                       @click="cancelEdit"
                       size="small">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-container>

          <!-- Display mode -->
          <v-container v-else>
            <v-list-item-title>{{ note.note }}</v-list-item-title>
            <v-list-item-subtitle>
              <p class="text-caption mb-1">
                {{ t('notes.createdOn') }}
                {{ safeFormatDate(note.dateCreated) }}
              </p>
              <p v-if="note.dateModified" class="text-caption">
                {{ t('notes.modifiedOn') }}
                {{ safeFormatDate(note.dateModified) }}
              </p>
            </v-list-item-subtitle>
          </v-container>
        </v-list-item>
      </v-list>

      <v-btn
             v-if="editingNoteIndex === null"
             color="primary"
             @click="addNote"
             class="mt-2"
             data-testid="note-add-btn">
        {{ t(addButtonText) }}
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* Add any component-specific styles here */
</style>
