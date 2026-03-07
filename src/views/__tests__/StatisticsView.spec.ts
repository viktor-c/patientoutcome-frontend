import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { defineComponent, h } from 'vue'
import StatisticsView from '../StatisticsView.vue'

const mockRouterPush = vi.fn()
const mockGetCaseStatistics = vi.fn()
const mockNotifierError = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { caseId: 'case-1' },
  }),
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'en' },
  }),
}))

vi.mock('vue-chartjs', () => ({
  Line: defineComponent({
    name: 'MockLineChart',
    props: {
      data: {
        type: Object,
        required: true,
      },
      options: {
        type: Object,
        required: true,
      },
    },
    setup() {
      return () => h('div', { class: 'line-stub' })
    },
  }),
}))

vi.mock('@/stores/notifierStore', () => ({
  useNotifierStore: () => ({
    error: mockNotifierError,
  }),
}))

vi.mock('@/api', () => ({
  statisticsApi: {
    getCaseStatistics: (...args: unknown[]) => mockGetCaseStatistics(...args),
  },
}))

describe('StatisticsView.vue', () => {
  const vuetify = createVuetify({ components, directives })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCaseStatistics.mockResolvedValue({
      responseObject: {
        totalConsultations: 2,
        caseCreatedAt: '2025-12-01T00:00:00.000Z',
        consultations: [
          {
            proms: [
              {
                title: 'MOXFQ',
                formTemplateId: '67b4e612d0feb4ad99ae2e85',
                createdAt: '2026-01-01T10:00:00.000Z',
                scoring: {
                  totalScore: {
                    normalizedScore: 45,
                    rawScore: 45,
                  },
                  rawFormData: {},
                },
              },
              {
                title: 'VAS',
                formTemplateId: '67b4e612d0feb4ad99ae2e86',
                createdAt: '2026-01-01T10:00:00.000Z',
                scoring: {
                  totalScore: {
                    normalizedScore: 80,
                    rawScore: 8,
                  },
                  rawFormData: {
                    painScale: 8,
                  },
                },
              },
            ],
          },
          {
            proms: [
              {
                title: 'MOXFQ',
                formTemplateId: '67b4e612d0feb4ad99ae2e85',
                createdAt: '2026-02-01T10:00:00.000Z',
                scoring: {
                  totalScore: {
                    normalizedScore: 12,
                    rawScore: 12,
                  },
                  rawFormData: {},
                },
              },
              {
                title: 'VAS',
                formTemplateId: '67b4e612d0feb4ad99ae2e86',
                createdAt: '2026-02-01T10:00:00.000Z',
                scoring: {
                  totalScore: {
                    normalizedScore: 40,
                    rawScore: 4,
                  },
                  rawFormData: {
                    painScale: 4,
                  },
                },
              },
            ],
          },
        ],
      },
    })
  })

  const mountComponent = async () => {
    const wrapper = mount(StatisticsView, {
      global: {
        plugins: [vuetify],
      },
    })

    await flushPromises()
    await flushPromises()

    return wrapper
  }

  it('inverts MOXFQ and VAS plotted values and exposes raw/normalized values in tooltip', async () => {
    const wrapper = await mountComponent()

    const lineComponent = wrapper.findComponent({ name: 'MockLineChart' })
    expect(lineComponent.exists()).toBe(true)

    const data = lineComponent.props('data') as Record<string, unknown>
    const datasets = (data.datasets as Array<Record<string, unknown>>) || []

    const moxfqDataset = datasets.find(dataset => dataset.label === 'MOXFQ')
    const vasDataset = datasets.find(dataset => dataset.label === 'VAS')

    expect(moxfqDataset).toBeTruthy()
    expect(vasDataset).toBeTruthy()

    const moxfqYValues = ((moxfqDataset?.data as Array<{ y: number | null }>) || []).map(point => point.y)
    const vasYValues = ((vasDataset?.data as Array<{ y: number | null }>) || []).map(point => point.y)

    expect(moxfqYValues).toEqual([55, 88])
    expect(vasYValues).toEqual([20, 60])

    const options = lineComponent.props('options') as Record<string, unknown>
    const tooltipCallbacks = (((options.plugins as Record<string, unknown>).tooltip as Record<string, unknown>).callbacks as Record<string, unknown>)
    const labelCallback = tooltipCallbacks.label as (context: unknown) => string

    const tooltipText = labelCallback({
      dataIndex: 0,
      dataset: {
        label: 'VAS',
        categoryKey: 'vas',
      },
      parsed: {
        y: 20,
      },
    })

    expect(tooltipText).toContain('statistics.tooltipPlotted: 20')
    expect(tooltipText).toContain('statistics.tooltipNormalized: 80')
    expect(tooltipText).toContain('statistics.tooltipRaw: 8')
  })
})
