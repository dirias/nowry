/**
 * The two goal accessors, and the 404 that sat between them.
 *
 * `GET /annual-plan/goals` requires `focus_area_id`. Two Home surfaces — the
 * phone's next-steps panel and the web's annual goals card — called getGoals()
 * with no argument, so the query read `focus_area_id=undefined`, the ownership
 * check rejected it, and both surfaces took their error path on every load: the
 * panel never resolved, the card always drew "no goals yet". Both mocked
 * getGoals in their own tests, so nothing caught the URL.
 */

jest.mock('../client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), patch: jest.fn() }
}))
jest.mock('../queryClient', () => ({ queryClient: { invalidateQueries: jest.fn(), fetchQuery: jest.fn() } }))
jest.mock('./user.service', () => ({ userService: { getProfile: jest.fn() } }))
jest.mock('../../platform', () => ({ auth: { getCurrentUserId: jest.fn() } }))

const { apiClient } = require('../client')
const { annualPlanningService } = require('./annualPlanning.service')

describe('getGoals — one focus area', () => {
  beforeEach(() => jest.clearAllMocks())

  it('asks for the goals of the area it was given', async () => {
    apiClient.get.mockResolvedValue({ data: [{ _id: 'goal-1' }] })

    const goals = await annualPlanningService.getGoals('area-1')

    expect(apiClient.get).toHaveBeenCalledWith('/annual-plan/goals?focus_area_id=area-1')
    expect(goals).toEqual([{ _id: 'goal-1' }])
  })

  it.each([undefined, null, ''])('refuses %p instead of requesting "undefined"', async (badId) => {
    await expect(annualPlanningService.getGoals(badId)).rejects.toThrow(/focusAreaId/)
    expect(apiClient.get).not.toHaveBeenCalled()
  })
})

describe('getAllGoals — every goal in a year', () => {
  const full = {
    plan: { _id: 'plan-1' },
    focus_areas: [{ _id: 'area-1' }, { _id: 'area-2' }],
    goals: [
      { _id: 'goal-1', focus_area_id: 'area-1' },
      { _id: 'goal-2', focus_area_id: 'area-2' }
    ],
    activities: [],
    priorities: [],
    quarter_reports: []
  }

  beforeEach(() => jest.clearAllMocks())

  it('returns the goals of every area, through the shared plan read', async () => {
    const spy = jest.spyOn(annualPlanningService, 'getFullAnnualPlan').mockResolvedValue(full)

    const goals = await annualPlanningService.getAllGoals(2026)

    expect(spy).toHaveBeenCalledWith(2026)
    expect(goals.map((g) => g._id)).toEqual(['goal-1', 'goal-2'])
    spy.mockRestore()
  })

  it('defaults to the current year', async () => {
    const spy = jest.spyOn(annualPlanningService, 'getFullAnnualPlan').mockResolvedValue(full)

    await annualPlanningService.getAllGoals()

    expect(spy).toHaveBeenCalledWith(new Date().getFullYear())
    spy.mockRestore()
  })

  it('reads an absent plan as no goals, not as an error', async () => {
    const notFound = Object.assign(new Error('not found'), { response: { status: 404 } })
    const spy = jest.spyOn(annualPlanningService, 'getFullAnnualPlan').mockRejectedValue(notFound)

    await expect(annualPlanningService.getAllGoals(2026)).resolves.toEqual([])
    spy.mockRestore()
  })
})
