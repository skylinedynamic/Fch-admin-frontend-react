import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import {
  useBlog,
  useBlogs,
  useCategories,
  useCreateCategory,
  useCreateTag,
  useDeleteBlogs,
  useDeleteCategories,
  useDeleteSeoSettings,
  useDeleteTags,
  usePublicSiteSettings,
  useSaveBlog,
  useSaveSeoSetting,
  useSeoSetting,
  useSeoSettings,
  useSiteSettings,
  useTags,
  useUpdateCategory,
  useUpdateSiteSettings,
  useUpdateTag,
} from '../../../src/modules/cms/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

const CMS = '/admin/cms'
const form = (fields: Record<string, string>) => {
  const data = new FormData()
  Object.entries(fields).forEach(([key, value]) => data.append(key, value))
  return data
}

describe('blog queries', () => {
  it('useBlogs posts the list parameters', async () => {
    const seen = stub('post', `${CMS}/blogs/fetch`, { status: true, data: [{ id: 1, title: 'Post' }], meta: { total: 1 } })

    const { result } = await runQuery(() => useBlogs({ page: 1, search: 'post' } as never))

    expect(seen.bodies[0]).toEqual({ page: 1, search: 'post' })
    expect((result.current.data as any).data).toHaveLength(1)
  })

  it('useBlog stays idle without an id', () => {
    expectIdle(() => useBlog(undefined))
  })

  it('useBlog fetches one post', async () => {
    stub('get', `${CMS}/blogs/9`, { status: true, data: { id: 9, title: 'Post' } })

    const { result } = await runQuery(() => useBlog(9))

    expect(result.current.isSuccess).toBe(true)
  })

  it('useSaveBlog creates when there is no id', async () => {
    const create = stub('post', `${CMS}/blogs`, { status: true, data: { id: 10 } })

    const { invalidated } = await runMutation(() => useSaveBlog(), { id: undefined, data: form({ title: 'New' }) })

    expect(create.calls).toBe(1)
    expect(invalidated).toEqual([['blogs']])
  })

  it('useSaveBlog posts to the post id when editing', async () => {
    const update = stub('post', `${CMS}/blogs/9`, { status: true, data: { id: 9 } })

    const { invalidated } = await runMutation(() => useSaveBlog(), { id: 9, data: form({ title: 'Edited' }) })

    expect(update.calls).toBe(1)
    expect(invalidated).toEqual([['blogs']])
  })

  it('useDeleteBlogs posts the ids in bulk', async () => {
    const seen = stub('post', `${CMS}/blogs-multiple-delete`, { status: true })

    const { invalidated } = await runMutation(() => useDeleteBlogs(), [1, 2])

    expect(seen.bodies[0]).toEqual({ ids: [1, 2] })
    expect(invalidated).toEqual([['blogs']])
  })
})

// Categories and tags are the same contract over two endpoints.
describe.each([
  { kind: 'category', path: 'blog-categories', key: 'blog-categories', useList: useCategories, useCreate: useCreateCategory, useUpdate: useUpdateCategory, useDelete: useDeleteCategories },
  { kind: 'tag', path: 'blog-tags', key: 'blog-tags', useList: useTags, useCreate: useCreateTag, useUpdate: useUpdateTag, useDelete: useDeleteTags },
])('blog $kind hooks', ({ path, key, useList, useCreate, useUpdate, useDelete }) => {
  it('lists', async () => {
    const seen = stub('get', `${CMS}/${path}`, { status: true, data: [{ id: 1, name: 'News' }] })

    const { result } = await runQuery(() => useList())

    expect(seen.calls).toBe(1)
    expect((result.current.data as any).data[0].name).toBe('News')
  })

  it('creates and refreshes the list', async () => {
    const seen = stub('post', `${CMS}/${path}`, { status: true, data: { id: 2 } })

    const { invalidated } = await runMutation(() => useCreate(), { name: 'Guides', slug: 'guides' } as never)

    expect(seen.bodies[0]).toEqual({ name: 'Guides', slug: 'guides' })
    expect(invalidated).toEqual([[key]])
  })

  it('updates by id and refreshes the list', async () => {
    const seen = stub('post', `${CMS}/${path}/2`, { status: true })

    const { invalidated } = await runMutation(() => useUpdate(), { id: 2, data: { name: 'Renamed', slug: 'renamed' } } as never)

    expect(seen.bodies[0]).toEqual({ name: 'Renamed', slug: 'renamed' })
    expect(invalidated).toEqual([[key]])
  })

  it('deletes in bulk and refreshes the list', async () => {
    const seen = stub('post', `${CMS}/${path}-multiple-delete`, { status: true })

    const { invalidated } = await runMutation(() => useDelete(), [2, 3] as never)

    expect(seen.bodies[0]).toEqual({ ids: [2, 3] })
    expect(invalidated).toEqual([[key]])
  })

  it('a rejected create leaves the cache alone', async () => {
    stub('post', `${CMS}/${path}`, { message: 'Invalid', errors: { name: ['The name field is required.'] } }, 422)

    const { invalidated, error } = await runMutation(() => useCreate(), { name: '' } as never)

    expect((error as any).response.data.errors.name).toEqual(['The name field is required.'])
    expect(invalidated).toEqual([])
  })
})

describe('SEO hooks', () => {
  it('useSeoSettings posts the list parameters', async () => {
    const seen = stub('post', `${CMS}/seo-settings`, { status: true, data: [], meta: { total: 0 } })

    await runQuery(() => useSeoSettings({ search: 'home' } as never))

    expect(seen.bodies[0]).toEqual({ search: 'home' })
  })

  it('useSeoSetting stays idle without an id', () => {
    expectIdle(() => useSeoSetting(undefined))
  })

  it('useSeoSetting fetches one page', async () => {
    stub('get', `${CMS}/seo-settings/3`, { status: true, data: { id: 3, page_name: 'Home' } })

    const { result } = await runQuery(() => useSeoSetting(3))

    expect(result.current.isSuccess).toBe(true)
  })

  it('useSaveSeoSetting posts to /store when creating', async () => {
    const store = stub('post', `${CMS}/seo-settings/store`, { status: true })

    const { invalidated } = await runMutation(() => useSaveSeoSetting(), { id: undefined, data: form({ meta_title: 'Home' }) })

    expect(store.calls).toBe(1)
    // The list and the single-page cache both refresh, so reopening the edit
    // page shows what was just saved rather than the cached copy.
    expect(invalidated).toEqual([['seo-settings'], ['seo-setting']])
  })

  it('useSaveSeoSetting posts to the id when editing', async () => {
    const update = stub('post', `${CMS}/seo-settings/3`, { status: true })

    await runMutation(() => useSaveSeoSetting(), { id: 3, data: form({ meta_title: 'Home' }) })

    expect(update.calls).toBe(1)
  })

  it('useDeleteSeoSettings posts the ids in bulk', async () => {
    const seen = stub('post', `${CMS}/seo-settings-multiple-delete`, { status: true })

    const { invalidated } = await runMutation(() => useDeleteSeoSettings(), [3])

    expect(seen.bodies[0]).toEqual({ ids: [3] })
    expect(invalidated).toEqual([['seo-settings']])
  })
})

describe('site settings hooks', () => {
  it('useSiteSettings reads the admin settings', async () => {
    const seen = stub('get', `${CMS}/site-settings`, { status: true, data: { site_name: 'FCF' } })

    const { result } = await runQuery(() => useSiteSettings())

    expect(seen.calls).toBe(1)
    expect((result.current.data as any).data.site_name).toBe('FCF')
  })

  it('useUpdateSiteSettings posts the form and refreshes the admin settings', async () => {
    const seen = stub('post', `${CMS}/site-settings`, { status: true, message: 'saved' })

    const { invalidated } = await runMutation(() => useUpdateSiteSettings(), form({ site_name: 'FCF' }))

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([['admin-site-settings']])
  })

  it('usePublicSiteSettings reads the public website settings', async () => {
    const seen = stub('get', '/website/settings', { status: true, data: { site_name: 'FCF' } })

    await runQuery(() => usePublicSiteSettings())

    expect(seen.calls).toBe(1)
  })
})
